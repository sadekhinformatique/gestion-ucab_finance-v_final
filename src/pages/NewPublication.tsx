import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Send, Image, Loader2, CheckCircle } from "lucide-react";

export default function NewPublication() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024 || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true); setError("");

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const filePath = `publications/${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('profile_photos').upload(filePath, imageFile);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
      }

      const { error: insErr } = await supabase.from("publications").insert({
        user_id: profile.id,
        content,
        image_url: imageUrl,
        status: "pending",
      });
      if (insErr) throw insErr;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Publication envoyée !</h2>
        <p className="mt-2 text-slate-500">Elle sera visible après validation par un administrateur.</p>
        <button onClick={() => navigate("/mon-profil")} className="mt-6 px-6 py-3 bg-[#1e2a5e] text-white font-bold rounded-lg">Voir mes publications</button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-black text-slate-800">Nouvelle publication</h2>
      <p className="text-sm text-slate-500">Partagez une information avec la communauté. Un administrateur la validera avant publication.</p>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea rows={5} required value={content} onChange={e => setContent(e.target.value)} placeholder="Écrivez votre publication..."
            className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-[#1e2a5e] resize-none" />

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-500 hover:text-[#1e2a5e] text-sm">
              <Image className="w-5 h-5" />
              <span>{imageFile ? imageFile.name : "Ajouter une image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
            {imagePreview && <img src={imagePreview} alt="" className="h-10 w-10 rounded object-cover" />}
          </div>

          <button type="submit" disabled={loading || !content.trim()}
            className="w-full flex justify-center items-center py-3 bg-[#1e2a5e] text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Publier</>}
          </button>
        </form>
      </div>
    </div>
  );
}
