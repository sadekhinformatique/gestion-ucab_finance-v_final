-- ============================================================================
-- SAS — Amicale UCAB Dakar
-- Migration v4 : publications, groupes, publications de groupe
-- ============================================================================

-- 1. PUBLICATIONS (mur / actualités membres)
CREATE TABLE IF NOT EXISTS public.publications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    rejected_reason TEXT
);

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publications approuvées" ON public.publications FOR SELECT USING (status = 'approved');
CREATE POLICY "Lecture ses propres publications" ON public.publications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertion publication" ON public.publications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin modère publications" ON public.publications FOR UPDATE USING (
    public.get_user_role() IN ('Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire')
);

-- 2. GROUPES
CREATE TABLE IF NOT EXISTS public.groupes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('filiere', 'niveau')),
    parent_id INTEGER REFERENCES public.groupes(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.groupes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture groupes par membres" ON public.groupes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.membres_groupes WHERE groupe_id = groupes.id AND user_id = auth.uid())
    OR public.get_user_role() = 'Admin'
);
CREATE POLICY "Admin gère groupes" ON public.groupes FOR INSERT WITH CHECK (public.get_user_role() = 'Admin');
CREATE POLICY "Admin modifie groupes" ON public.groupes FOR UPDATE USING (public.get_user_role() = 'Admin');
CREATE POLICY "Admin supprime groupes" ON public.groupes FOR DELETE USING (public.get_user_role() = 'Admin');

-- 3. MEMBRES GROUPES
CREATE TABLE IF NOT EXISTS public.membres_groupes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    groupe_id INTEGER REFERENCES public.groupes(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'membre' CHECK (role IN ('admin_groupe', 'membre')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, groupe_id)
);

ALTER TABLE public.membres_groupes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture ses groupes" ON public.membres_groupes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin lit tous" ON public.membres_groupes FOR SELECT USING (public.get_user_role() = 'Admin');
CREATE POLICY "Insertion auto" ON public.membres_groupes FOR INSERT WITH CHECK (
    auth.uid() = user_id OR public.get_user_role() = 'Admin'
);
CREATE POLICY "Admin gère appartenances" ON public.membres_groupes FOR UPDATE USING (public.get_user_role() = 'Admin');
CREATE POLICY "Admin supprime appartenances" ON public.membres_groupes FOR DELETE USING (public.get_user_role() = 'Admin');

-- 4. PUBLICATIONS DE GROUPE
CREATE TABLE IF NOT EXISTS public.publications_groupes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    groupe_id INTEGER REFERENCES public.groupes(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    rejected_reason TEXT
);

ALTER TABLE public.publications_groupes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publications groupe" ON public.publications_groupes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.membres_groupes WHERE groupe_id = publications_groupes.groupe_id AND user_id = auth.uid())
    AND status = 'approved'
);
CREATE POLICY "Lecture propres publications groupe" ON public.publications_groupes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertion publication groupe" ON public.publications_groupes FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.membres_groupes WHERE groupe_id = publications_groupes.groupe_id AND user_id = auth.uid())
);
CREATE POLICY "Modération publications groupe" ON public.publications_groupes FOR UPDATE USING (
    public.get_user_role() = 'Admin'
    OR EXISTS (SELECT 1 FROM public.membres_groupes WHERE groupe_id = publications_groupes.groupe_id AND user_id = auth.uid() AND role = 'admin_groupe')
);

-- 5. INDEX
CREATE INDEX IF NOT EXISTS idx_publications_status ON public.publications(status);
CREATE INDEX IF NOT EXISTS idx_publications_user ON public.publications(user_id);
CREATE INDEX IF NOT EXISTS idx_publications_published ON public.publications(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_groupes_parent ON public.groupes(parent_id);
CREATE INDEX IF NOT EXISTS idx_membres_groupes_user ON public.membres_groupes(user_id);
CREATE INDEX IF NOT EXISTS idx_membres_groupes_groupe ON public.membres_groupes(groupe_id);
CREATE INDEX IF NOT EXISTS idx_publications_groupes_groupe ON public.publications_groupes(groupe_id);
CREATE INDEX IF NOT EXISTS idx_publications_groupes_status ON public.publications_groupes(status);

-- 6. FONCTION AUTO-ASSIGNEMENT GROUPES
CREATE OR REPLACE FUNCTION public.assign_member_to_groups(member_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    m_filiere TEXT;
    m_niveau TEXT;
    g_filiere_id INTEGER;
    g_niveau_id INTEGER;
BEGIN
    SELECT filiere, niveau INTO m_filiere, m_niveau FROM public.profiles WHERE id = member_id;

    IF m_filiere IS NOT NULL THEN
        SELECT id INTO g_filiere_id FROM public.groupes WHERE name = m_filiere AND type = 'filiere';
        IF g_filiere_id IS NOT NULL THEN
            INSERT INTO public.membres_groupes (user_id, groupe_id, role)
            VALUES (member_id, g_filiere_id, 'membre')
            ON CONFLICT (user_id, groupe_id) DO NOTHING;
        END IF;

        IF m_niveau IS NOT NULL THEN
            SELECT id INTO g_niveau_id FROM public.groupes WHERE name = m_niveau AND parent_id = g_filiere_id;
            IF g_niveau_id IS NOT NULL THEN
                INSERT INTO public.membres_groupes (user_id, groupe_id, role)
                VALUES (member_id, g_niveau_id, 'membre')
                ON CONFLICT (user_id, groupe_id) DO NOTHING;
            END IF;
        END IF;
    END IF;
END;
$$;

-- 7. TRIGGER : auto-assigner aux groupes après insert profil
DROP TRIGGER IF EXISTS trg_assign_groups ON public.profiles;
CREATE TRIGGER trg_assign_groups
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_member_to_groups(NEW.id);

-- 8. INITIALISATION DES GROUPES (à exécuter après création des filières)
-- Créer un groupe pour chaque filière, puis sous-groupes pour chaque niveau
-- Cela se fait via l'interface admin ou manuellement.
-- Exemple:
-- INSERT INTO public.groupes (name, type, description) VALUES
--   ('Informatique de gestion', 'filiere', 'Filière IG');
-- INSERT INTO public.groupes (name, type, parent_id) VALUES
--   ('L1', 'niveau', (SELECT id FROM public.groupes WHERE name = 'Informatique de gestion' AND type = 'filiere')),
--   ('L2', 'niveau', (SELECT id FROM public.groupes WHERE name = 'Informatique de gestion' AND type = 'filiere')),
--   ('L3', 'niveau', (SELECT id FROM public.groupes WHERE name = 'Informatique de gestion' AND type = 'filiere'));
