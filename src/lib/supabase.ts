import { createClient } from '@supabase/supabase-js';

// Utilisation des variables d'environnement avec les clés fournies en valeur par défaut
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lpfxwnjfmxgqtheovfdy.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZnh3bmpmbXhncXRoZW92ZmR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyOTIxMjUsImV4cCI6MjA5Mzg2ODEyNX0.hQdsPBSI2QUL78y3gCAwjq11On5nkQKEkK0UtZ3RihQ';

// Initialisation du client Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
