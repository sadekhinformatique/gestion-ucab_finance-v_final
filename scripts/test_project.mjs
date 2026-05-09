import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://brfnxwrzabknhvyuqnwe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZm54d3J6YWJrbmh2eXVxbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzU2OTAsImV4cCI6MjA5MzkxMTY5MH0.O3yLcmnpOHKRTlEigAIkmYttblsZFOC1dsB07Yj5RWM';

const supabase = createClient(supabaseUrl, supabaseKey);

let passed = 0;
let failed = 0;

function test(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`); }
}

async function run() {
  console.log('=== TEST: Connexion Supabase ===');
  const { error: healthErr } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  test('Supabase client fonctionne', !healthErr, healthErr?.message);

  console.log('\n=== TEST: Tables & RLS ===');
  const tables = ['profiles','transactions','expense_requests','expense_categories','filieres','groupes','membres_groupes','publications','publications_groupes','notifications','audit_log','announcements','app_config'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    test(`Table ${t} accessible`, !error, error?.message?.slice(0, 80));
  }

  console.log('\n=== TEST: Données seed (via Supabase anon) ===');
  // Filieres should be readable (no RLS restriction mentioned)
  const { data: filieres, error: fErr } = await supabase.from('filieres').select('*').order('id');
  test('Filieres récupérables', !fErr, fErr?.message);
  if (filieres) {
    test('4 filières en base', filieres.length === 4, `got ${filieres.length}`);
    filieres.forEach(f => console.log(`    ${f.id}. ${f.name}`));
  }

  // Groupes: anon user → should return 0 rows (RLS filters)
  const { data: groupes, error: gErr } = await supabase.from('groupes').select('count', { count: 'exact', head: true });
  test('Groupes requête OK', !gErr, gErr?.message);

  console.log('\n=== TEST: Vérification directe des données groupes (via pg) ===');
  // We need to verify groupes data exists in DB despite RLS hiding it from anon

  console.log('\n=== TEST: Auth (inscription & connexion) ===');
  const testEmail = `test_${Date.now()}@test.ucab.local`;
  const testPassword = 'Test1234!';

  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });
  if (signUpErr) {
    // If signup fails (e.g. due to rate limiting or disabled signups), try signIn
    test('Inscription possible', false, signUpErr.message);
    console.log('  → Tentative de connexion avec email random ignorée');
  } else if (signUp?.user) {
    test('Inscription réussie', true);
    test('User créé avec email', signUp.user.email === testEmail);

    // Clean up: delete test user
    await supabase.auth.admin.deleteUser(signUp.user.id);
  } else if (signUp?.user === null && signUp?.session === null) {
    // Confirm required
    test('Inscription soumise (confirmation requise)', true);
  }

  console.log('\n=== TEST: RLS anonyme ===');
  const { data: anonData, error: anonErr } = await supabase.from('profiles').select('*').limit(1);
  test('Profiles: anon ne reçoit pas d\'erreur', !anonErr, anonErr?.message);
  test('Profiles: anon reçoit 0 résultats', anonData?.length === 0, `got ${anonData?.length} rows`);

  const { data: grpData, error: grpErr } = await supabase.from('groupes').select('*').limit(1);
  test('Groupes: anon ne reçoit pas d\'erreur', !grpErr, grpErr?.message);
  test('Groupes: anon reçoit 0 résultats', grpData?.length === 0, `got ${grpData?.length} rows`);

  console.log('\n=== TEST: Filières publiques ===');
  const { data: pubFilieres, error: pubFErr } = await supabase.from('filieres').select('*');
  test('Filieres: anon peut lire', !pubFErr, pubFErr?.message);
  test('Filieres: données accessibles', (pubFilieres?.length ?? 0) > 0, `got ${pubFilieres?.length} rows`);

  console.log(`\n============================`);
  console.log(`Résultat: ${passed} ✓ / ${failed} ✗`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
