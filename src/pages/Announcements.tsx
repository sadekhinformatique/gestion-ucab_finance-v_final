import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Megaphone, Pin, Plus, X, Loader2 } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  pinned: boolean;
  created_by: string;
  created_at: string;
}

export default function Announcements() {
  const { profile } = useAuth();
  const canPost = profile && ['Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire'].includes(profile.role);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { error: err } = await supabase.from("announcements").insert({
        title, content, image_url: imageUrl || null, pinned, created_by: profile?.id,
      });
      if (err) throw err;
      setTitle(""); setContent(""); setImageUrl(""); setPinned(false); setShowForm(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    fetchAnnouncements();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Actualités</h2>
          <p className="text-sm text-slate-500">Suivez les informations publiées par le bureau</p>
        </div>
        {canPost && (
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 bg-[#1e2a5e] text-white text-xs font-bold rounded-lg hover:opacity-90">
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? "Fermer" : "Publier"}
          </button>
        )}
      </div>

      {canPost && showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4">Nouvelle publication</h3>
          {error && <div className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Titre</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-[#1e2a5e]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Contenu</label>
              <textarea required rows={4} value={content} onChange={e => setContent(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-[#1e2a5e]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Image (URL optionnelle)</label>
              <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-[#1e2a5e]" />
            </div>
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}
                className="rounded border-slate-300 text-[#1e2a5e] focus:ring-[#1e2a5e]" />
              <span className="font-medium text-slate-700">Épingler en haut</span>
            </label>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-[#1e2a5e] text-white text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Publier"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin inline text-slate-400" /></div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Aucune actualité pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${a.pinned ? 'border-[#1e2a5e] ring-1 ring-[#1e2a5e]/20' : 'border-slate-200'}`}>
              {a.pinned && (
                <div className="bg-[#1e2a5e] text-white text-[10px] font-bold uppercase px-4 py-1 flex items-center">
                  <Pin className="w-3 h-3 mr-1" /> Annonce importante
                </div>
              )}
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800">{a.title}</h3>
                  {canPost && (
                    <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-500 ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>
                {a.image_url && (
                  <img src={a.image_url} alt="" className="mt-3 rounded-lg max-h-64 w-full object-cover" />
                )}
                <p className="mt-3 text-[11px] text-slate-400">
                  {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
