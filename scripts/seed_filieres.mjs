import pg from 'pg';
const client = new pg.Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
  user: 'postgres.brfnxwrzabknhvyuqnwe', password: 'Dspro1814@2027',
  database: 'postgres', connectionTimeoutMillis: 8000,
});
await client.connect();

// 1. Insert into filieres
const filieres = [
  { name: 'Année préparatoire', niveaux: null },
  { name: 'Administration', niveaux: ['L1', 'L2', 'L3'] },
  { name: 'Électromécanique', niveaux: ['L1', 'L2', 'L3'] },
  { name: 'Informatique de gestion', niveaux: ['L1', 'L2', 'L3'] },
];

for (const f of filieres) {
  if (f.niveaux) {
    await client.query(
      "INSERT INTO public.filieres (name, niveaux) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING",
      [f.name, f.niveaux]
    );
  } else {
    await client.query(
      "INSERT INTO public.filieres (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [f.name]
    );
  }
  console.log(`✓ filiere: ${f.name}`);
}

// 2. Insert into groupes (filiere type)
for (const f of filieres) {
  const exist = await client.query(
    "SELECT id FROM public.groupes WHERE name = $1 AND type = 'filiere'",
    [f.name]
  );
  if (exist.rows.length === 0) {
    await client.query(
      "INSERT INTO public.groupes (name, type, description) VALUES ($1, 'filiere', $2)",
      [f.name, `Filière ${f.name}`]
    );
    console.log(`✓ groupe (filiere): ${f.name}`);
  } else {
    console.log(`- groupe (filiere): ${f.name} (existe déjà)`);
  }
}

// 3. Insert into groupes (niveau type, with parent)
for (const f of filieres) {
  if (!f.niveaux) continue;
  const parentRes = await client.query(
    "SELECT id FROM public.groupes WHERE name = $1 AND type = 'filiere'",
    [f.name]
  );
  if (parentRes.rows.length > 0) {
    for (const niveau of f.niveaux) {
      const exist = await client.query(
        "SELECT id FROM public.groupes WHERE name = $1 AND type = 'niveau' AND parent_id = $2",
        [niveau, parentRes.rows[0].id]
      );
      if (exist.rows.length === 0) {
        await client.query(
          "INSERT INTO public.groupes (name, type, parent_id) VALUES ($1, 'niveau', $2)",
          [niveau, parentRes.rows[0].id]
        );
        console.log(`  ✓ groupe (niveau): ${f.name} > ${niveau}`);
      } else {
        console.log(`  - groupe (niveau): ${f.name} > ${niveau} (existe déjà)`);
      }
    }
  }
}

await client.end();
console.log('\n=== Insertion terminée ===');
