"""Bulk onboarding: teachers, students, classes."""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import AdminOnly, TeacherOrAbove, current_principal, get_event_bus, get_session, settings
from ..models import ClassRoom, ClassStudent, School, User
from ..onboarding_helpers import gen_temp_password, hash_password
from ..schemas import BulkStudentsIn, BulkTeachersIn, ClassIn, ClassOut, OnboardResult

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


async def _me(sess: AsyncSession, principal) -> User:
    user = (await sess.execute(select(User).where(User.id == uuid.UUID(principal.user_id)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


@router.post("/teachers", response_model=OnboardResult, status_code=status.HTTP_201_CREATED)
async def onboard_teachers(
    body: BulkTeachersIn,
    principal=AdminOnly,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    me = await _me(sess, principal)
    if not me.school_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No school associated with your account.")

    # Enforce cap
    existing = (await sess.execute(
        select(func.count()).select_from(User).where(User.school_id == me.school_id, User.role == "teacher")
    )).scalar_one()
    remaining = settings.max_teachers_per_school - existing
    if remaining <= 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Maximum of {settings.max_teachers_per_school} teachers per school reached.",
        )

    school = (await sess.execute(select(School).where(School.id == me.school_id))).scalar_one_or_none()
    school_name = school.name if school else "Your School"

    result = OnboardResult(message="", created=[], skipped=[], errors=[])
    for t in body.teachers:
        if remaining <= 0:
            result.errors.append({"email": t.email, "reason": "Teacher cap reached"})
            continue
        # Duplicate check
        exists = (await sess.execute(select(User.id).where(User.email == t.email))).scalar_one_or_none()
        if exists:
            result.skipped.append({"email": t.email, "reason": "Email already registered"})
            continue
        temp = gen_temp_password()
        try:
            user = User(
                name=t.name, email=t.email, phone=t.phone,
                password_hash=hash_password(temp),
                role="teacher", school_id=me.school_id,
                country=me.country, language="en",
            )
            sess.add(user)
            await sess.flush()
            remaining -= 1

            # Auto-create a class if class_name provided so the teacher can immediately
            # onboard students to their class.
            class_id: str | None = None
            if t.class_name:
                cls = ClassRoom(
                    school_id=me.school_id,
                    teacher_id=user.id,
                    name=t.class_name,
                    grade_level=t.grade_level,
                    subject=t.subject,
                )
                sess.add(cls)
                await sess.flush()
                class_id = str(cls.id)

            result.created.append({
                "id": str(user.id), "name": user.name, "email": user.email, "temp_password": temp,
                "subject": t.subject, "class_name": t.class_name, "class_id": class_id,
            })
            await bus.publish("user.onboarded", {
                "user_id": str(user.id),
                "email": user.email,
                "role": "teacher",
                "school_name": school_name,
                "temp_password": temp,
                "invited_by": str(me.id),
            })
            log.info("teacher_onboarded", teacher_id=str(user.id), by=str(me.id), class_id=class_id)
        except IntegrityError:
            await sess.rollback()
            result.errors.append({"email": t.email, "reason": "Insert failed"})

    await sess.commit()
    result.message = f"{len(result.created)} teacher(s) onboarded successfully."
    return result


@router.get("/teachers")
async def list_teachers(
    principal=AdminOnly,
    sess: AsyncSession = Depends(get_session),
):
    me = await _me(sess, principal)
    # super_admin: platform-wide view; admin: scoped to their school
    if me.role == "super_admin":
        where_clause = "u.role = 'teacher'"
        params: dict = {}
    else:
        if not me.school_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No school associated.")
        where_clause = "u.school_id = :sid AND u.role = 'teacher'"
        params = {"sid": me.school_id}
    rows = (await sess.execute(
        text(
            f"""
            SELECT u.id, u.name, u.email, u.phone, u.is_active, u.email_verified, u.onboarded,
                   u.last_login, u.created_at,
                   c.id   AS class_id,
                   c.name AS class_name,
                   c.grade_level AS class_grade,
                   c.subject AS subject,
                   (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS student_count
            FROM users u
            LEFT JOIN LATERAL (
              SELECT id, name, grade_level, subject FROM classes
              WHERE teacher_id = u.id ORDER BY created_at ASC LIMIT 1
            ) c ON TRUE
            WHERE {where_clause}
            ORDER BY u.created_at DESC
            """
        ),
        params,
    )).mappings().all()
    return {"teachers": [dict(r) for r in rows]}


async def _get_scoped_teacher(sess: AsyncSession, admin: User, teacher_id: uuid.UUID) -> User:
    """Fetch a teacher that belongs to the admin's school, else 404.

    Super-admin bypasses the school filter and can act on any teacher.
    """
    if admin.role == "super_admin":
        t = (await sess.execute(
            select(User).where(User.id == teacher_id, User.role == "teacher")
        )).scalar_one_or_none()
        if not t:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Teacher not found.")
        return t
    if not admin.school_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No school associated.")
    t = (await sess.execute(
        select(User).where(
            User.id == teacher_id,
            User.school_id == admin.school_id,
            User.role == "teacher",
        )
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Teacher not found in your school.")
    return t


@router.patch("/teachers/{teacher_id}/toggle-active")
async def toggle_teacher_active(
    teacher_id: uuid.UUID,
    principal=AdminOnly,
    sess: AsyncSession = Depends(get_session),
):
    me = await _me(sess, principal)
    teacher = await _get_scoped_teacher(sess, me, teacher_id)
    teacher.is_active = not teacher.is_active
    await sess.commit()
    log.info("teacher.toggle_active", teacher_id=str(teacher.id), is_active=teacher.is_active, by=str(me.id))
    return {"id": str(teacher.id), "is_active": teacher.is_active}


@router.post("/teachers/{teacher_id}/resend-invite")
async def resend_teacher_invite(
    teacher_id: uuid.UUID,
    principal=AdminOnly,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    me = await _me(sess, principal)
    teacher = await _get_scoped_teacher(sess, me, teacher_id)
    school = (await sess.execute(select(School).where(School.id == me.school_id))).scalar_one_or_none()
    temp = gen_temp_password()
    teacher.password_hash = hash_password(temp)
    await sess.commit()
    await bus.publish("user.onboarded", {
        "user_id": str(teacher.id),
        "email": teacher.email,
        "role": "teacher",
        "school_name": school.name if school else "Your School",
        "temp_password": temp,
        "invited_by": str(me.id),
        "resent": True,
    })
    log.info("teacher.invite_resent", teacher_id=str(teacher.id), by=str(me.id))
    return {"id": str(teacher.id), "message": "Invite email resent with new temporary password."}


@router.post("/students", response_model=OnboardResult, status_code=status.HTTP_201_CREATED)
async def onboard_students(
    body: BulkStudentsIn,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    me = await _me(sess, principal)
    school_name = "ElimuAI"
    if me.school_id:
        school = (await sess.execute(select(School).where(School.id == me.school_id))).scalar_one_or_none()
        school_name = school.name if school else school_name

    # Resolve target class
    effective_class_id: uuid.UUID | None = body.class_id
    if effective_class_id:
        owns = (await sess.execute(
            select(ClassRoom.id).where(ClassRoom.id == effective_class_id, ClassRoom.teacher_id == me.id)
        )).scalar_one_or_none()
        if not owns and me.role == "teacher":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not own this class.")

    if not effective_class_id and me.role == "teacher":
        existing_class = (await sess.execute(
            select(ClassRoom).where(ClassRoom.teacher_id == me.id).order_by(ClassRoom.created_at.asc()).limit(1)
        )).scalar_one_or_none()
        if existing_class:
            effective_class_id = existing_class.id
        else:
            new_cls = ClassRoom(name=f"{me.name}'s Class", teacher_id=me.id, school_id=me.school_id)
            sess.add(new_cls)
            await sess.flush()
            effective_class_id = new_cls.id

    result = OnboardResult(message="", created=[], skipped=[], errors=[])
    for s in body.students:
        existing = (await sess.execute(select(User.id).where(User.email == s.email))).scalar_one_or_none()
        if existing:
            if effective_class_id:
                await sess.execute(
                    text(
                        "INSERT INTO class_students (class_id, student_id) VALUES (:cid, :sid) "
                        "ON CONFLICT DO NOTHING"
                    ),
                    {"cid": effective_class_id, "sid": existing},
                )
                result.skipped.append({"email": s.email, "reason": "Already registered — added to class"})
            else:
                result.skipped.append({"email": s.email, "reason": "Email already registered"})
            continue
        temp = gen_temp_password()
        try:
            student = User(
                name=s.name, email=s.email,
                password_hash=hash_password(temp),
                role="student", school_id=me.school_id,
                country=me.country, language="en",
                grade_level=s.grade_level,
            )
            sess.add(student)
            await sess.flush()
            if effective_class_id:
                sess.add(ClassStudent(class_id=effective_class_id, student_id=student.id))
            result.created.append({
                "id": str(student.id), "name": student.name, "email": student.email, "temp_password": temp,
            })
            await bus.publish("user.onboarded", {
                "user_id": str(student.id),
                "email": student.email,
                "role": "student",
                "school_name": school_name,
                "teacher_name": me.name,
                "temp_password": temp,
                "invited_by": str(me.id),
            })
        except IntegrityError:
            await sess.rollback()
            result.errors.append({"email": s.email, "reason": "Insert failed"})

    await sess.commit()
    result.message = f"{len(result.created)} student(s) onboarded successfully."
    return result


@router.get("/students")
async def list_students(
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    me = await _me(sess, principal)
    if me.role == "teacher":
        rows = (await sess.execute(
            text(
                """
                SELECT DISTINCT u.id, u.name, u.email, u.phone, u.grade_level,
                       u.is_active, u.email_verified, u.onboarded, u.last_login, u.created_at,
                       u.total_xp, u.streak_days
                FROM users u
                JOIN class_students cs ON cs.student_id = u.id
                JOIN classes c ON c.id = cs.class_id
                WHERE c.teacher_id = :tid AND u.role = 'student'
                ORDER BY u.total_xp DESC, u.created_at DESC
                """
            ),
            {"tid": me.id},
        )).mappings().all()
    elif me.role == "super_admin":
        rows = (await sess.execute(
            text(
                """
                SELECT id, name, email, phone, grade_level,
                       is_active, email_verified, onboarded, last_login, created_at,
                       total_xp, streak_days
                FROM users WHERE role = 'student' ORDER BY total_xp DESC, created_at DESC
                """
            ),
        )).mappings().all()
    else:
        if not me.school_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No school associated.")
        rows = (await sess.execute(
            text(
                """
                SELECT id, name, email, phone, grade_level,
                       is_active, email_verified, onboarded, last_login, created_at,
                       total_xp, streak_days
                FROM users WHERE school_id = :sid AND role = 'student' ORDER BY total_xp DESC, created_at DESC
                """
            ),
            {"sid": me.school_id},
        )).mappings().all()
    return {"students": [dict(r) for r in rows]}


async def _get_scoped_student(sess: AsyncSession, actor: User, student_id: uuid.UUID) -> User:
    """Fetch a student the current actor is allowed to manage.

    Teacher → student must belong to one of the teacher's classes (via class_students).
    Admin / super_admin → student must belong to the actor's school.
    """
    if actor.role == "teacher":
        row = (await sess.execute(
            text(
                """
                SELECT u.* FROM users u
                JOIN class_students cs ON cs.student_id = u.id
                JOIN classes c ON c.id = cs.class_id
                WHERE u.id = :sid AND u.role = 'student' AND c.teacher_id = :tid
                LIMIT 1
                """
            ),
            {"sid": student_id, "tid": actor.id},
        )).mappings().first()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found in your classes.")
        return await sess.get(User, student_id)  # type: ignore[return-value]

    if actor.role == "super_admin":
        student = (await sess.execute(
            select(User).where(User.id == student_id, User.role == "student")
        )).scalar_one_or_none()
        if not student:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")
        return student
    if not actor.school_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No school associated.")
    student = (await sess.execute(
        select(User).where(
            User.id == student_id,
            User.school_id == actor.school_id,
            User.role == "student",
        )
    )).scalar_one_or_none()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found in your school.")
    return student


@router.get("/students/{student_id}")
async def student_detail(
    student_id: uuid.UUID,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    me = await _me(sess, principal)
    student = await _get_scoped_student(sess, me, student_id)
    # Basic profile + latest activity
    activity = (await sess.execute(
        text(
            """
            SELECT activity_type, score, duration_mins, xp_earned, logged_date, created_at
            FROM progress_logs WHERE user_id = :id ORDER BY created_at DESC LIMIT 20
            """
        ),
        {"id": student.id},
    )).mappings().all()
    classes = (await sess.execute(
        text(
            """
            SELECT c.id, c.name, c.grade_level, c.subject, u.name AS teacher_name
            FROM class_students cs
            JOIN classes c ON c.id = cs.class_id
            LEFT JOIN users u ON u.id = c.teacher_id
            WHERE cs.student_id = :id
            """
        ),
        {"id": student.id},
    )).mappings().all()
    return {
        "student": {
            "id": str(student.id),
            "name": student.name,
            "email": student.email,
            "phone": student.phone,
            "grade_level": student.grade_level,
            "curriculum": student.curriculum,
            "country": student.country,
            "language": student.language,
            "total_xp": getattr(student, "total_xp", 0),
            "streak_days": getattr(student, "streak_days", 0),
            "is_active": student.is_active,
            "email_verified": student.email_verified,
            "onboarded": student.onboarded,
            "last_login": getattr(student, "last_login", None),
            "created_at": student.created_at,
        },
        "activity": [dict(r) for r in activity],
        "classes": [dict(r) for r in classes],
    }


@router.patch("/students/{student_id}/toggle-active")
async def toggle_student_active(
    student_id: uuid.UUID,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    me = await _me(sess, principal)
    student = await _get_scoped_student(sess, me, student_id)
    student.is_active = not student.is_active
    await sess.commit()
    log.info("student.toggle_active", student_id=str(student.id), is_active=student.is_active, by=str(me.id))
    return {"id": str(student.id), "is_active": student.is_active}


@router.post("/students/{student_id}/resend-invite")
async def resend_student_invite(
    student_id: uuid.UUID,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
    bus=Depends(get_event_bus),
):
    me = await _me(sess, principal)
    student = await _get_scoped_student(sess, me, student_id)
    if not student.email:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This student has no email on file — cannot send a welcome email.",
        )
    school = (await sess.execute(select(School).where(School.id == me.school_id))).scalar_one_or_none()
    temp = gen_temp_password()
    student.password_hash = hash_password(temp)
    await sess.commit()
    await bus.publish("user.onboarded", {
        "user_id": str(student.id),
        "email": student.email,
        "name": student.name,
        "role": "student",
        "school_name": school.name if school else "Your School",
        "teacher_name": me.name,
        "temp_password": temp,
        "invited_by": str(me.id),
        "resent": True,
    })
    log.info(
        "student.invite_resent",
        student_id=str(student.id),
        email=student.email,
        by=str(me.id),
    )
    return {
        "id": str(student.id),
        "email": student.email,
        "message": f"Welcome email resent to {student.email} with a new temporary password.",
    }


@router.post("/students/{student_id}/reset-password")
async def reset_student_password(
    student_id: uuid.UUID,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    """Reset password to a fresh temp value and return it inline (no email).

    Use when the admin/teacher wants to hand the credentials to the student directly.
    """
    me = await _me(sess, principal)
    student = await _get_scoped_student(sess, me, student_id)
    temp = gen_temp_password()
    student.password_hash = hash_password(temp)
    await sess.commit()
    log.info("student.password_reset", student_id=str(student.id), by=str(me.id))
    return {"id": str(student.id), "temp_password": temp, "message": "Password reset."}


@router.post("/students/{student_id}/verify")
async def verify_student(
    student_id: uuid.UUID,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    """Manually mark the student's email as verified (skip OTP)."""
    me = await _me(sess, principal)
    student = await _get_scoped_student(sess, me, student_id)
    student.email_verified = True
    await sess.commit()
    log.info("student.verified", student_id=str(student.id), by=str(me.id))
    return {"id": str(student.id), "email_verified": True, "message": "Account verified."}


@router.get("/classes")
async def list_classes(
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    me = await _me(sess, principal)
    if me.role == "teacher":
        rows = (await sess.execute(
            text(
                """
                SELECT c.id, c.name, c.grade_level, c.subject,
                  (SELECT COUNT(*) FROM class_students WHERE class_id = c.id) AS student_count
                FROM classes c WHERE c.teacher_id = :tid ORDER BY c.name
                """
            ),
            {"tid": me.id},
        )).mappings().all()
    else:
        rows = (await sess.execute(
            text(
                """
                SELECT c.id, c.name, c.grade_level, c.subject, u.name AS teacher_name,
                  (SELECT COUNT(*) FROM class_students WHERE class_id = c.id) AS student_count
                FROM classes c LEFT JOIN users u ON c.teacher_id = u.id
                WHERE c.school_id = :sid ORDER BY c.name
                """
            ),
            {"sid": me.school_id},
        )).mappings().all()
    return {"classes": [dict(r) for r in rows]}


@router.post("/classes", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
async def create_class(
    body: ClassIn,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    me = await _me(sess, principal)
    teacher_id = me.id if me.role == "teacher" else (body.teacher_id or me.id)
    cls = ClassRoom(
        school_id=me.school_id,
        teacher_id=teacher_id,
        name=body.name,
        grade_level=body.grade_level,
        subject=body.subject,
    )
    sess.add(cls)
    await sess.commit()
    return ClassOut(id=cls.id, name=cls.name, grade_level=cls.grade_level, subject=cls.subject, student_count=0)
