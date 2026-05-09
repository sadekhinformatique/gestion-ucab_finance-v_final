const https = require('https');
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZnh3bmpmbXhncXRoZW92ZmR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI5MjEyNSwiZXhwIjoyMDkzODY4MTI1fQ.-vHhjflrqnlCTubotbkfkZo9R5qj9-KZdG9KyLluKUc';

const steps = [
  // 1. Add photo_url column
  "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;",
  // 2. Make card_number nullable
  "ALTER TABLE public.profiles ALTER COLUMN card_number DROP NOT NULL;",
  // 3. Create announcements table
  `CREATE TABLE IF NOT EXISTS public.announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    pinned BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );`,
  // 4. RLS
  "ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;",
  `CREATE POLICY IF NOT EXISTS "Lecture publique annonces" ON public.announcements FOR SELECT USING (true);`,
  `CREATE POLICY IF NOT EXISTS "Insertion annonces bureau" ON public.announcements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire'))
  );`,
  `CREATE POLICY IF NOT EXISTS "Modification annonces bureau" ON public.announcements FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire'))
  );`,
  `CREATE POLICY IF NOT EXISTS "Suppression annonces admin" ON public.announcements FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );`,
  // 5. Indexes
  "CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);",
  "CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(pinned DESC);",
  // 6. Trigger
  `CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = timezone('utc'::text, now()); RETURN NEW; END; $$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
  CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();`,
  // 7. Storage policies
  `CREATE POLICY IF NOT EXISTS "Lecture publique avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');`,
  `CREATE POLICY IF NOT EXISTS "Upload authentifié avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');`,
  `CREATE POLICY IF NOT EXISTS "Update avatars par propriétaire" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());`,
  `CREATE POLICY IF NOT EXISTS "Delete avatars par propriétaire" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());`
];

async function execSql(sql) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'lpfxwnjfmxgqtheovfdy.supabase.co',
      path: '/rest/v1/rpc/pg_query',
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 200) }));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ query_text: sql }));
    req.end();
  });
}

(async () => {
  for (let i = 0; i < steps.length; i++) {
    const result = await execSql(steps[i]);
    console.log(`Step ${i+1}:`, result.status, result.body);
  }
  console.log('Migration done');
})();
