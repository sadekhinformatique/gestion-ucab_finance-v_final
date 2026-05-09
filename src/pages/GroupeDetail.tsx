import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

export default function GroupeDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [groupe, setGroupe] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState<"publications" | "members">("publications");

  const isGroupAdmin = () => members.some((m) => m.user_id === profile?.id && m.role === "admin_groupe");
  const isAdmin = profile?.role?.toLowerCase() === "admin";

  const fetchData = async () => {
    if (!id) return;
    const [gRes, mRes, pRes] = await Promise.all([
      supabase.from("groupes").select("*").eq("id", id).single(),
      supabase.from("membres_groupes").select("user_id, role, profiles!inner(first_name, last_name, photo_url, card_number)").eq("groupe_id", id),
      supabase.from("publications_groupes").select("*, profiles!publications_groupes_user_id_fkey(first_name, last_name, photo_url)").eq("groupe_id", id).order("created_at", { ascending: false }),
    ]);
    if (gRes.data) setGroupe(gRes.data);
    if (mRes.data) setMembers(mRes.data);
    if (pRes.data) setPublications(pRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const filePath = `groupes/${id}/${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("profile_photos").upload(filePath, imageFile);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("profile_photos").getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
      }
      await supabase.from("publications_groupes").insert({
        user_id: profile.id, groupe_id: parseInt(id), content, image_url: imageUrl,
        status: isAdmin || isGroupAdmin() ? "approved" : "pending",
      });
      setContent(""); setImageFile(null);
      fetchData();
    } finally { setPosting(false); }
  };

  const moderate = async (pubId: number, status: "approved" | "rejected", reason?: string) => {
    const upd: any = { status };
    if (status === "approved") upd.published_at = new Date().toISOString();
    if (reason) upd.rejected_reason = reason;
    await supabase.from("publications_groupes").update(upd).eq("id", pubId);
    fetchData();
  };

  if (loading) return <div className="text-center py-12"><span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full inline-block" /></div>;
  if (!groupe) return <div className="text-center py-12 text-on-surface-variant">Groupe introuvable</div>;

  const canModerate = isAdmin || isGroupAdmin();
  const displayedPubs = publications.filter((p) => p.status === "approved" || p.user_id === profile?.id || canModerate);

  return (
    <div className="space-y-gutter">
      <Link to="/mes-groupes" className="inline-flex items-center text-sm text-on-surface-variant hover:text-primary gap-1 transition-colors">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Mes groupes
      </Link>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-primary to-primary-container relative">
          <div className="absolute bottom-4 left-6">
            <h2 className="font-h1 text-h1 text-on-primary">{groupe.name}</h2>
            <p className="text-on-primary-container font-label-caps uppercase text-[12px]">
              {groupe.type === "filiere" ? "Filière" : "Niveau"}
              {groupe.description ? ` • ${groupe.description}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-outline-variant">
        <button onClick={() => setTab("publications")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${tab === "publications" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
          <span className="material-symbols-outlined text-sm">forum</span>
          <span className="font-label-caps">Publications</span>
        </button>
        <button onClick={() => setTab("members")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${tab === "members" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
          <span className="material-symbols-outlined text-sm">group</span>
          <span className="font-label-caps">Membres ({members.length})</span>
        </button>
      </div>

      {tab === "publications" && (
        <>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4">
            <form onSubmit={handlePost} className="space-y-3">
              <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Écrire dans le groupe..."
                className="w-full bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none" />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-sm">image</span>
                  <span>{imageFile ? imageFile.name : "Image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImageFile(f); }} />
                </label>
                <button type="submit" disabled={posting || !content.trim()}
                  className="inline-flex items-center px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 gap-1">
                  {posting ? <span className="animate-spin w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full" /> : <span className="material-symbols-outlined text-sm">send</span>}
                  Publier
                </button>
              </div>
            </form>
          </div>

          {displayedPubs.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">forum</span>
              <p className="text-sm">Aucune publication</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedPubs.map((p) => (
                <div key={p.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-[9px] font-bold">
                      {p.profiles?.first_name?.[0] || "U"}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-on-surface">{p.profiles?.first_name} {p.profiles?.last_name}</span>
                      <span className="text-[10px] text-outline ml-2">{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    {p.status !== "approved" && (
                      <span className={`text-[10px] font-label-caps px-2 py-0.5 rounded ${p.status === "pending" ? "bg-secondary-fixed text-on-secondary-fixed-variant" : "bg-error-container text-on-error-container"}`}>
                        {p.status === "pending" ? "En attente" : "Rejeté"}
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-on-surface">{p.content}</p>
                  {p.image_url && <img src={p.image_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
                  {canModerate && p.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => moderate(p.id, "approved")}
                        className="text-xs px-3 py-1.5 bg-tertiary text-on-tertiary rounded font-semibold hover:opacity-90 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check</span> Approuver
                      </button>
                      <button onClick={() => { const r = prompt("Motif du rejet :"); if (r) moderate(p.id, "rejected", r); }}
                        className="text-xs px-3 py-1.5 bg-error-container text-on-error-container rounded font-semibold hover:opacity-90 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">close</span> Rejeter
                      </button>
                    </div>
                  )}
                  {p.status === "rejected" && p.rejected_reason && (
                    <p className="mt-2 text-xs text-on-error-container bg-error-container p-2 rounded">Motif : {p.rejected_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "members" && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm divide-y divide-outline-variant">
          {members.map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant text-xs font-bold overflow-hidden">
                  {m.profiles?.photo_url ? (
                    <img src={m.profiles.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    m.profiles?.first_name?.[0] || "U"
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{m.profiles?.first_name} {m.profiles?.last_name}</p>
                  <p className="text-[11px] text-outline">{m.profiles?.card_number}</p>
                </div>
              </div>
              <span className={`text-[10px] font-label-caps px-2 py-1 rounded ${m.role === "admin_groupe" ? "bg-secondary-fixed text-on-secondary-fixed-variant" : "bg-surface-container text-on-surface-variant"}`}>
                {m.role === "admin_groupe" ? "Responsable" : "Membre"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
