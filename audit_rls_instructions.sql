-- Création de la table audit_log si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activation de RLS sur la table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Politique : Tout utilisateur authentifié (et même non authentifié lors de l'échec de login) peut insérer
-- Note : pour permettre l'insertion de logs de "connexion en échec" sans être authentifié, on autorise l'insertion globale (ou anon/auth)
CREATE POLICY "Permettre l'insertion de logs à tous" 
ON public.audit_log FOR INSERT 
WITH CHECK (true);

-- Politique : Seuls les administrateurs et commissaires peuvent lire les logs
CREATE POLICY "Lecture des logs par admin et commissaire" 
ON public.audit_log FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (LOWER(profiles.role) = 'admin' OR LOWER(profiles.role) = 'commissaire')
    )
);

-- Interdire les updates et deletes sur audit_log
CREATE POLICY "Pas d'update sur audit log" ON public.audit_log FOR UPDATE USING (false);
CREATE POLICY "Pas de delete sur audit log" ON public.audit_log FOR DELETE USING (false);
