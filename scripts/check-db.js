#!/usr/bin/env node

/**
 * Database Connectivity Check Script
 *
 * Verifies PostgreSQL database connectivity and migration status
 * before accepting production traffic.
 *
 * Usage: node scripts/check-db.js
 * Exit codes: 0=success, 1=warning, 2=error
 */

const { Pool } = require('pg');

// Configuration from environment
const DATABASE_URL = process.env.DATABASE_URL;
const MAX_RETRIES = parseInt(process.env.DB_CHECK_MAX_RETRIES) || 5;
const RETRY_DELAY_MS = parseInt(process.env.DB_CHECK_RETRY_DELAY_MS) || 2000;
const CONNECTION_TIMEOUT_MS = parseInt(process.env.DB_CHECK_TIMEOUT_MS) || 10000;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(2);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  // Use smaller pool for health checks
  max: 2,
  idleTimeoutMillis: 5000,
});

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
}

async function checkConnection(retryCount = 0) {
  try {
    log('info', `Checking database connection (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    const client = await pool.connect();
    const result = await client.query('SELECT version() as version, now() as timestamp');
    client.release();

    log('green', '✓ Database connection successful');
    log('info', `PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`);
    log('info', `Server time: ${result.rows[0].timestamp}`);

    return true;
  } catch (error) {
    log('red', `✗ Database connection failed: ${error.message}`);

    if (retryCount < MAX_RETRIES - 1) {
      log('yellow', `Retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return checkConnection(retryCount + 1);
    }

    return false;
  }
}

async function checkMigrations() {
  try {
    log('info', 'Checking migration status...');

    const client = await pool.connect();

    // Check if migrations table exists
    const migrationsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'migrations'
      );
    `);

    if (!migrationsTableCheck.rows[0].exists) {
      log('yellow', '⚠ Migrations table not found - database may not be migrated');
      client.release();
      return false;
    }

    // Check for required tables
    const requiredTables = ['jobs', 'users', 'sqlite_sequence'];
    const existingTables = [];
    const missingTables = [];

    for (const table of requiredTables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table]);

      if (tableCheck.rows[0].exists) {
        existingTables.push(table);
      } else {
        missingTables.push(table);
      }
    }

    client.release();

    if (missingTables.length > 0) {
      log('red', `✗ Missing required tables: ${missingTables.join(', ')}`);
      log('info', `Existing tables: ${existingTables.join(', ')}`);
      return false;
    }

    log('green', '✓ All required tables present');

    // Check latest migration if migrations table exists
    const client2 = await pool.connect();
    try {
      const latestMigration = await client2.query(`
        SELECT name FROM migrations ORDER BY id DESC LIMIT 1;
      `);

      if (latestMigration.rows.length > 0) {
        log('info', `Latest migration: ${latestMigration.rows[0].name}`);
      }
    } catch (err) {
      log('yellow', `⚠ Could not check latest migration: ${err.message}`);
    }
    client2.release();

    return true;
  } catch (error) {
    log('red', `✗ Migration check failed: ${error.message}`);
    return false;
  }
}

async function checkBasicOperations() {
  try {
    log('info', 'Testing basic database operations...');

    const client = await pool.connect();

    // Test read operation
    const readTest = await client.query('SELECT COUNT(*) as count FROM jobs');
    const jobCount = parseInt(readTest.rows[0].count);
    log('info', `Jobs table contains ${jobCount} records`);

    // Test write operation (temp table)
    await client.query('CREATE TEMP TABLE health_check (id serial PRIMARY KEY, test_time timestamp DEFAULT now())');
    const writeTest = await client.query('INSERT INTO health_check DEFAULT VALUES RETURNING test_time');
    const testTime = writeTest.rows[0].test_time;
    log('info', `Database write test successful at ${testTime}`);
    await client.query('DROP TABLE health_check');

    client.release();
    log('green', '✓ Basic operations test passed');

    return true;
  } catch (error) {
    log('red', `✗ Basic operations test failed: ${error.message}`);
    return false;
  }
}

async function checkConnectionPool() {
  try {
    log('info', 'Checking connection pool status...');

    // Test multiple concurrent connections
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        pool.query('SELECT pg_backend_pid() as pid, $1 as test_id', [i])
      );
    }

    const results = await Promise.all(promises);
    const pids = results.map(r => r.rows[0].pid);

    log('info', `Concurrent connection test successful (PIDs: ${pids.join(', ')})`);
    log('green', '✓ Connection pool working correctly');

    return true;
  } catch (error) {
    log('red', `✗ Connection pool test failed: ${error.message}`);
    return false;
  }
}

async function checkDiskSpace() {
  try {
    log('info', 'Checking database disk space...');

    const client = await pool.connect();
    const result = await client.query(`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_size_pretty(pg_relation_size('jobs')) as jobs_table_size;
    `);

    const dbSize = result.rows[0].database_size;
    const jobsSize = result.rows[0].jobs_table_size;

    log('info', `Database size: ${dbSize}`);
    log('info', `Jobs table size: ${jobsSize}`);
    log('green', '✓ Disk space check completed');

    client.release();
    return true;
  } catch (error) {
    log('yellow', `⚠ Disk space check failed: ${error.message}`);
    return true; // Don't fail health check for disk space
  }
}

async function main() {
  log('info', 'Starting database health check...');
  log('info', `Database: ${DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`);
  log('info', `Timeout: ${CONNECTION_TIMEOUT_MS}ms, Max retries: ${MAX_RETRIES}`);

  const startTime = Date.now();
  const checks = [
    { name: 'Connection', fn: checkConnection },
    { name: 'Migrations', fn: checkMigrations },
    { name: 'Basic Operations', fn: checkBasicOperations },
    { name: 'Connection Pool', fn: checkConnectionPool },
    { name: 'Disk Space', fn: checkDiskSpace }
  ];

  let failedChecks = 0;
  let warningChecks = 0;

  for (const check of checks) {
    const success = await check.fn();
    if (!success) {
      if (check.name === 'Migrations' || check.name === 'Connection') {
        failedChecks++;
      } else {
        warningChecks++;
      }
    }
  }

  const duration = Date.now() - startTime;
  log('info', `Health check completed in ${duration}ms`);

  try {
    await pool.end();
  } catch (error) {
    log('yellow', `⚠ Error closing connection pool: ${error.message}`);
  }

  if (failedChecks > 0) {
    log('red', `✗ Health check FAILED: ${failedChecks} critical checks failed`);
    process.exit(2);
  } else if (warningChecks > 0) {
    log('yellow', `⚠ Health check WARNING: ${warningChecks} non-critical checks failed`);
    process.exit(1);
  } else {
    log('green', '✓ All health checks passed - database is healthy');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('info', 'Received SIGINT, shutting down gracefully...');
  try {
    await pool.end();
  } catch (error) {
    // Ignore cleanup errors
  }
  process.exit(130);
});

process.on('SIGTERM', async () => {
  log('info', 'Received SIGTERM, shutting down gracefully...');
  try {
    await pool.end();
  } catch (error) {
    // Ignore cleanup errors
  }
  process.exit(143);
});

// Run the health check
main().catch(error => {
  log('red', `FATAL: Health check crashed: ${error.message}`);
  log('red', error.stack);
  process.exit(2);
});