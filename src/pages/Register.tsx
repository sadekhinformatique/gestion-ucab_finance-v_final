import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Loader2, Upload, CheckCircle, ArrowLeft } from "lucide-react";
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

  const selectedFiliere = filieres.find(f => f.name === filiere);
  const niveaux = selectedFiliere?.niveaux || [];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("La photo ne doit pas dépasser 2 Mo");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    try {
      const cardTrimmed = cardNumber.trim();

      const { data: existing } = await supabase
        .from("profiles")
        .select("card_number")
        .eq("card_number", cardTrimmed)
        .maybeSingle();
      if (existing) {
        throw new Error("Ce numéro de carte est déjà utilisé");
      }

      const email = `${cardTrimmed.toLowerCase()}@etudiant.ucab.sn`;

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const filePath = `${authData.user.id}/profile.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('profile_photos')
          .upload(filePath, photoFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(filePath);
          photo_url = publicUrl;
        }
      }

      const { error: insErr } = await supabase.from("profiles").upsert({
        id: authData.user.id,
        card_number: cardTrimmed,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate || null,
        filiere,
        niveau,
        photo_url,
        role: "Membre",
        is_active: true,
      });
      if (insErr) throw insErr;

      setRegistered(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Inscription réussie !</h2>
          <p className="mt-3 text-slate-500">
            Votre compte a été créé. Vous pouvez dès maintenant vous connecter avec votre numéro de carte et votre mot de passe.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Email de connexion : <span className="font-mono font-bold">{cardNumber.toLowerCase()}@etudiant.ucab.sn</span>
          </p>
          <div className="mt-8 space-y-3">
            <Link to="/" className="block w-full py-3 px-4 bg-[#1e2a5e] text-white font-bold rounded-lg hover:opacity-90">
              Aller à la connexion
            </Link>
            <Link to="/actualites-publiques" className="block w-full py-3 px-4 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50">
              Voir les actualités
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la connexion
        </Link>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#1e2a5e] shadow-lg mb-4">
            <span className="text-white font-black text-2xl tracking-tighter">SAS</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800">Inscription Étudiant</h2>
          <p className="mt-1 text-sm text-slate-500">Amicale UCAB Dakar</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group-hover:border-[#1e2a5e] transition-colors">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <span className="block text-center text-xs text-slate-500 mt-2 font-medium">Photo (optionnel)</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Numéro carte étudiant <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]"
                placeholder="EX: 20260001" />
              <p className="text-[11px] text-slate-400 mt-1">Email de connexion généré : <span className="font-mono">{cardNumber || "..."}@etudiant.ucab.sn</span></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nom <span className="text-red-500">*</span></label>
                <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Prénom(s) <span className="text-red-500">*</span></label>
                <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Date de naissance</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Filière <span className="text-red-500">*</span></label>
                <select value={filiere} onChange={e => { setFiliere(e.target.value); setNiveau(""); }} required
                  className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]">
                  <option value="">Sélectionner...</option>
                  {filieres.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Niveau <span className="text-red-500">*</span></label>
                <select value={niveau} onChange={e => setNiveau(e.target.value)} required
                  className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]">
                  <option value="">Sélectionner...</option>
                  {niveaux.map((lvl: string) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mot de passe <span className="text-red-500">*</span></label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6}
                  className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Confirmer <span className="text-red-500">*</span></label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6}
                  className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-[#1e2a5e]" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 bg-[#1e2a5e] text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5 mr-2" /> S'inscrire</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
