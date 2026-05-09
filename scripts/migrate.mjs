import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = join(__dirname, '..', 'database');

const PASSWORD = process.env.SUPABASE_DB_PASSWORD;

const configs = [
  {
    name: 'direct',
    host: 'db.brfnxwrzabknhvyuqnwe.supabase.co',
    port: 5432,
    user: 'postgres',
    password: PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 8000,
  },
  {
    name: 'pooler-session',
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.brfnxwrzabknhvyuqnwe',
    password: PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 8000,
  },
  {
    name: 'pooler-transaction',
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.brfnxwrzabknhvyuqnwe',
    password: PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 8000,
  },
];

async function tryConnect() {
  for (const cfg of configs) {
    try {
      const client = new pg.Client(cfg);
      await client.connect();
      console.log(`✓ Connected via ${cfg.name}`);
      return client;
    } catch (e) {
      console.log(`✗ ${cfg.name} failed: ${e.message}`);
    }
  }
  throw new Error('All connection methods failed');
}

function splitSQL(sql) {
  const statements = [];
  let current = '';
  let i = 0;

  while (i < sql.length) {
    // Skip single-line comments
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      current += '\n';
      i++;
      continue;
    }

    // Skip block comments
    if (sql[i] === '/' && sql[i + 1] === '*') {
      current += '/*';
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
        current += sql[i];
        i++;
      }
      current += '*/';
      i += 2;
      continue;
    }

    // Handle dollar-quoting ($$ or $tag$...$tag$)
    if (sql[i] === '$') {
      let tag = '';
      let j = i + 1;
      if (sql[j] === '$') {
        // $$ ... $$ quoting
        current += '$$';
        i = j + 1;
        while (i < sql.length && !(sql[i] === '$' && sql[i + 1] === '$')) {
          current += sql[i];
          i++;
        }
        current += '$$';
        i += 2;
        continue;
      } else if (/[a-zA-Z_]/.test(sql[j])) {
        // $tag$ ... $tag$ quoting
        while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) {
          tag += sql[j];
          j++;
        }
        if (sql[j] === '$') {
          const endTag = '$' + tag + '$';
          current += '$' + tag + '$';
          i = j + 1;
          while (i < sql.length && !sql.startsWith(endTag, i)) {
            current += sql[i];
            i++;
          }
          current += endTag;
          i += endTag.length;
          continue;
        }
      }
    }

    // Handle single-quoted strings
    if (sql[i] === "'") {
      current += "'";
      i++;
      while (i < sql.length && sql[i] !== "'") {
        if (sql[i] === '\\') {
          current += sql[i] + (sql[i + 1] || '');
          i += 2;
        } else {
          current += sql[i];
          i++;
        }
      }
      current += "'";
      i++;
      continue;
    }

    // Semicolon = end of statement (unless inside string/comment/dollar-quote)
    if (sql[i] === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed + ';');
      }
      current = '';
      i++;
      continue;
    }

    current += sql[i];
    i++;
  }

  // Trailing content
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed + ';');
  }

  return statements;
}

async function runSqlFile(client, filePath, label) {
  const sql = readFileSync(filePath, 'utf-8');
  const statements = splitSQL(sql);

  console.log(`\n--- ${label} (${statements.length} statements) ---`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.slice(0, 120).replace(/\n/g, ' ');
    try {
      await client.query(stmt);
      console.log(`  ✓ [${i + 1}/${statements.length}] ${preview}...`);
    } catch (err) {
      console.error(`  ✗ [${i + 1}/${statements.length}] ERROR: ${err.message}`);
      console.error(`    SQL: ${preview}`);
      throw err;
    }
  }
}

async function main() {
  const client = await tryConnect();

  try {
    const files = [
      ['migration_v4.sql', 'Migration v4'],
      ['migration_fix.sql', 'Migration Fix'],
      ['migration_fix_rls.sql', 'Migration Fix RLS'],
    ];

    for (const [file, label] of files) {
      const filePath = join(dbDir, file);
      await runSqlFile(client, filePath, label);
    }

    console.log('\n=== All migrations completed successfully ===');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('\n=== Migration failed ===');
  process.exit(1);
});
