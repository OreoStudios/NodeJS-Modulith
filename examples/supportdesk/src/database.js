'use strict';
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { OjsORM, model } = require('@ojs/orm');
const { hashPassword } = require('@ojs/security-events');

function initializeDatabase(filename = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'supportdesk.db')) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  const orm = new OjsORM(db);
  orm.migrate([{
    id: '001-initial', version: '2026-10-12-v1',
    up(database) {
      database.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', display_name TEXT, theme TEXT DEFAULT 'light');");
      database.exec("CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'open', priority TEXT NOT NULL DEFAULT 'medium', created_by INTEGER NOT NULL REFERENCES users(id), assigned_to INTEGER REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);");
      database.exec("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL REFERENCES tickets(id), author_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TEXT NOT NULL);");
      database.exec("CREATE INDEX IF NOT EXISTS idx_tickets_creator ON tickets (created_by); CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments (ticket_id);");
    }
  }]);
  const users = orm.repository(model('users', ['id','username','email','password','role','display_name','theme']));
  const tickets = orm.repository(model('tickets', ['id','title','description','status','priority','created_by','assigned_to','created_at','updated_at']));
  const comments = orm.repository(model('comments', ['id','ticket_id','author_id','content','created_at']));
  // Demo data is restricted to local educational deployments; never use these
  // credentials in a real deployment.
  if (process.env.DEMO_SEED !== '0' && users.list({}, {limit:1}).length === 0) {
    orm.transaction(() => {
      users.create({username:'admin',email:'admin@supportdesk.local',password:hashPassword('Admin_123'),role:'admin',display_name:'Administrator',theme:'light'});
      users.create({username:'jdupont',email:'jdupont@supportdesk.local',password:hashPassword('User_1234'),role:'user',display_name:'Jean Dupont',theme:'light'});
      users.create({username:'mmartin',email:'mmartin@supportdesk.local',password:hashPassword('User_1234'),role:'user',display_name:'Marie Martin',theme:'light'});
      users.create({username:'helpdesk',email:'helpdesk@supportdesk.local',password:hashPassword('Help_1234'),role:'admin',display_name:'Helpdesk',theme:'light'});
      const now = new Date().toISOString();
      const seed = [
        {title:'VPN connection fails',description:'VPN refuses to connect after update',status:'open',priority:'high',created_by:2,assigned_to:1},
        {title:'Printer in office 3 offline',description:'Network printer unreachable',status:'in_progress',priority:'urgent',created_by:3,assigned_to:4},
        {title:'Cannot access shared drive',description:'Access denied to team folder',status:'resolved',priority:'medium',created_by:2,assigned_to:4},
        {title:'Lost security badge',description:'Request replacement badge',status:'open',priority:'low',created_by:3,assigned_to:null}
      ];
      for (const ticket of seed) tickets.create({...ticket,created_at:now,updated_at:now});
      comments.create({ticket_id:1,author_id:1,content:'We are reviewing the VPN gateway logs.',created_at:now});
    });
  }
  return Object.freeze({ db, orm, users, tickets, comments, close:()=>db.close() });
}
module.exports = { initializeDatabase };
