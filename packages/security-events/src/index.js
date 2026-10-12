'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const TYPES = Object.freeze({
  AUTH_FAILURE: 'auth_failure', AUTH_SUCCESS: 'auth_success',
  ACCESS_DENIED: 'access_denied', BLOCKED_SSRF: 'blocked_ssrf',
  BLOCKED_PATH_TRAVERSAL: 'blocked_path_traversal',
  SUSPICIOUS_SQL_INPUT: 'suspicious_sql_input'
});
function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 1024) throw Error('Password invalid');
  const salt = crypto.randomBytes(16);
  return 'scrypt$' + salt.toString('hex') + '$' + crypto.scryptSync(password, salt, 64).toString('hex');
}
function verifyPassword(password, value) {
  if (typeof password !== 'string' || password.length > 1024 || typeof value !== 'string') return false;
  const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(value);
  if (!match) return false;
  const expected = Buffer.from(match[2], 'hex');
  return crypto.timingSafeEqual(crypto.scryptSync(password, Buffer.from(match[1], 'hex'), 64), expected);
}
function safeDocument(root, name) {
  if (typeof name !== 'string' || !/^[a-zA-Z0-9_-]+\.html$/.test(name)) return null;
  const dir = fs.realpathSync(root);
  const absolute = path.resolve(dir, name);
  if (path.dirname(absolute) !== dir) return null;
  try {
    if (fs.lstatSync(absolute).isSymbolicLink() || !fs.statSync(absolute).isFile()) return null;
  } catch { return null; }
  return absolute;
}
function suspectSqlInput(value) {
  return typeof value === 'string' && /(?:union\s+select|or\s+['"]?\d+['"]?\s*=\s*['"]?\d+|;\s*(?:drop|delete|insert)|--\s*$)/i.test(value);
}
module.exports = { TYPES, hashPassword, verifyPassword, safeDocument, suspectSqlInput };
