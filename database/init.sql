-- ============================================================================
-- SAS — Amicale UCAB Dakar
-- Script d'initialisation complet : tables, RLS, politiques, buckets
-- À exécuter une seule fois dans l'éditeur SQL de Supabase (SQL Editor)
-- ============================================================================

-- 1. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    card_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Membre' CHECK (role IN ('Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire', 'Membre')),
    is_active BOOLEAN DEFAULT true,
    filiere TEXT,
    niveau TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('entree', 'depense')),
    categorie TEXT NOT NULL,
    montant NUMERIC(12, 2) NOT NULL CHECK (montant > 0),
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    statut TEXT DEFAULT 'validé' CHECK (statut IN ('validé', 'brouillon', 'annulé')),
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expense_requests (
    id SERIAL PRIMARY KEY,
    member_id UUID REFERENCES auth.users(id) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES public.expense_categories(id),
    justification_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'treasurer_approved', 'validated_president', 'approved', 'rejected', 'converted')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    treasurer_approved_by UUID REFERENCES auth.users(id),
    president_validated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.filieres (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    niveaux TEXT[] DEFAULT '{L1, L2, L3}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO public.app_config (key, value) VALUES ('threshold', '50000') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_config (key, value) VALUES ('logo_url', '') ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    message TEXT,
    link TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_card_number ON public.profiles(card_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON public.expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_requests_member ON public.expense_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 0. Fonction utilitaire pour éviter la récursion RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- 3a. PROFILES
CREATE POLICY "Lecture du profil utilisateur" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Le bureau peut lire tous les profils" ON public.profiles FOR SELECT USING (
    public.get_user_role() IN ('Admin', 'Trésorier', 'Président', 'Presidente')
);
CREATE POLICY "Insertion profil par l'utilisateur" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Mise à jour propre profil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin peut modifier tous les profils" ON public.profiles FOR UPDATE USING (
    public.get_user_role() = 'Admin'
);

-- 3b. TRANSACTIONS
CREATE POLICY "Lecture transactions par membres actifs" ON public.transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true)
);
CREATE POLICY "Insertion transactions par bureau" ON public.transactions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Trésorier', 'Président', 'Presidente'))
);

-- 3c. EXPENSE_REQUESTS
CREATE POLICY "Voir ses propres demandes" ON public.expense_requests FOR SELECT USING (auth.uid() = member_id);
CREATE POLICY "Le bureau voit toutes les demandes" ON public.expense_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Trésorier', 'Président', 'Presidente'))
);
CREATE POLICY "Insérer ses demandes" ON public.expense_requests FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Bureau met à jour les statuts" ON public.expense_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Trésorier', 'Président', 'Presidente'))
);

-- 3d. EXPENSE_CATEGORIES / FILIERES / APP_CONFIG — lecture publique, écriture admin
CREATE POLICY "Lecture catégories" ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY "Écriture catégories admin" ON public.expense_categories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Lecture filières" ON public.filieres FOR SELECT USING (true);
CREATE POLICY "Écriture filières admin" ON public.filieres FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Lecture config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Écriture config admin" ON public.app_config FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 3e. NOTIFICATIONS
CREATE POLICY "Voir ses notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insérer notification" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Mettre à jour ses notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 3f. AUDIT_LOG
CREATE POLICY "Insertion logs tous" ON public.audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Lecture logs admin/commissaire" ON public.audit_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND LOWER(role) IN ('admin', 'commissaire'))
);
CREATE POLICY "Pas d'update audit_log" ON public.audit_log FOR UPDATE USING (false);
CREATE POLICY "Pas de delete audit_log" ON public.audit_log FOR DELETE USING (false);

-- 4. STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('justificatifs', 'justificatifs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lecture publique justificatifs" ON storage.objects FOR SELECT USING (bucket_id = 'justificatifs');
CREATE POLICY "Upload authentifié justificatifs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'justificatifs');

-- 5. TRIGGER : mise à jour automatique de updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_requests_updated_at ON public.expense_requests;
CREATE TRIGGER trg_expense_requests_updated_at
    BEFORE UPDATE ON public.expense_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
