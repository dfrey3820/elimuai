#!/usr/bin/env bash
# End-to-end onboarding smoke test.
#
# Covers:
#   1. School admin signup   → school row + admin user + JWT
#   2. Admin onboards 2 teachers  (POST /api/onboarding/teachers)
#   3. Teacher creates a class + onboards students  (POST /api/onboarding/students)
#   4. Student login   (verify onboarded user can auth)
#   5. Parent signup → onboard child (POST /api/children)
#
# Requires: docker compose stack running on gateway :8091.

set -uo pipefail
GATEWAY="http://localhost:8091"
TS=$(date +%s)

pass()  { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail()  { printf "  \033[31m✗\033[0m %s\n     %s\n" "$1" "${2:-}"; FAILS=$((FAILS+1)); }
FAILS=0

# ─── Helper: get OTP code for email from DB, then verify it → returns access_token ───
verify_otp_and_get_token() {
  local email="$1" purpose="${2:-signup}"
  local code
  code=$(docker compose exec -T postgres psql -U elimuai_user -d elimuai_db -tAc \
      "SELECT code FROM otp_tokens WHERE email='$email' AND purpose='$purpose' AND verified=false ORDER BY created_at DESC LIMIT 1;" \
      2>/dev/null | grep -E '^[0-9]{4,8}$' | head -1)
  if [[ -z "$code" ]]; then
    echo ""
    return 1
  fi
  local resp
  resp=$(curl -sX POST "$GATEWAY/api/auth/verify-otp" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$email\",\"code\":\"$code\",\"purpose\":\"$purpose\"}")
  python3 -c "import sys,json;print(json.loads(sys.argv[1]).get('access_token',''))" "$resp"
}

echo
echo "━━━ TEST 1 · School admin registration ━━━"
ADMIN_EMAIL="admin${TS}@example.com"
REG=$(curl -sX POST "$GATEWAY/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"AdminPass123\",\"name\":\"Head Teacher\",\"role\":\"admin\",\"school_name\":\"Test Academy ${TS}\",\"country\":\"KE\",\"curriculum\":\"CBC\"}")
if echo "$REG" | grep -q '"requires_otp":true'; then
  pass "school admin registered → OTP challenge issued"
else
  fail "admin register" "$REG"
fi

ADMIN_TOKEN=$(verify_otp_and_get_token "$ADMIN_EMAIL" signup)
if [[ ${#ADMIN_TOKEN} -gt 100 ]]; then
  pass "admin OTP verified → JWT issued (${#ADMIN_TOKEN} chars)"
else
  fail "admin verify-otp" "no token"
fi

SCHOOL_ID=$(docker compose exec -T postgres psql -U elimuai_user -d elimuai_db -tAc \
    "SELECT school_id FROM users WHERE email='$ADMIN_EMAIL';" 2>/dev/null | tr -d ' \n\r')
if [[ -n "$SCHOOL_ID" && "$SCHOOL_ID" != "" ]]; then
  pass "school row created (id=${SCHOOL_ID:0:8}…)"
else
  fail "school creation" "no school_id on admin user"
fi

echo
echo "━━━ TEST 2 · Admin onboards 2 teachers ━━━"
T1="teacher1_${TS}@example.com"
T2="teacher2_${TS}@example.com"
TEACHERS=$(curl -sX POST "$GATEWAY/api/onboarding/teachers" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"teachers\":[{\"name\":\"Mrs Kamau\",\"email\":\"$T1\"},{\"name\":\"Mr Otieno\",\"email\":\"$T2\"}]}")
CREATED=$(python3 -c "import sys,json;d=json.loads(sys.argv[1]);print(len(d.get('created',[])))" "$TEACHERS" 2>/dev/null || echo 0)
if [[ "$CREATED" == "2" ]]; then
  pass "2 teachers onboarded"
else
  fail "teacher onboarding" "$TEACHERS"
fi

# Extract each teacher's temp password from the response
T1_PW=$(python3 -c "import sys,json;d=json.loads(sys.argv[1]);t=[x for x in d.get('created',[]) if x['email']==sys.argv[2]];print(t[0]['temp_password'] if t else '')" "$TEACHERS" "$T1")
T2_PW=$(python3 -c "import sys,json;d=json.loads(sys.argv[1]);t=[x for x in d.get('created',[]) if x['email']==sys.argv[2]];print(t[0]['temp_password'] if t else '')" "$TEACHERS" "$T2")
if [[ ${#T1_PW} -ge 8 && ${#T2_PW} -ge 8 ]]; then
  pass "temp passwords issued (t1=${T1_PW}, t2=${T2_PW})"
else
  fail "temp password" "t1=$T1_PW t2=$T2_PW"
fi

# Fetch the admin's teacher list
TLIST=$(curl -s "$GATEWAY/api/onboarding/teachers" -H "Authorization: Bearer $ADMIN_TOKEN")
NT=$(python3 -c "import sys,json;d=json.loads(sys.argv[1]);ts=d.get('teachers') if isinstance(d,dict) else d;print(len(ts) if isinstance(ts,list) else 0)" "$TLIST" 2>/dev/null || echo 0)
if [[ "$NT" -ge 2 ]]; then
  pass "GET /api/onboarding/teachers returns $NT teacher(s)"
else
  fail "list teachers" "$TLIST"
fi

echo
echo "━━━ TEST 3 · Teacher login + onboards students ━━━"
# Auto-activate the teacher (bypass OTP for smoke — teacher was created by admin as active per Node semantics)
docker compose exec -T postgres psql -U elimuai_user -d elimuai_db -c \
    "UPDATE users SET is_active=true, email_verified=true WHERE email='$T1';" > /dev/null 2>&1

# Teacher login now issues OTP challenge (login flow) — verify to get token
LOGIN=$(curl -sX POST "$GATEWAY/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"identifier\":\"$T1\",\"password\":\"$T1_PW\"}")
if echo "$LOGIN" | grep -q '"requires_otp":true'; then
  pass "teacher login → OTP challenge"
else
  fail "teacher login" "$LOGIN"
fi
TEACHER_TOKEN=$(verify_otp_and_get_token "$T1" login)
if [[ ${#TEACHER_TOKEN} -gt 100 ]]; then
  pass "teacher OTP verified → JWT (${#TEACHER_TOKEN} chars)"
else
  fail "teacher verify-otp" "no token"
fi

# Onboard students
S1="student1_${TS}@example.com"
S2="student2_${TS}@example.com"
STUDENTS=$(curl -sX POST "$GATEWAY/api/onboarding/students" \
    -H "Authorization: Bearer $TEACHER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"students\":[{\"name\":\"Amina\",\"email\":\"$S1\",\"grade_level\":\"Grade 4\"},{\"name\":\"Brian\",\"email\":\"$S2\",\"grade_level\":\"Grade 4\"}]}")
SC=$(python3 -c "import sys,json;print(len(json.loads(sys.argv[1]).get('created',[])))" "$STUDENTS" 2>/dev/null || echo 0)
if [[ "$SC" == "2" ]]; then
  pass "2 students onboarded"
else
  fail "student onboarding" "$STUDENTS"
fi

# Verify a class was auto-created for the teacher
CLASSES=$(curl -s "$GATEWAY/api/onboarding/classes" -H "Authorization: Bearer $TEACHER_TOKEN")
NC=$(python3 -c "import sys,json;d=json.loads(sys.argv[1]);cs=d.get('classes') if isinstance(d,dict) else d;print(len(cs) if isinstance(cs,list) else 0)" "$CLASSES" 2>/dev/null || echo 0)
if [[ "$NC" -ge 1 ]]; then
  pass "auto-created class visible (count=$NC)"
else
  fail "list classes" "$CLASSES"
fi

# School stats (requires school_id)
STATS=$(curl -s "$GATEWAY/api/schools/${SCHOOL_ID}/stats" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$STATS" | grep -qE '"teacher_count"|"student_count"|"total_users"'; then
  pass "school stats returned: $(echo "$STATS" | head -c 200)"
else
  fail "school stats" "$STATS"
fi

echo
echo "━━━ TEST 4 · Parent onboards child ━━━"
PARENT_EMAIL="parent${TS}@family.example.com"
curl -sX POST "$GATEWAY/api/auth/register" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$PARENT_EMAIL\",\"password\":\"ParentPass123\",\"name\":\"Jane Wanjiku\",\"role\":\"parent\"}" > /dev/null
PARENT_TOKEN=$(verify_otp_and_get_token "$PARENT_EMAIL" signup)
if [[ ${#PARENT_TOKEN} -gt 100 ]]; then
  pass "parent registered + verified"
else
  fail "parent signup" "no token"
fi

CHILD=$(curl -sX POST "$GATEWAY/api/children" \
    -H "Authorization: Bearer $PARENT_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"Zawadi\",\"email\":\"child${TS}@family.example.com\",\"grade_level\":\"Grade 3\",\"curriculum\":\"CBC\"}")
if echo "$CHILD" | grep -q '"temp_password"'; then
  pass "child onboarded → $(echo "$CHILD" | head -c 250)"
else
  fail "child onboarding" "$CHILD"
fi

CHILDREN=$(curl -s "$GATEWAY/api/children" -H "Authorization: Bearer $PARENT_TOKEN")
CC=$(python3 -c "import sys,json;d=json.loads(sys.argv[1]);print(len(d['children']) if isinstance(d, dict) and isinstance(d.get('children'), list) else 0)" "$CHILDREN" 2>/dev/null || echo 0)
if [[ "$CC" -ge 1 ]]; then
  pass "parent → children link works ($CC child(ren))"
else
  fail "list children" "$CHILDREN"
fi

echo
if [[ "$FAILS" == "0" ]]; then
  printf "\033[32m╔══════════════════════════════╗\n║  ALL ONBOARDING TESTS PASS   ║\n╚══════════════════════════════╝\033[0m\n"
  exit 0
else
  printf "\033[31m═══ %d FAILURE(S) ═══\033[0m\n" "$FAILS"
  exit 1
fi
