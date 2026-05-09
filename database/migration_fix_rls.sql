-- ============================================================================
-- SAS — Amicale UCAB Dakar
-- Fix RLS : remplacement des sous-requêtes récursives par une fonction
-- SECURITY DEFINER qui contourne la récursion infinie
-- ============================================================================

-- 1. Créer la fonction utilitaire (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- 2. Recréer les politiques sur profiles sans sous-requêtes récursives
DROP POLICY IF EXISTS "Le bureau peut lire tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Admin peut modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Lecture logs admin/commissaire" ON public.audit_log;

CREATE POLICY "Le bureau peut lire tous les profils" ON public.profiles FOR SELECT USING (
    public.get_user_role() IN ('Admin', 'Trésorier', 'Président', 'Presidente')
);

CREATE POLICY "Admin peut modifier tous les profils" ON public.profiles FOR UPDATE USING (
    public.get_user_role() = 'Admin'
);

-- 3. Audit log utilise aussi la fonction pour éviter la récursion
CREATE POLICY "Lecture logs admin/commissaire" ON public.audit_log FOR SELECT USING (
    public.get_user_role() IN ('Admin', 'Commissaire')
);
