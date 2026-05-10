import pg from 'pg';
const c = new pg.Client({host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,user:'postgres.brfnxwrzabknhvyuqnwe',password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',connectionTimeoutMillis:8000});
await c.connect();

const users = await c.query("SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5");
console.log('Users dans auth.users:', users.rows.length);
users.rows.forEach(u => console.log(`  ${u.id.slice(0,8)}... ${u.email}`));

const profiles = await c.query("SELECT id, first_name, last_name, role, is_active FROM public.profiles ORDER BY created_at DESC LIMIT 5");
console.log('\nProfiles dans public.profiles:', profiles.rows.length);
profiles.rows.forEach(p => console.log(`  ${p.id.slice(0,8)}... ${p.first_name} ${p.last_name} (${p.role}) actif=${p.is_active}`));

await c.end();
