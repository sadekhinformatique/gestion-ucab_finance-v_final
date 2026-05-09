-- ============================================================================
-- Migration corrective : alignement code ↔ base de données
-- À exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ============================================================================

-- 1. Ajout des colonnes manquantes dans expense_requests
ALTER TABLE public.expense_requests
ADD COLUMN IF NOT EXISTS treasurer_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS president_validated_by UUID REFERENCES auth.users(id);

-- 2. Mise à jour de la contrainte CHECK pour accepter les valeurs utilisées par le code
ALTER TABLE public.expense_requests
DROP CONSTRAINT IF EXISTS expense_requests_status_check;

ALTER TABLE public.expense_requests
ADD CONSTRAINT expense_requests_status_check
CHECK (status IN ('pending', 'treasurer_approved', 'validated_president', 'approved', 'rejected', 'converted', 'en_attente'));

-- 3. Valeur par défaut
ALTER TABLE public.expense_requests
ALTER COLUMN status SET DEFAULT 'pending';

-- 4. Index supplémentaire
CREATE INDEX IF NOT EXISTS idx_expense_requests_treasurer_approved
ON public.expense_requests(treasurer_approved_by)
WHERE treasurer_approved_by IS NOT NULL;

-- 5. Synchronisation des données existantes (si certaines sont en 'en_attente')
UPDATE public.expense_requests SET status = 'pending' WHERE status = 'en_attente';
UPDATE public.expense_requests SET status = 'approved' WHERE status = 'converted';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
