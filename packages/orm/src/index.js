'use strict';
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
function ident(input) {
  if (typeof input !== 'string' || !IDENTIFIER.test(input)) throw Error('Unsafe SQL identifier');
  return '"' + input + '"';
}
function model(table, fields, options = {}) {
  ident(table);
  if (!Array.isArray(fields) || !fields.length || new Set(fields).size !== fields.length) throw Error('Invalid model fields');
  fields.forEach(ident);
  const primaryKey = options.primaryKey || 'id';
  if (!fields.includes(primaryKey)) throw Error('Primary key must be a field');
  return Object.freeze({ table, fields: Object.freeze([...fields]), primaryKey });
}
class OjsORM {
  constructor(db) {
    if (!db || typeof db.prepare !== 'function') throw TypeError('SQLite prepare() required');
    this.db = db;
  }
  repository(schema) {
    if (!schema?.table || !Array.isArray(schema.fields)) throw TypeError('Use model()');
    const db = this.db, table = ident(schema.table), allowed = new Set(schema.fields);
    const col = name => { if (!allowed.has(name)) throw Error('Field not in model: ' + name); return ident(name); };
    const record = obj => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !Object.keys(obj).length) throw Error('Non-empty record required');
      for (const key of Object.keys(obj)) col(key);
      return Object.entries(obj);
    };
    const where = filters => {
      const entries = record(filters);
      return { sql: entries.map(([k,v]) => v === null ? col(k) + ' IS NULL' : col(k) + ' = ?').join(' AND '),
        values: entries.filter(([,v]) => v !== null).map(([,v]) => v) };
    };
    return Object.freeze({
      get(filters) { const w = where(filters); return db.prepare('SELECT * FROM '+table+' WHERE '+w.sql+' LIMIT 1').get(...w.values); },
      list(filters, options = {}) {
        const clauses = [], params = [];
        if (filters && Object.keys(filters).length) { const w = where(filters); clauses.push('WHERE '+w.sql); params.push(...w.values); }
        const sort = options.orderBy || schema.primaryKey, direction = options.desc ? 'DESC' : 'ASC';
        const limit = options.limit === undefined ? 100 : options.limit;
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw Error('Limit must be 1..1000');
        return db.prepare('SELECT * FROM '+table+' '+clauses.join(' ')+' ORDER BY '+col(sort)+' '+direction+' LIMIT ?').all(...params,limit);
      },
      create(input) {
        const entries = record(input);
        const keys = entries.map(([k])=>col(k)).join(', ');
        const params = entries.map(([,v])=>v);
        return db.prepare('INSERT INTO '+table+' ('+keys+') VALUES ('+entries.map(()=>'?').join(', ')+')').run(...params);
      },
      update(filters, changes) {
        const w = where(filters), entries = record(changes);
        return db.prepare('UPDATE '+table+' SET '+entries.map(([k])=>col(k)+' = ?').join(', ')+' WHERE '+w.sql)
          .run(...entries.map(([,v])=>v),...w.values);
      },
      delete(filters) { const w = where(filters); return db.prepare('DELETE FROM '+table+' WHERE '+w.sql).run(...w.values); }
    });
  }
  transaction(fn) {
    if (typeof fn !== 'function' || typeof this.db.transaction !== 'function') throw Error('Transactions unsupported');
    return this.db.transaction(fn)();
  }
}
module.exports = { OjsORM, model };
