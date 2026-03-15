const jwt = require('jsonwebtoken');
const db  = require('../config/database');

// Verify JWT and attach user to req
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, name, email, phone, role, plan, plan_expires, country, language, school_id, grade_level, curriculum, total_xp, streak_days FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Optional auth — attaches user if token present, continues either way
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await db.query('SELECT id, role, plan, country, language, school_id FROM users WHERE id = $1', [decoded.userId]);
      if (rows[0]) req.user = rows[0];
    }
  } catch (_) {}
  next();
};

// Role guard
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
  }
  next();
};

// Plan guard — checks if user has required plan
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

module.exports = { authenticate, optionalAuth, requireRole, requirePlan };
