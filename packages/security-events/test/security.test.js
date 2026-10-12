'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tmpdir } = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { hashPassword, verifyPassword, safeDocument, suspectSqlInput } = require('../src');
test('scrypt password verification rejects invalid credentials', () => {
  const encoded = hashPassword('Strong_password_12');
  assert.equal(verifyPassword('Strong_password_12', encoded), true);
  assert.equal(verifyPassword('wrong password', encoded), false);
  assert.equal(verifyPassword('', 'junk'), false);
});
test('strict file resolution blocks traversal', () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'ojs-safe-kb-'));
  try {
    fs.writeFileSync(path.join(dir, 'guide.html'), '<p>hi</p>');
    assert.equal(safeDocument(dir, 'guide.html'), path.join(dir, 'guide.html'));
    assert.equal(safeDocument(dir, '../secrets.html'), null);
    assert.equal(safeDocument(dir, '/etc/passwd'), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('recognize common SQL probes without treating detection as SQL execution', () => {
  assert.equal(suspectSqlInput("' OR 1=1 --"), true);
  assert.equal(suspectSqlInput('printer jam'), false);
});
