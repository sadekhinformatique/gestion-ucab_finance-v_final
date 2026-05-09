import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

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
  const canPost = profile && ["Admin", "Trésorier", "Président", "Presidente", "Commissaire"].includes(profile.role);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("Tout");
  const [page, setPage] = useState(1);
  const itemsPerPage = 4;
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
      await supabase.from("announcements").insert({
        title, content, image_url: imageUrl || null, pinned, created_by: profile?.id,
      });
      setTitle(""); setContent(""); setImageUrl(""); setPinned(false); setShowForm(false);
      fetchAnnouncements();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    fetchAnnouncements();
  };

  const filteredByCategory = announcements.filter((a) => filter === "Tout" || a.title.includes(filter) || a.content.includes(filter));
  const pinnedItems = filteredByCategory.filter((a) => a.pinned);
  const regularItems = filteredByCategory.filter((a) => !a.pinned);
  const totalPages = Math.ceil(regularItems.length / itemsPerPage) || 1;
  const paginatedRegular = regularItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-gutter">
      <div className="flex justify-between items-end mb-stack-lg border-b border-outline-variant pb-stack-md">
        <div className="space-y-unit">
          <h2 className="font-h1 text-h1 text-primary">Actualités & Publications</h2>
          <p className="font-body-md text-on-surface-variant">
            Suivez les dernières nouvelles de l'Amicale et les communications institutionnelles.
          </p>
        </div>
        {canPost && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-secondary text-on-secondary px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
          >
            <span className="material-symbols-outlined">add</span>
            {showForm ? "Fermer" : "Nouvelle publication"}
          </button>
        )}
      </div>

      {canPost && showForm && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-stack-lg">
          <h3 className="font-h3 text-h3 text-primary mb-4">Nouvelle publication</h3>
          {error && <div className="mb-3 text-sm text-on-error-container bg-error-container p-3 rounded">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Titre</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Contenu</label>
              <textarea required rows={4} value={content} onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Image (URL)</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary" />
              <span className="font-medium text-on-surface">Épingler en haut</span>
            </label>
            <button type="submit" disabled={saving}
              className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50">
              {saving ? <span className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full inline-block" /> : "Publier"}
            </button>
          </form>
        </div>
      )}

      <div className="flex justify-between items-center mb-stack-lg bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex gap-4">
          {["Tout", "Finances", "Événements", "Institutions"].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`font-label-caps py-1 cursor-pointer transition-colors ${filter === f ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full inline-block" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 opacity-50">newspaper</span>
          <p className="font-medium">Aucune actualité pour le moment</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-gutter">
            {pinnedItems.length > 0 && (
              <article className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex flex-col md:flex-row h-full">
                  <div className="md:w-1/2 h-64 md:h-auto relative overflow-hidden bg-surface-container">
                    {pinnedItems[0].image_url ? (
                      <img src={pinnedItems[0].image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-6xl">newspaper</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-primary text-on-primary font-label-caps px-3 py-1 rounded-full uppercase text-[10px]">À la une</div>
                  </div>
                  <div className="md:w-1/2 p-stack-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-on-surface-variant font-label-caps mb-unit">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {new Date(pinnedItems[0].created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <h3 className="font-h2 text-h2 text-primary mb-stack-sm leading-tight">{pinnedItems[0].title}</h3>
                      <p className="font-body-md text-on-surface-variant line-clamp-3 mb-stack-md">{pinnedItems[0].content}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-xs">
                          {profile?.first_name?.[0] || "S"}
                        </div>
                        <span className="font-body-sm font-semibold">Bureau</span>
                      </div>
                      {canPost && (
                        <button onClick={() => handleDelete(pinnedItems[0].id)} className="text-on-surface-variant hover:text-error transition-colors">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )}

            {paginatedRegular.map((a) => (
              <article key={a.id} className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="h-48 overflow-hidden bg-surface-container">
                  {a.image_url ? (
                    <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined text-5xl">article</span>
                    </div>
                  )}
                </div>
                <div className="p-stack-md flex-grow flex flex-col">
                  <div className="flex items-center gap-2 text-on-surface-variant font-label-caps mb-unit text-[12px]">
                    <span className="material-symbols-outlined text-[14px]">history</span>
                    {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </div>
                  <h4 className="font-h3 text-h3 text-primary mb-unit">{a.title}</h4>
                  <p className="font-body-sm text-on-surface-variant line-clamp-2 mb-stack-md flex-grow">{a.content}</p>
                  <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                    <span className="font-body-sm text-on-surface-variant">Bureau</span>
                    {canPost && (
                      <button onClick={() => handleDelete(a.id)} className="text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-stack-lg flex justify-center items-center gap-stack-sm">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i + 1} onClick={() => setPage(i + 1)} className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-colors ${page === i + 1 ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
