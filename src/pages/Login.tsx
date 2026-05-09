import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { logAction } from "../lib/audit";

export default function Login() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleAuth = async (action: "login" | "signup") => {
    if (!studentId || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    const email = studentId.includes("@") ? studentId : `${studentId}@ucab.edu.sn`;
    try {
      if (action === "login") {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        if (email === "djahfarsadekh2015@gmail.com" && authData?.user) {
          await supabase.from("profiles").upsert({
            id: authData.user.id, card_number: "ADMIN-001", first_name: "Ouedraogo",
            last_name: "Djahfar Sadekh", role: "Admin", is_active: true, birth_date: "2000-01-01",
          });
        }
        await logAction(authData?.user?.id, "connexion", { email });
        navigate("/dashboard");
      } else {
        const isAdmin = email === "djahfarsadekh2015@gmail.com";
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { data: { card_number: isAdmin ? "ADMIN-001" : studentId.split("@")[0], first_name: isAdmin ? "Ouedraogo" : "", last_name: isAdmin ? "Djahfar Sadekh" : "", role: isAdmin ? "Admin" : "Membre", birth_date: "2000-01-01" } },
        });
        if (authError) throw authError;
        if (authData?.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: authData.user.id, card_number: isAdmin ? "ADMIN-001" : studentId.split("@")[0],
            first_name: isAdmin ? "Ouedraogo" : "", last_name: isAdmin ? "Djahfar Sadekh" : "",
            role: isAdmin ? "Admin" : "Membre", is_active: true, birth_date: "2000-01-01",
          });
          if (profileError) console.error("Erreur de création de profil:", profileError);
          await logAction(authData.user.id, "inscription", { email });
        }
        setInfo("Compte créé avec succès ! S'il n'y a pas de confirmation par email requise, vous pouvez vous connecter.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      await logAction(null, "erreur_connexion", { email, error: err.message, action });
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-gutter"
      style={{ background: "#f7f9ff", backgroundImage: "radial-gradient(at 0% 0%, #dde1ff 0px, transparent 50%), radial-gradient(at 100% 100%, #ffab69 0px, transparent 50%)" }}
    >
      <main className="w-full max-w-md">
        <div className="flex flex-col items-center mb-stack-lg">
          <div className="mb-stack-md bg-surface-container-lowest p-unit rounded-xl shadow-sm">
            <div className="w-20 h-20 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-on-primary font-black text-3xl tracking-tighter">SAS</span>
            </div>
          </div>
          <h1 className="font-h2 text-h2 text-primary text-center">SAS – Amicale UCAB Dakar</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-unit">Institutional Trust & Fiscal Responsibility</p>
        </div>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-stack-lg md:p-margin-desktop">
          <div className="mb-stack-lg">
            <h2 className="font-h3 text-h3 text-primary mb-unit">Bienvenue</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Veuillez vous connecter à votre espace membre.</p>
          </div>

          {error && (
            <div className="mb-4 bg-error-container border-l-4 border-error p-4 rounded-r flex text-sm text-on-error-container font-medium">
              <span className="material-symbols-outlined text-error mr-2">error</span>
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="mb-4 bg-tertiary-fixed/30 border-l-4 border-tertiary p-4 rounded-r flex text-sm text-on-tertiary-fixed-variant font-medium">
              <span className="material-symbols-outlined text-tertiary mr-2">check_circle</span>
              <span>{info}</span>
            </div>
          )}

          <form className="space-y-stack-md" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-unit">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="studentId">
                Email ou Carte Étudiant
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">badge</span>
                <input
                  id="studentId"
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-surface-bright border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md outline-none"
                  placeholder="Ex: 20230001"
                />
              </div>
            </div>

            <div className="space-y-unit">
              <div className="flex justify-between items-center">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="password">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-surface-bright border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-unit space-y-stack-md">
              <button
                type="button"
                onClick={() => handleAuth("login")}
                disabled={loading}
                className="w-full bg-primary text-on-primary font-semibold py-3.5 px-stack-md rounded-lg shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-stack-sm disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span>Se connecter</span>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>login</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleAuth("signup")}
                disabled={loading}
                className="w-full border-2 border-primary text-primary font-semibold py-3.5 px-stack-md rounded-lg hover:bg-surface-container transition-all disabled:opacity-50"
              >
                Créer un compte
              </button>
            </div>
          </form>

          <div className="relative my-stack-lg flex items-center">
            <div className="flex-grow border-t border-outline-variant" />
            <span className="flex-shrink mx-4 font-label-caps text-label-caps text-outline">OU</span>
            <div className="flex-grow border-t border-outline-variant" />
          </div>

          <div className="text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-sm">Vous êtes étudiant ?</p>
            <Link
              to="/inscription"
              className="inline-flex items-center justify-center w-full bg-secondary-fixed text-on-secondary-fixed font-semibold py-3 px-stack-md rounded-lg hover:bg-secondary-container transition-all border border-transparent"
            >
              Créer un compte membre
            </Link>
          </div>
        </section>

        <div className="mt-4 text-center">
          <Link to="/actualites-publiques" className="font-label-caps text-[10px] text-outline hover:text-primary transition-colors">
            Voir les actualités publiques
          </Link>
        </div>

        <footer className="mt-stack-lg text-center px-gutter">
          <p className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
            © 2024 SAS – Amicale UCAB Dakar
          </p>
        </footer>
      </main>
    </div>
  );
}
