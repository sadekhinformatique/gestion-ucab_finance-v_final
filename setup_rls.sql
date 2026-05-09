-- Politiques RLS pour expense_requests

-- Les membres peuvent voir et insérer leurs propres demandes
CREATE POLICY "Les membres peuvent voir leurs demandes" 
ON public.expense_requests FOR SELECT 
USING (auth.uid() = member_id);

CREATE POLICY "Les membres peuvent inserer leurs demandes" 
ON public.expense_requests FOR INSERT 
WITH CHECK (auth.uid() = member_id);

-- Les profils administrateurs peuvent tout voir
CREATE POLICY "Le bureau peut voir toutes les demandes" 
ON public.expense_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'Trésorier', 'Président', 'Presidente')
  )
);

-- Le bureau peut mettre à jour
CREATE POLICY "Le bureau peut mettre a jour les statuts" 
ON public.expense_requests FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'Trésorier', 'Président', 'Presidente')
  )
);

-- Permettre publiquement le bucket justificatifs
CREATE POLICY "Allow public read access to justificatifs"
ON storage.objects FOR SELECT
USING (bucket_id = 'justificatifs');

CREATE POLICY "Allow authenticated uploads to justificatifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'justificatifs');

-- RLS pour notifications (déjà géré partiellement, mais assurez-vous de l'insertion)
CREATE POLICY "Allow members to insert notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);
