const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const logger = require('../config/logger');

const router = express.Router();

// All onboarding routes require authentication
router.use(authenticate);

/**
 * Generate a random temporary password (8 chars, mixed)
 */
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 8; i++) pw += chars[crypto.randomInt(chars.length)];
  return pw;
};

/**
 * Send welcome email to a teacher with credentials
 */
const sendTeacherWelcomeEmail = async (teacher, schoolName, tempPassword) => {
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:560px;margin:0 auto;background:#f0f9ff;padding:32px">
      <div style="text-align:center;margin-bottom:28px">
        <h1 style="color:#2563EB;margin:0 0 4px;font-size:28px">🎓 ElimuAI</h1>
        <p style="color:#94A3B8;font-size:11px;margin:0;letter-spacing:2px;font-weight:700">ELIMU · UJUZI · MAFANIKIO</p>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:48px;margin-bottom:8px">👋</div>
          <h2 style="color:#0f172a;font-size:22px;margin:0 0 4px">Welcome to ElimuAI, ${teacher.name}!</h2>
          <p style="color:#64748b;font-size:14px;margin:0">You've been added as a <strong>Teacher</strong> at <strong>${schoolName}</strong></p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0">
          <p style="color:#334155;font-size:14px;font-weight:600;margin:0 0 12px">Your Login Credentials:</p>
          <table style="width:100%;font-size:14px">
            <tr><td style="padding:6px 0;color:#64748b;width:80px">Email:</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${teacher.email}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Password:</td><td style="padding:6px 0;font-family:monospace;font-weight:700;color:#2563EB;font-size:16px;letter-spacing:1px">${tempPassword}</td></tr>
          </table>
        </div>
        <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:12px;padding:16px;text-align:center;margin:20px 0">
          <p style="color:#fff;margin:0;font-size:13px">🔑 Please change your password after your first login.</p>
        </div>
        <div style="margin-top:20px">
          <p style="color:#334155;font-size:14px;font-weight:600;margin:0 0 8px">Getting Started:</p>
          <ol style="color:#64748b;font-size:13px;padding-left:20px;margin:0">
            <li style="margin-bottom:6px">Log in with the credentials above</li>
            <li style="margin-bottom:6px">Verify your email with the OTP code sent</li>
            <li style="margin-bottom:6px">Add your students to your class</li>
            <li style="margin-bottom:6px">Start using AI-powered tools to enhance learning</li>
          </ol>
        </div>
      </div>
      <p style="color:#cbd5e1;font-size:10px;text-align:center;margin-top:20px">© ${new Date().getFullYear()} ElimuAI — AI-Powered Learning for East Africa</p>
    </div>
  `;
  return sendEmail(teacher.email, `Welcome to ElimuAI — Your Teacher Account at ${schoolName}`, html);
};

/**
 * Send welcome email to a student with credentials
 */
const sendStudentWelcomeEmail = async (student, schoolName, teacherName, tempPassword) => {
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:560px;margin:0 auto;background:#f0fdf4;padding:32px">
      <div style="text-align:center;margin-bottom:28px">
        <h1 style="color:#10B981;margin:0 0 4px;font-size:28px">🎓 ElimuAI</h1>
        <p style="color:#94A3B8;font-size:11px;margin:0;letter-spacing:2px;font-weight:700">ELIMU · UJUZI · MAFANIKIO</p>
      </div>
      <div style="background:#fff;border:1px solid #d1fae5;border-radius:16px;padding:32px">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:48px;margin-bottom:8px">🌟</div>
          <h2 style="color:#0f172a;font-size:22px;margin:0 0 4px">Welcome to ElimuAI, ${student.name}!</h2>
          <p style="color:#64748b;font-size:14px;margin:0">Your teacher <strong>${teacherName}</strong> at <strong>${schoolName}</strong> has created your account</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0">
          <p style="color:#334155;font-size:14px;font-weight:600;margin:0 0 12px">Your Login Credentials:</p>
          <table style="width:100%;font-size:14px">
            <tr><td style="padding:6px 0;color:#64748b;width:80px">Email:</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${student.email}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Password:</td><td style="padding:6px 0;font-family:monospace;font-weight:700;color:#10B981;font-size:16px;letter-spacing:1px">${tempPassword}</td></tr>
          </table>
        </div>
        <div style="background:linear-gradient(135deg,#10B981,#14B8A6);border-radius:12px;padding:16px;text-align:center;margin:20px 0">
          <p style="color:#fff;margin:0;font-size:13px">🔑 Share this with your parent/guardian. Change your password after first login.</p>
        </div>
        <div style="margin-top:20px">
          <p style="color:#334155;font-size:14px;font-weight:600;margin:0 0 8px">What You Can Do:</p>
          <ul style="color:#64748b;font-size:13px;padding-left:20px;margin:0">
            <li style="margin-bottom:6px">🤖 Chat with an AI tutor in any subject</li>
            <li style="margin-bottom:6px">📝 Take practice exams and quizzes</li>
            <li style="margin-bottom:6px">🏆 Earn XP and climb the leaderboard</li>
            <li style="margin-bottom:6px">📊 Track your learning progress</li>
          </ul>
        </div>
      </div>
      <p style="color:#cbd5e1;font-size:10px;text-align:center;margin-top:20px">© ${new Date().getFullYear()} ElimuAI — AI-Powered Learning for East Africa</p>
    </div>
  `;
  return sendEmail(student.email, `Welcome to ElimuAI — Your Student Account`, html);
};


