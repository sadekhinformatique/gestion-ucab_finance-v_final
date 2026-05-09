import pg from 'pg';
const c = new pg.Client({ host:'aws-0-eu-west-1.pooler.supabase.com', port:5432, user:'postgres.brfnxwrzabknhvyuqnwe', password:'Dspro1814@2027', database:'postgres', connectionTimeoutMillis:8000 });
await c.connect();

// Drop old function signature (with UUID param)
console.log('Drop old assign_member_to_groups(member_id UUID)...');
await c.query('DROP FUNCTION IF EXISTS public.assign_member_to_groups(uuid)');
console.log('  ✓ OK');

// Drop test trigger and function from my tests
console.log('Drop test trigger trg_t4...');
await c.query('DROP TRIGGER IF EXISTS trg_t4 ON public.profiles');
console.log('  ✓ OK');
console.log('Drop test function test_trg_func...');
await c.query('DROP FUNCTION IF EXISTS public.test_trg_func()');
console.log('  ✓ OK');

// Also clean up any other test triggers
console.log('Drop test triggers trg_t1, trg_t2, trg_t3...');
await c.query('DROP TRIGGER IF EXISTS trg_t1 ON public.profiles');
await c.query('DROP TRIGGER IF EXISTS trg_t2 ON public.profiles');
await c.query('DROP TRIGGER IF EXISTS trg_t3 ON public.profiles');
console.log('  ✓ OK');

// Verify no duplicate assign_member_to_groups
const r = await c.query("SELECT proname, proargtypes::text, prorettype::regtype FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'assign_%'");
console.log('\nFonctions assign_member_to_groups:');
r.rows.forEach(r => console.log(`  ${r.proname}(${r.proargtypes}) -> ${r.return_type}`));

await c.end();
