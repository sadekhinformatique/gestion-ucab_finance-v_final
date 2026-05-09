-- Ajout des colonnes demandées pour le système avancé de notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS link TEXT;

-- On migre les anciennes données pour qu'elles aient la nouvelle structure
UPDATE public.notifications 
SET content = message, 
    title = 'Notification', 
    link = ''
WHERE content IS NULL;

-- Mise en place de règles RLS pour notifications (déjà fait partiellement mais ajustons)
-- Les utilisateurs peuvent voir (SELECT) leurs propres notifications
CREATE POLICY "Voir ses notifications" ON public.notifications 
FOR SELECT USING (auth.uid() = user_id);

-- Le système/application (utilisateur authentifié) peut INSERER des notifications 
-- Pour les notifications croisées, on a besoin que tout le monde puisse insérer.
CREATE POLICY "Insérer notification" ON public.notifications
FOR INSERT WITH CHECK (true);

-- L'utilisateur peut mettre à jour ses propres notifications (ex: is_read = true)
CREATE POLICY "Mettre à jour ses notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);
