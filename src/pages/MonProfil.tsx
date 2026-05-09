import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../lib/supabase";

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
      supabase.from("publications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }),
    ]).then(([filRes, pubRes]) => {
      if (filRes.data) setFilieres(filRes.data);
      if (pubRes.data) setPublications(pubRes.data);
      setLoading(false);
    });
  }, [profile]);

  const selectedFiliere = filieres.find((f) => f.name === filiere);
  const niveaux = selectedFiliere?.niveaux || [];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024 || !file.type.startsWith("image/")) { setError("Photo invalide (max 2 Mo, format image)"); return; }
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
        const ext = photoFile.name.split(".").pop();
        const filePath = `${profile.id}/profile.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("profile_photos").upload(filePath, photoFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("profile_photos").getPublicUrl(filePath);
          newPhotoUrl = publicUrl;
        }
      }
      await supabase.from("profiles").update({
        first_name: firstName, last_name: lastName, filiere, niveau,
        birth_date: birthDate || null, photo_url: newPhotoUrl,
      }).eq("id", profile.id);
      setPhotoUrl(newPhotoUrl); setPhotoFile(null); setPhotoPreview(null);
      setMessage("Profil mis à jour");
    } catch (err: any) { setError(err.message || "Erreur"); }
    finally { setSaving(false); }
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
    } catch (err: any) { setPwdMessage(err.message); }
    finally { setPwdSaving(false); }
  };

  if (!profile) return null;
  const displayPhoto = photoPreview || photoUrl;

  const statusBadge = (s: string) => {
    if (s === "approved") return <span className="inline-flex items-center text-on-tertiary-fixed-variant bg-tertiary-fixed/40 px-2 py-0.5 text-[10px] font-bold rounded"><span className="material-symbols-outlined text-[12px] mr-1">check_circle</span>Publié</span>;
    if (s === "rejected") return <span className="inline-flex items-center text-on-error-container bg-error-container px-2 py-0.5 text-[10px] font-bold rounded"><span className="material-symbols-outlined text-[12px] mr-1">cancel</span>Rejeté</span>;
    return <span className="inline-flex items-center text-on-secondary-fixed-variant bg-secondary-fixed px-2 py-0.5 text-[10px] font-bold rounded"><span className="material-symbols-outlined text-[12px] mr-1">schedule</span>En attente</span>;
  };

  if (loading) return <div className="text-center py-12"><span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full inline-block" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-gutter">
      <div className="border-b border-outline-variant pb-stack-md">
        <h2 className="font-h1 text-h1 text-primary">Mon Profil</h2>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="bg-primary p-6 text-center">
          <label className="relative cursor-pointer group inline-block">
            <div className="w-24 h-24 rounded-full border-4 border-on-primary/30 mx-auto overflow-hidden bg-on-primary/10 flex items-center justify-center">
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-on-primary/70">person</span>
              )}
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100">camera_alt</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
          <h3 className="font-h3 text-h3 text-on-primary mt-3">{firstName} {lastName}</h3>
          <p className="text-on-primary-container font-label-caps uppercase text-[12px]">{profile.role}</p>
        </div>

        <div className="p-stack-lg">
          {message && <div className="mb-4 text-sm text-on-tertiary-fixed-variant bg-tertiary-fixed/30 p-3 rounded flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span>{message}</div>}
          {error && <div className="mb-4 text-sm text-on-error-container bg-error-container p-3 rounded flex items-center gap-2"><span className="material-symbols-outlined text-sm">error</span>{error}</div>}
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Nom</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Prénom(s)</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Filière</label>
                <select value={filiere} onChange={(e) => { setFiliere(e.target.value); setNiveau(""); }}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary outline-none">
                  {filieres.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Niveau</label>
                <select value={niveau} onChange={(e) => setNiveau(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary outline-none">
                  {niveaux.map((l: string) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Date de naissance</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div className="text-xs text-on-surface-variant bg-surface-container p-3 rounded space-y-1">
              <p><span className="font-bold uppercase">Carte :</span> {profile.card_number || "—"}</p>
              <p><span className="font-bold uppercase">Rôle :</span> {profile.role}</p>
              <p><span className="font-bold uppercase">Email :</span> {profile.card_number ? `${profile.card_number.toLowerCase()}@etudiant.ucab.sn` : "—"}</p>
            </div>
            <button type="submit" disabled={saving}
              className="w-full flex justify-center items-center py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 gap-2">
              {saving ? <span className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full" /> : <><span className="material-symbols-outlined">save</span> Enregistrer</>}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-lg">
        <button onClick={() => setShowPwdForm(!showPwdForm)} className="flex items-center gap-2 text-sm font-semibold text-on-surface hover:text-primary transition-colors">
          <span className="material-symbols-outlined">key</span>
          Changer le mot de passe
        </button>
        {showPwdForm && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            {pwdMessage && (
              <div className={`text-sm p-3 rounded flex items-center gap-2 ${pwdMessage.includes("incorrect") || pwdMessage.includes("Erreur") ? "bg-error-container text-on-error-container" : "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant"}`}>
                <span className="material-symbols-outlined text-sm">{pwdMessage.includes("incorrect") || pwdMessage.includes("Erreur") ? "error" : "check_circle"}</span>
                {pwdMessage}
              </div>
            )}
            <input type="password" placeholder="Ancien mot de passe" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required
              className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary outline-none" />
            <input type="password" placeholder="Nouveau mot de passe (min 6 car.)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
              className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary outline-none" />
            <button type="submit" disabled={pwdSaving}
              className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50">
              {pwdSaving ? <span className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full inline-block" /> : "Changer le mot de passe"}
            </button>
          </form>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-stack-lg py-stack-md border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-h3 text-h3 text-primary">Mes publications</h3>
        </div>
        {publications.length === 0 ? (
          <div className="p-5 text-center text-on-surface-variant text-sm">Aucune publication pour le moment</div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {publications.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm text-on-surface">{p.content}</p>
                  {statusBadge(p.status)}
                </div>
                {p.image_url && <img src={p.image_url} alt="" className="mt-2 h-20 rounded object-cover" />}
                {p.rejected_reason && <p className="mt-1 text-xs text-on-error-container bg-error-container p-1.5 rounded">Motif : {p.rejected_reason}</p>}
                <p className="mt-1 text-[10px] text-outline">{new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
