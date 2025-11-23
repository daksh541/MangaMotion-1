// backend/src/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', 'db.sqlite3');

try {
  const db = new Database(dbFile);

  // Run jobs migration
  const jobsSql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'create_jobs.sql'), 'utf8');
  db.exec(jobsSql);
  console.log('✓ Jobs migration applied');

  // Run users migration
  const usersSql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'create_users.sql'), 'utf8');
  db.exec(usersSql);
  console.log('✓ Users migration applied');

  console.log(`✓ All migrations applied to ${dbFile}`);
  db.close();
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
