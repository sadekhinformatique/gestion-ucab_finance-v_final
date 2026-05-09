import { createClient } from '@supabase/supabase-js';

// Utilisation des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://brfnxwrzabknhvyuqnwe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZm54d3J6YWJrbmh2eXVxbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzU2OTAsImV4cCI6MjA5MzkxMTY5MH0.O3yLcmnpOHKRTlEigAIkmYttblsZFOC1dsB07Yj5RWM';

// Initialisation du client Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