// ══════════════════════════════════════════════════════════════════════════════
// SCHOOL ADMIN → ONBOARD TEACHERS
// ══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/onboarding/teachers ──────────────────────────────────────────
// Admin adds teachers to their school; dispatches welcome emails
router.post('/teachers', requireRole('admin', 'super_admin'), async (req, res) => {
  const { teachers } = req.body; // [{ name, email, phone? }]
  if (!Array.isArray(teachers) || teachers.length === 0) {
    return res.status(400).json({ error: 'Provide an array of teachers with name and email.' });
  }
  if (teachers.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 teachers per batch.' });
  }

  const schoolId = req.user.school_id;
  if (!schoolId) return res.status(400).json({ error: 'No school associated with your account.' });

  // Get school name
  const { rows: schoolRows } = await db.query('SELECT name FROM schools WHERE id = $1', [schoolId]);
  const schoolName = schoolRows[0]?.name || 'Your School';

  const results = { created: [], skipped: [], errors: [] };

  for (const t of teachers) {
    if (!t.name || !t.email) {
      results.errors.push({ email: t.email || 'N/A', reason: 'Name and email are required' });
      continue;
    }
    try {
      // Check if email exists
      const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [t.email]);
      if (existing.length > 0) {
        results.skipped.push({ email: t.email, reason: 'Email already registered' });
        continue;
      }

      const tempPassword = generateTempPassword();
      const hash = await bcrypt.hash(tempPassword, 12);

      const { rows } = await db.query(
        `INSERT INTO users (name, email, phone, password_hash, role, school_id, country, language, is_active, email_verified, onboarded)
         VALUES ($1, $2, $3, $4, 'teacher', $5, $6, 'en', TRUE, FALSE, FALSE)
         RETURNING id, name, email`,
        [t.name, t.email, t.phone || null, hash, schoolId, req.user.country || 'KE']
      );

      // Send welcome email
      const emailSent = await sendTeacherWelcomeEmail(rows[0], schoolName, tempPassword);

      results.created.push({
        id: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
        emailSent,
      });

      logger.info(`Teacher onboarded: ${rows[0].id} by admin ${req.user.id}`);
    } catch (err) {
      logger.error(`Error onboarding teacher ${t.email}:`, err.message);
      results.errors.push({ email: t.email, reason: err.message });
    }
  }

  res.status(201).json({
    message: `${results.created.length} teacher(s) onboarded successfully.`,
    ...results,
  });
});

