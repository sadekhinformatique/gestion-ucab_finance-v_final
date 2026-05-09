import { supabase } from './supabase';

export async function logAction(userId: string | undefined, action: string, details: any = {}) {
  try {
    let ip_address = "inconnue";
    try {
      // Tentative de récupération de l'adresse IP publique
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip_address = data.ip;
    } catch(e) {
      // Silencieux
    }

    await supabase.from('audit_log').insert([{
      user_id: userId || null,
      action: action,
      details: details,
      ip_address: ip_address
    }]);
  } catch (err) {
    console.error("Failed to log action:", err);
  }
}
