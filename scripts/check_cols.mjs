import pg from 'pg';
const c = new pg.Client({host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,user:'postgres.brfnxwrzabknhvyuqnwe',password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',connectionTimeoutMillis:8000});
await c.connect();
const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position");
console.log('Colonnes profiles:', cols.rows.map(r=>r.column_name).join(', '));
await c.end();
