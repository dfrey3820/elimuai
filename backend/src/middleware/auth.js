const jwt = require('jsonwebtoken');
const db  = require('../config/database');
const logger = require('../config/logger');

// ─── Role hierarchy (higher index = more privileges) ─────────────────────────
const ROLE_HIERARCHY = {
  student:     0,
  parent:      1,
  teacher:     2,
  admin:       3,
  super_admin: 4,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.split(' ')[1];
  // Also accept token from query param (for PDF downloads etc.)
  if (req.query.token) return req.query.token;
  return null;
};

const decodeAndFetchUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const { rows } = await db.query(
    `SELECT id, name, email, phone, role, plan, plan_expires, country,
            language, school_id, grade_level, curriculum, total_xp, streak_days
       FROM users WHERE id = $1 AND is_active = TRUE`,
    [decoded.userId]
  );
  return { decoded, user: rows[0] || null };
};

// ─── Core authenticate — verifies JWT + active session ───────────────────────
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { decoded, user } = await decodeAndFetchUser(token);
    if (!user) return res.status(401).json({ error: 'User not found or inactive' });

    // If token has a session ID (jti), validate session is active
    if (decoded.jti) {
      const { rows: sess } = await db.query(
        'SELECT id FROM user_sessions WHERE token_jti = $1 AND is_revoked = FALSE AND expires_at > NOW()',
        [decoded.jti]
      );
      if (!sess[0]) {
        return res.status(401).json({ error: 'Session expired or revoked' });
      }
      // Touch last_active (fire-and-forget, don't block the request)
      db.query('UPDATE user_sessions SET last_active = NOW() WHERE token_jti = $1', [decoded.jti]).catch(() => {});
      req.sessionId = sess[0].id;
      req.tokenJti  = decoded.jti;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── Optional auth — attaches user if token present, continues either way ────
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const { decoded, user } = await decodeAndFetchUser(token);
      if (user) {
        req.user = user;
        if (decoded.jti) req.tokenJti = decoded.jti;
      }
    }
  } catch (_) {}
  next();
};

// ─── Role guard — accepts explicit roles or minimum role level ───────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
  }
  next();
};

// ─── Minimum role — uses hierarchy (e.g. requireMinRole('teacher') lets admin/super_admin through) ─
const requireMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
  const minLevel  = ROLE_HIERARCHY[minRole] ?? 99;
  if (userLevel < minLevel) {
    return res.status(403).json({ error: `Access denied. Minimum role: ${minRole}` });
  }
  next();
};

// ─── School scoping — ensures user can only access their own school data ─────
const requireSchool = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  // super_admin can access any school
  if (req.user.role === 'super_admin') return next();
  if (!req.user.school_id) {
    return res.status(403).json({ error: 'No school assigned to your account' });
  }
  // If route has a :schoolId param, verify it matches
  const paramSchoolId = req.params.schoolId || req.params.id;
  if (paramSchoolId && paramSchoolId !== req.user.school_id) {
    return res.status(403).json({ error: 'Access denied to this school' });
  }
  next();
};

// ─── Plan guard — checks if user has required plan ───────────────────────────
const requirePlan = (...plans) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const planOrder = ['free', 'student', 'family', 'school', 'enterprise'];
  const minPlanIndex = Math.min(...plans.map(p => planOrder.indexOf(p)));
  const userPlanIndex = planOrder.indexOf(req.user.plan);
  const planExpired = req.user.plan_expires && new Date(req.user.plan_expires) < new Date();
  if (planExpired || userPlanIndex < minPlanIndex) {
    return res.status(402).json({
      error: 'Plan upgrade required',
      required_plan: plans[0],
      current_plan: req.user.plan,
      upgrade_url: '/plans',
    });
  }
  next();
};

// ─── Active session required — rejects requests without a tracked session ────
const requireSession = (req, res, next) => {
  if (!req.tokenJti || !req.sessionId) {
    return res.status(401).json({ error: 'Active session required. Please log in again.' });
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireMinRole,
  requireSchool,
  requirePlan,
  requireSession,
  ROLE_HIERARCHY,
};
