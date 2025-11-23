// backend/src/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', 'db.sqlite3');
const migrateSql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'create_jobs.sql'), 'utf8');

try {
  const db = new Database(dbFile);
  db.exec(migrateSql);
  console.log(`✓ Migration applied to ${dbFile}`);
  db.close();
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
