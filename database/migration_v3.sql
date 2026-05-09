-- ============================================================================
-- SAS — Amicale UCAB Dakar
-- Migration v3 : bucket profile_photos, RLS annonces, trigger update_updated_at
-- ============================================================================

-- 1. Bucket profile_photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile_photos', 'profile_photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lecture publique profile_photos" ON storage.objects;
DROP POLICY IF EXISTS "Upload authentifié profile_photos" ON storage.objects;
DROP POLICY IF EXISTS "Update profile_photos propriétaire" ON storage.objects;
DROP POLICY IF EXISTS "Delete profile_photos propriétaire" ON storage.objects;

CREATE POLICY "Lecture publique profile_photos" ON storage.objects FOR SELECT USING (bucket_id = 'profile_photos');
CREATE POLICY "Upload authentifié profile_photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile_photos');
CREATE POLICY "Update profile_photos propriétaire" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile_photos' AND owner = auth.uid());
CREATE POLICY "Delete profile_photos propriétaire" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile_photos' AND owner = auth.uid());

-- 2. Fonction RPC pour supprimer un utilisateur (admin)
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notifications WHERE user_id = delete_user.user_id;
  DELETE FROM public.audit_log WHERE user_id = delete_user.user_id;
  DELETE FROM public.profiles WHERE id = delete_user.user_id;
  DELETE FROM auth.users WHERE id = delete_user.user_id;
END;
$$;