// ─── GET /api/onboarding/teachers ────────────────────────────────────────────
// Admin lists teachers in their school
router.get('/teachers', requireRole('admin', 'super_admin'), async (req, res) => {
  const schoolId = req.user.school_id;
  if (!schoolId) return res.status(400).json({ error: 'No school associated.' });

  try {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, is_active, email_verified, onboarded, last_login, created_at
       FROM users WHERE school_id = $1 AND role = 'teacher' ORDER BY created_at DESC`,
      [schoolId]
    );
    res.json({ teachers: rows });
  } catch (err) {
    logger.error('List teachers error:', err.message);
    res.status(500).json({ error: 'Failed to load teachers' });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// TEACHER → ONBOARD STUDENTS
// ══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/onboarding/students ──────────────────────────────────────────
// Teacher adds students to their class; dispatches welcome emails
router.post('/students', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const { students, class_id } = req.body; // [{ name, email, grade_level? }]
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Provide an array of students with name and email.' });
  }
  if (students.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 students per batch.' });
  }

  const schoolId = req.user.school_id || null;

  // Get school name (may be null for independent teachers)
  let schoolName = 'ElimuAI';
  if (schoolId) {
    const { rows: schoolRows } = await db.query('SELECT name FROM schools WHERE id = $1', [schoolId]);
    schoolName = schoolRows[0]?.name || 'ElimuAI';
  }
  const teacherName = req.user.name;

  // If class_id provided, verify teacher owns it
  let effectiveClassId = class_id || null;
  if (effectiveClassId) {
    const { rows: classRows } = await db.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2', [effectiveClassId, req.user.id]
    );
    if (!classRows.length && req.user.role === 'teacher') {
      return res.status(403).json({ error: 'You do not own this class.' });
    }
  }

  // For teachers without a class, auto-create a default one so students are queryable
  if (!effectiveClassId && req.user.role === 'teacher') {
    const { rows: existingClasses } = await db.query(
      'SELECT id FROM classes WHERE teacher_id = $1 ORDER BY created_at ASC LIMIT 1', [req.user.id]
    );
    if (existingClasses.length > 0) {
      effectiveClassId = existingClasses[0].id;
    } else {
      const { rows: newClass } = await db.query(
        `INSERT INTO classes (name, teacher_id, school_id) VALUES ($1, $2, $3) RETURNING id`,
        [`${req.user.name}'s Class`, req.user.id, schoolId]
      );
      effectiveClassId = newClass[0].id;
    }
  }

  const results = { created: [], skipped: [], errors: [] };

  for (const s of students) {
    if (!s.name || !s.email) {
      results.errors.push({ email: s.email || 'N/A', reason: 'Name and email are required' });
      continue;
    }
    try {
      const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [s.email]);
      if (existing.length > 0) {
        // Add existing student to class
        if (effectiveClassId) {
          await db.query(
            'INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [effectiveClassId, existing[0].id]
          );
          results.skipped.push({ email: s.email, reason: 'Already registered — added to class' });
        } else {
          results.skipped.push({ email: s.email, reason: 'Email already registered' });
        }
        continue;
      }

      const tempPassword = generateTempPassword();
      const hash = await bcrypt.hash(tempPassword, 12);

      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, role, school_id, country, language, grade_level, is_active, email_verified, onboarded)
         VALUES ($1, $2, $3, 'student', $4, $5, 'en', $6, TRUE, FALSE, FALSE)
         RETURNING id, name, email`,
        [s.name, s.email, hash, schoolId, req.user.country || 'KE', s.grade_level || null]
      );

      // Add to class
      if (effectiveClassId) {
        await db.query(
          'INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [effectiveClassId, rows[0].id]
        );
      }

      // Send welcome email
      const emailSent = await sendStudentWelcomeEmail(rows[0], schoolName, teacherName, tempPassword);

      results.created.push({
        id: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
        emailSent,
      });

      logger.info(`Student onboarded: ${rows[0].id} by teacher ${req.user.id}`);
    } catch (err) {
      logger.error(`Error onboarding student ${s.email}:`, err.message);
      results.errors.push({ email: s.email, reason: err.message });
    }
  }

  res.status(201).json({
    message: `${results.created.length} student(s) onboarded successfully.`,
    ...results,
  });
});

// ─── GET /api/onboarding/students ────────────────────────────────────────────
// Teacher lists students in their class(es)
router.get('/students', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const schoolId = req.user.school_id;

  try {
    let rows;
    if (req.user.role === 'teacher') {
      // Get students in teacher's classes (works regardless of school_id)
      const result = await db.query(
        `SELECT DISTINCT u.id, u.name, u.email, u.phone, u.grade_level, u.is_active, u.email_verified, u.onboarded, u.last_login, u.created_at
         FROM users u
         JOIN class_students cs ON cs.student_id = u.id
         JOIN classes c ON c.id = cs.class_id
         WHERE c.teacher_id = $1 AND u.role = 'student'
         ORDER BY u.created_at DESC`,
        [req.user.id]
      );
      rows = result.rows;
    } else {
      // Admin: all students in the school
      const result = await db.query(
        `SELECT id, name, email, phone, grade_level, is_active, email_verified, onboarded, last_login, created_at
         FROM users WHERE school_id = $1 AND role = 'student' ORDER BY created_at DESC`,
        [schoolId]
      );
      rows = result.rows;
    }
    res.json({ students: rows });
  } catch (err) {
    logger.error('List students error:', err.message);
    res.status(500).json({ error: 'Failed to load students' });
  }
});

// ─── GET /api/onboarding/classes ─────────────────────────────────────────────
// Teacher lists their classes
router.get('/classes', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'teacher') {
      const result = await db.query(
        `SELECT c.id, c.name, c.grade_level,
                (SELECT COUNT(*) FROM class_students WHERE class_id = c.id) AS student_count
         FROM classes c WHERE c.teacher_id = $1 ORDER BY c.name`,
        [req.user.id]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `SELECT c.id, c.name, c.grade_level, u.name AS teacher_name,
                (SELECT COUNT(*) FROM class_students WHERE class_id = c.id) AS student_count
         FROM classes c
         LEFT JOIN users u ON c.teacher_id = u.id
         WHERE c.school_id = $1 ORDER BY c.name`,
        [req.user.school_id]
      );
      rows = result.rows;
    }
    res.json({ classes: rows });
  } catch (err) {
    logger.error('List classes error:', err.message);
    res.status(500).json({ error: 'Failed to load classes' });
  }
});

// ─── POST /api/onboarding/classes ────────────────────────────────────────────
// Teacher creates a new class
router.post('/classes', requireRole('teacher', 'admin', 'super_admin'), async (req, res) => {
  const { name, grade_level } = req.body;
  if (!name) return res.status(400).json({ error: 'Class name is required.' });

  try {
    const teacherId = req.user.role === 'teacher' ? req.user.id : req.body.teacher_id || req.user.id;
    const { rows } = await db.query(
      `INSERT INTO classes (school_id, teacher_id, name, grade_level)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, grade_level`,
      [req.user.school_id, teacherId, name, grade_level || null]
    );
    res.status(201).json({ class: rows[0] });
  } catch (err) {
    logger.error('Create class error:', err.message);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

module.exports = router;
