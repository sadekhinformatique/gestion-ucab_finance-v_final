import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../lib/supabase";
import { Upload, Save, Loader2, Camera } from "lucide-react";

export default function Profile() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filieres, setFilieres] = useState<any[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setFiliere(profile.filiere || "");
      setNiveau(profile.niveau || "");
      setPhotoUrl(profile.photo_url || null);
    }
    supabase.from("filieres").select("*").order("name").then(({ data }) => {
      if (data) setFilieres(data);
    });
  }, [profile]);

  const selectedFiliere = filieres.find(f => f.name === filiere);
  const niveaux = selectedFiliere?.niveaux || [];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) {
      setError("Photo max 2 Mo");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      let newPhotoUrl = photoUrl;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const filePath = `${profile.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, photoFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newPhotoUrl = publicUrl;
      }

      const { error: updErr } = await supabase.from("profiles").update({
        first_name: firstName,
        last_name: lastName,
        filiere,
        niveau,
        photo_url: newPhotoUrl,
      }).eq("id", profile.id);

      if (updErr) throw updErr;
      setPhotoUrl(newPhotoUrl);
      setPhotoFile(null);
      setPhotoPreview(null);
      setMessage("Profil mis à jour");
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  const displayPhoto = photoPreview || photoUrl;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-black text-slate-800">Mon Profil</h2>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {message && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 p-3 rounded">{message}</div>}
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group-hover:border-[#1e2a5e] transition-colors">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Nom</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Prénom(s)</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Filière</label>
              <select value={filiere} onChange={e => { setFiliere(e.target.value); setNiveau(""); }}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2">
                <option value="">-</option>
                {filieres.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Niveau</label>
              <select value={niveau} onChange={e => setNiveau(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2">
                <option value="">-</option>
                {niveaux.map((lvl: string) => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded">
            <span className="font-bold uppercase">Carte :</span> {profile.card_number || "Non attribuée"}<br />
            <span className="font-bold uppercase">Rôle :</span> {profile.role}<br />
            <span className="font-bold uppercase">Statut :</span> {profile.is_active ? "Actif" : "En attente d'approbation"}
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex justify-center items-center py-2.5 bg-[#1e2a5e] text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
          </button>
        </form>
      </div>
    </div>
  );
}
