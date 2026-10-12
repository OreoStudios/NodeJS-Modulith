'use strict';
const crypto = require('node:crypto');
function runMigrations(db, migrations) {
  if (!db || typeof db.exec !== 'function' || typeof db.prepare !== 'function' || typeof db.transaction !== 'function') throw TypeError('SQLite database with transaction required');
  if (!Array.isArray(migrations)) throw TypeError('Migrations must be an array');
  db.exec('CREATE TABLE IF NOT EXISTS "_ojs_migrations" ("id" TEXT PRIMARY KEY, "checksum" TEXT NOT NULL, "applied_at" TEXT NOT NULL)');
  const ids = new Set();
  let applied = 0;
  for (const migration of migrations) {
    if (!migration || !/^[a-zA-Z0-9_-]+$/.test(migration.id) || typeof migration.up !== 'function') throw Error('Invalid migration');
    if (ids.has(migration.id)) throw Error('Duplicate migration: ' + migration.id);
    ids.add(migration.id);
    // Explicit version string is required because hashing executable JS is not a reliable migration fingerprint.
    if (typeof migration.version !== 'string' || !migration.version) throw Error('Migration version required');
    const checksum = crypto.createHash('sha256').update(migration.id + ':' + migration.version).digest('hex');
    const existing = db.prepare('SELECT checksum FROM "_ojs_migrations" WHERE id = ?').get(migration.id);
    if (existing) { if (existing.checksum !== checksum) throw Error('Modified applied migration: '+ migration.id); continue; }
    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO "_ojs_migrations" (id, checksum, applied_at) VALUES (?, ?, ?)').run(migration.id,checksum,new Date().toISOString());
    })();
    applied++;
  }
  return applied;
}
module.exports = { runMigrations };
