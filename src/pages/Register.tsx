import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [filieres, setFilieres] = useState<any[]>([]);

  const [cardNumber, setCardNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("filieres").select("*").order("name").then(({ data }) => {
      if (data) setFilieres(data);
    });
  }, []);

  const selectedFiliere = filieres.find((f) => f.name === filiere);
  const niveaux = selectedFiliere?.niveaux || [];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("La photo ne doit pas dépasser 2 Mo"); return; }
    if (!file.type.startsWith("image/")) { setError("Le fichier doit être une image"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); setLoading(false); return; }
    try {
      const cardTrimmed = cardNumber.trim();
      const { data: existing } = await supabase.from("profiles").select("card_number").eq("card_number", cardTrimmed).maybeSingle();
      if (existing) throw new Error("Ce numéro de carte est déjà utilisé");
      const email = `${cardTrimmed.toLowerCase()}@etudiant.ucab.sn`;
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const filePath = `${authData.user.id}/profile.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("profile_photos").upload(filePath, photoFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("profile_photos").getPublicUrl(filePath);
          photo_url = publicUrl;
        }
      }
      await supabase.from("profiles").upsert({
        id: authData.user.id, card_number: cardTrimmed, first_name: firstName, last_name: lastName,
        birth_date: birthDate || null, filiere, niveau, photo_url, role: "Membre", is_active: true,
      });
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally { setLoading(false); }
  };

  if (registered) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-gutter"
        style={{ background: "#f7f9ff", backgroundImage: "radial-gradient(at 0% 0%, #dde1ff 0px, transparent 50%), radial-gradient(at 100% 100%, #ffab69 0px, transparent 50%)" }}
      >
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary-fixed/40 mb-6">
            <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-3xl">check_circle</span>
          </div>
          <h2 className="font-h2 text-h2 text-primary">Inscription réussie !</h2>
          <p className="mt-3 text-on-surface-variant font-body-sm">
            Votre compte a été créé. Vous pouvez dès maintenant vous connecter avec votre numéro de carte et votre mot de passe.
          </p>
          <p className="mt-1 text-sm text-outline">
            Email de connexion : <span className="font-mono font-bold">{cardNumber.toLowerCase()}@etudiant.ucab.sn</span>
          </p>
          <div className="mt-8 space-y-3">
            <Link to="/" className="block w-full py-3 px-4 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all">
              Aller à la connexion
            </Link>
            <Link to="/actualites-publiques" className="block w-full py-3 px-4 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-surface-container transition-all">
              Voir les actualités
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ background: "#f7f9ff", backgroundImage: "radial-gradient(at 0% 0%, #dde1ff 0px, transparent 50%), radial-gradient(at 100% 100%, #ffab69 0px, transparent 50%)" }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <Link to="/" className="inline-flex items-center text-sm text-on-surface-variant hover:text-primary mb-6 gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Retour à la connexion
        </Link>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary shadow-lg mb-4">
            <span className="text-on-primary font-black text-2xl tracking-tighter">SAS</span>
          </div>
          <h2 className="font-h2 text-h2 text-primary">Inscription Étudiant</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">Amicale UCAB Dakar</p>
        </div>

        <div className="bg-surface-container-lowest py-8 px-6 shadow-sm border border-outline-variant rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-error-container border-l-4 border-error p-4 rounded-r text-sm text-on-error-container font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-error">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-surface-container border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-outline text-3xl">add_a_photo</span>
                  )}
                </div>
                <span className="block text-center text-xs text-on-surface-variant mt-2 font-medium">Photo (optionnel)</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">
                Numéro carte étudiant <span className="text-error">*</span>
              </label>
              <input type="text" required value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="EX: 20260001" />
              <p className="text-[11px] text-outline mt-1">Email de connexion généré : <span className="font-mono">{cardNumber || "..."}@etudiant.ucab.sn</span></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">Nom <span className="text-error">*</span></label>
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">Prénom(s) <span className="text-error">*</span></label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
              </div>
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">Date de naissance</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">Filière <span className="text-error">*</span></label>
                <select value={filiere} onChange={(e) => { setFiliere(e.target.value); setNiveau(""); }} required
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                  <option value="">Sélectionner...</option>
                  {filieres.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">Niveau <span className="text-error">*</span></label>
                <select value={niveau} onChange={(e) => setNiveau(e.target.value)} required
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                  <option value="">Sélectionner...</option>
                  {niveaux.map((lvl: string) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">Mot de passe <span className="text-error">*</span></label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5">Confirmer <span className="text-error">*</span></label>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 bg-primary text-on-primary font-semibold rounded-lg shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50">
              {loading ? (
                <span className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
              ) : (
                <>
                  <span className="material-symbols-outlined">person_add</span>
                  <span className="ml-2">S'inscrire</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
