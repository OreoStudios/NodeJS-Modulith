'use strict';
const crypto = require('node:crypto');
function ensureCsrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  if (req.method !== 'POST') return next();
  const received = req.body && req.body._csrf;
  const expected = req.session.csrf;
  if (typeof received !== 'string' || received.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    req.securityEvent?.('csrf_rejected', { status_code: 403, message: 'Missing or invalid CSRF token' });
    return res.status(403).send('Invalid request token');
  }
  next();
}
function requireUser(req, res, next) {
  if (Number.isInteger(req.session?.userId)) return next();
  return res.redirect('/login');
}
function requireAdmin(req, res, next) {
  if (req.session?.role === 'admin') return next();
  req.securityEvent?.('access_denied', { status_code:403, message:'Admin role required' });
  return res.status(403).send('Access denied');
}
function sessionUser(req) {
  return { id:req.session.userId, username:req.session.username, role:req.session.role,
    display_name:req.session.display_name, theme:req.session.theme || 'light' };
}
module.exports = { ensureCsrf, requireUser, requireAdmin, sessionUser };
