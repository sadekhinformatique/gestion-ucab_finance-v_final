import pg from 'pg';
const client = new pg.Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
  user: 'postgres.brfnxwrzabknhvyuqnwe', password: 'Dspro1814@2027',
  database: 'postgres', connectionTimeoutMillis: 8000,
});
await client.connect();

console.log('--- GROUPES ---');
const g = await client.query(
  "SELECT g.id, g.name, g.type, COALESCE(p.name, '') as parent FROM public.groupes g LEFT JOIN public.groupes p ON g.parent_id=p.id ORDER BY g.id"
);
console.log(`${g.rows.length} lignes:`);
for (const r of g.rows) {
  console.log(`  ${r.id}. [${r.type}] ${r.name}${r.parent ? ' > ' + r.parent : ''}`);
}

console.log('\n--- FILIERES ---');
const f = await client.query('SELECT * FROM public.filieres ORDER BY id');
console.log(`${f.rows.length} lignes:`);
for (const r of f.rows) {
  console.log(`  ${r.id}. ${r.name} niveaux=${JSON.stringify(r.niveaux)}`);
}

console.log('\n--- APP_CONFIG ---');
const ac = await client.query('SELECT * FROM public.app_config');
for (const r of ac.rows) {
  console.log(`  ${r.key} = ${r.value}`);
}

await client.end();
