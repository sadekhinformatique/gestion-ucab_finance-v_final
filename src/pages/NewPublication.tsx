import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

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
        const ext = imageFile.name.split(".").pop();
        const filePath = `publications/${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("profile_photos").upload(filePath, imageFile);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("profile_photos").getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
      }
      await supabase.from("publications").insert({ user_id: profile.id, content, image_url: imageUrl, status: "pending" });
      setSuccess(true);
    } catch (err: any) { setError(err.message || "Erreur lors de l'envoi"); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary-fixed/40 mb-6">
          <span className="material-symbols-outlined text-3xl text-on-tertiary-fixed-variant">check_circle</span>
        </div>
        <h2 className="font-h2 text-h2 text-primary">Publication envoyée !</h2>
        <p className="mt-2 text-on-surface-variant">Elle sera visible après validation par un administrateur.</p>
        <button onClick={() => navigate("/mon-profil")}
          className="mt-6 px-6 py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all">
          Voir mes publications
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-gutter">
      <div className="border-b border-outline-variant pb-stack-md">
        <h2 className="font-h1 text-h1 text-primary">Nouvelle publication</h2>
        <p className="font-body-md text-on-surface-variant">Partagez une information avec la communauté. Un administrateur la validera avant publication.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-lg">
        {error && <div className="mb-4 text-sm text-on-error-container bg-error-container p-3 rounded flex items-center gap-2"><span className="material-symbols-outlined text-sm">error</span>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea rows={5} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Écrivez votre publication..."
            className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none" />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-primary text-sm transition-colors">
              <span className="material-symbols-outlined">image</span>
              <span>{imageFile ? imageFile.name : "Ajouter une image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
            {imagePreview && <img src={imagePreview} alt="" className="h-10 w-10 rounded object-cover border border-outline-variant" />}
          </div>

          <button type="submit" disabled={loading || !content.trim()}
            className="w-full flex justify-center items-center py-3.5 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 gap-2">
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
            ) : (
              <><span className="material-symbols-outlined">send</span> Publier</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
