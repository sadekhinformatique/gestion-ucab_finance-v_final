import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../lib/supabase";
import { Camera, Save, Loader2, Key, Upload, Clock, CheckCircle, XCircle } from "lucide-react";

export default function MonProfil() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filieres, setFilieres] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name || "");
    setLastName(profile.last_name || "");
    setFiliere(profile.filiere || "");
    setNiveau(profile.niveau || "");
    setBirthDate(profile.birth_date || "");
    setPhotoUrl(profile.photo_url || null);

    Promise.all([
      supabase.from("filieres").select("*").order("name"),
      supabase.from("publications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false })
    ]).then(([filRes, pubRes]) => {
      if (filRes.data) setFilieres(filRes.data);
      if (pubRes.data) setPublications(pubRes.data);
      setLoading(false);
    });
  }, [profile]);

  const selectedFiliere = filieres.find(f => f.name === filiere);
  const niveaux = selectedFiliere?.niveaux || [];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024 || !file.type.startsWith("image/")) {
      setError("Photo invalide (max 2 Mo, format image)");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setMessage(""); setError("");
    try {
      let newPhotoUrl = photoUrl;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const filePath = `${profile.id}/profile.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('profile_photos').upload(filePath, photoFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
          newPhotoUrl = publicUrl;
        }
      }
      const { error: updErr } = await supabase.from("profiles").update({
        first_name: firstName, last_name: lastName, filiere, niveau,
        birth_date: birthDate || null, photo_url: newPhotoUrl,
      }).eq("id", profile.id);
      if (updErr) throw updErr;
      setPhotoUrl(newPhotoUrl); setPhotoFile(null); setPhotoPreview(null);
      setMessage("Profil mis à jour");
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true); setPwdMessage("");
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile?.card_number ? `${profile.card_number.toLowerCase()}@etudiant.ucab.sn` : "",
        password: oldPassword,
      });
      if (signInErr) throw new Error("Ancien mot de passe incorrect");
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;
      setPwdMessage("Mot de passe changé !");
      setOldPassword(""); setNewPassword(""); setShowPwdForm(false);
    } catch (err: any) {
      setPwdMessage(err.message);
    } finally { setPwdSaving(false); }
  };

  if (!profile) return null;
  const displayPhoto = photoPreview || photoUrl;
  const statusBadge = (s: string) => {
    if (s === 'approved') return <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold rounded"><CheckCircle className="w-3 h-3 mr-1" />Publié</span>;
    if (s === 'rejected') return <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 text-[10px] font-bold rounded"><XCircle className="w-3 h-3 mr-1" />Rejeté</span>;
    return <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 text-[10px] font-bold rounded"><Clock className="w-3 h-3 mr-1" />En attente</span>;
  };

  if (loading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin inline text-slate-400" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-black text-slate-800">Mon Profil</h2>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {message && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 p-3 rounded">{message}</div>}
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group-hover:border-[#1e2a5e] transition-colors">
                {displayPhoto ? <img src={displayPhoto} alt="" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-slate-400" />}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase text-slate-600">Nom</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2" /></div>
            <div><label className="text-xs font-bold uppercase text-slate-600">Prénom(s)</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase text-slate-600">Filière</label><select value={filiere} onChange={e => { setFiliere(e.target.value); setNiveau(""); }} className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2">{filieres.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}</select></div>
            <div><label className="text-xs font-bold uppercase text-slate-600">Niveau</label><select value={niveau} onChange={e => setNiveau(e.target.value)} className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2">{niveaux.map((l: string) => <option key={l} value={l}>{l}</option>)}</select></div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-600">Date de naissance</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded">
            <span className="font-bold uppercase">Carte :</span> {profile.card_number || "—"}<br />
            <span className="font-bold uppercase">Rôle :</span> {profile.role}<br />
            <span className="font-bold uppercase">Email :</span> {profile.card_number ? `${profile.card_number.toLowerCase()}@etudiant.ucab.sn` : "—"}
          </div>
          <button type="submit" disabled={saving} className="w-full flex justify-center items-center py-2.5 bg-[#1e2a5e] text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <button onClick={() => setShowPwdForm(!showPwdForm)} className="flex items-center text-sm font-bold text-slate-700 hover:text-[#1e2a5e]">
          <Key className="w-4 h-4 mr-2" /> Changer le mot de passe
        </button>
        {showPwdForm && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            {pwdMessage && <div className={`text-sm p-3 rounded ${pwdMessage.includes("incorrect") || pwdMessage.includes("Erreur") ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{pwdMessage}</div>}
            <input type="password" placeholder="Ancien mot de passe" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="w-full border border-slate-200 rounded text-sm px-3 py-2" />
            <input type="password" placeholder="Nouveau mot de passe (min 6 car.)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="w-full border border-slate-200 rounded text-sm px-3 py-2" />
            <button type="submit" disabled={pwdSaving} className="px-4 py-2 bg-[#1e2a5e] text-white text-sm font-bold rounded-lg">{pwdSaving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Changer le mot de passe"}</button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700">Mes publications</h3>
        </div>
        {publications.length === 0 ? (
          <div className="p-5 text-center text-slate-400 text-sm">Aucune publication pour le moment</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {publications.map(p => (
              <div key={p.id} className="p-4">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-slate-700">{p.content}</p>
                  {statusBadge(p.status)}
                </div>
                {p.image_url && <img src={p.image_url} alt="" className="mt-2 h-20 rounded object-cover" />}
                {p.rejected_reason && <p className="mt-1 text-xs text-red-500">Motif : {p.rejected_reason}</p>}
                <p className="mt-1 text-[10px] text-slate-400">{new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
