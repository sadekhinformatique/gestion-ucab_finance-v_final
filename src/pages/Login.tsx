import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { logAction } from "../lib/audit";

export default function Login() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleAuth = async (action: 'login' | 'signup') => {
    if (!studentId || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    // Formate comme email validé par Supabase
    const email = studentId.includes("@") ? studentId : `${studentId}@ucab.edu.sn`;

    try {
      if (action === 'login') {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        // Force la création/mise à jour du profil Admin s'il y a eu une erreur précedente
        if (email === 'djahfarsadekh2015@gmail.com' && authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            card_number: 'ADMIN-001',
            first_name: 'Ouedraogo',
            last_name: 'Djahfar Sadekh',
            role: 'Admin',
            is_active: true,
            birth_date: '2000-01-01' // Date par defaut pour eviter l'erreur not-null
          });
        }
        
        await logAction(authData?.user?.id, 'connexion', { email });

        navigate("/dashboard");
      } else {
        const isAdmin = email === 'djahfarsadekh2015@gmail.com';
        
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              card_number: isAdmin ? 'ADMIN-001' : studentId.split('@')[0],
              first_name: isAdmin ? 'Ouedraogo' : '',
              last_name: isAdmin ? 'Djahfar Sadekh' : '',
              role: isAdmin ? 'Admin' : 'Membre',
              birth_date: '2000-01-01'
            }
          }
        });
        if (authError) throw authError;
        
        // Auto-création / mise à jour du profil
        if (authData?.user) {
          const profileError = await supabase.from('profiles').upsert({
            id: authData.user.id,
            card_number: isAdmin ? 'ADMIN-001' : studentId.split('@')[0],
            first_name: isAdmin ? 'Ouedraogo' : '',
            last_name: isAdmin ? 'Djahfar Sadekh' : '',
            role: isAdmin ? 'Admin' : 'Membre',
            is_active: true,
            birth_date: '2000-01-01'
          });
          if (profileError.error) console.error("Erreur de création de profil:", profileError.error);
          
          await logAction(authData.user.id, 'inscription', { email });
        }

        setInfo("Compte créé avec succès ! S'il n'y a pas de confirmation par email requise, vous pouvez vous connecter.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      await logAction(null, 'erreur_connexion', { email, error: err.message, action });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#1e2a5e] shadow-lg mb-6">
          <span className="text-white font-black text-2xl tracking-tighter">SAS</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Amicale UCAB Dakar
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Système de Suivi des Finances
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex text-sm text-red-700 font-medium">
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r flex text-sm text-emerald-700 font-medium">
              <span>{info}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label htmlFor="studentId" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Email ou Carte Étudiant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 pl-10 pr-3 bg-white font-medium text-slate-800"
                  placeholder="EX: 20260001 ou email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 pl-10 pr-3 bg-white font-medium text-slate-800"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => handleAuth('login')}
                disabled={loading}
                className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#1e2a5e] hover:opacity-90 focus:outline-none transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Connexion"}
              </button>
              <button
                type="button"
                onClick={() => handleAuth('signup')}
                disabled={loading}
                className="flex-1 flex justify-center items-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-colors disabled:opacity-50"
              >
                Créer un compte
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
