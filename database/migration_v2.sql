-- ============================================================================
-- SAS — Amicale UCAB Dakar
-- Migration v2 : inscriptions membres, actualités, avatars
-- ============================================================================

-- 1. Profiles : ajout photo_url, card_number nullable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.profiles ALTER COLUMN card_number DROP NOT NULL;

-- 2. Table des actualités / annonces
CREATE TABLE IF NOT EXISTS public.announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    pinned BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique annonces" ON public.announcements;
DROP POLICY IF EXISTS "Insertion annonces bureau" ON public.announcements;
DROP POLICY IF EXISTS "Modification annonces bureau" ON public.announcements;
DROP POLICY IF EXISTS "Suppression annonces admin" ON public.announcements;

CREATE POLICY "Lecture publique annonces" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Insertion annonces bureau" ON public.announcements FOR INSERT WITH CHECK (
    public.get_user_role() IN ('Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire')
);
CREATE POLICY "Modification annonces bureau" ON public.announcements FOR UPDATE USING (
    public.get_user_role() IN ('Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire')
);
CREATE POLICY "Suppression annonces admin" ON public.announcements FOR DELETE USING (
    public.get_user_role() = 'Admin'
);

-- 3. Bucket avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lecture publique avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload authentifié avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Update avatars par propriétaire" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());
CREATE POLICY "Delete avatars par propriétaire" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());

-- 4. Trigger updated_at pour announcements
DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(pinned DESC);
