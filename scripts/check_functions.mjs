import pg from 'pg';
const c = new pg.Client({ host:'aws-0-eu-west-1.pooler.supabase.com', port:5432, user:'postgres.brfnxwrzabknhvyuqnwe', password:'Dspro1814@2027', database:'postgres', connectionTimeoutMillis:8000 });
await c.connect();

const r1 = await c.query('SELECT public.get_user_role()');
console.log('get_user_role() (anonyme):', r1.rows[0].get_user_role);

const r2 = await c.query(
  "SELECT event_object_table, trigger_name, action_timing, event_manipulation FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name"
);
console.log('\nTriggers:');
r2.rows.forEach(r => console.log(`  ${r.event_object_table}: ${r.action_timing} ${r.event_manipulation} -> ${r.trigger_name}`));

const r3 = await c.query("SELECT proname, prorettype::regtype as return_type FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY proname");
console.log('\nFonctions publiques:');
r3.rows.forEach(r => console.log(`  ${r.proname}() -> ${r.return_type}`));

// Test RLS is enabled on key tables
const r4 = await c.query(
  "SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relrowsecurity=true ORDER BY relname"
);
console.log('\nTables avec RLS activé:');
r4.rows.forEach(r => console.log(`  ${r.relname}`));

await c.end();
