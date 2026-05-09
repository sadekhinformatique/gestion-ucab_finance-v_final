import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Send, Loader2, ArrowLeft, Users, MessageSquare, Image, CheckCircle, XCircle, Clock } from "lucide-react";

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
  const [tab, setTab] = useState<'publications' | 'members'>('publications');

  const isGroupAdmin = () => members.some(m => m.user_id === profile?.id && m.role === 'admin_groupe');
  const isAdmin = profile?.role?.toLowerCase() === 'admin';

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
        const ext = imageFile.name.split('.').pop();
        const filePath = `groupes/${id}/${profile.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('profile_photos').upload(filePath, imageFile);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
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

  const moderate = async (pubId: number, status: 'approved' | 'rejected', reason?: string) => {
    const upd: any = { status };
    if (status === 'approved') upd.published_at = new Date().toISOString();
    if (reason) upd.rejected_reason = reason;
    await supabase.from("publications_groupes").update(upd).eq("id", pubId);
    fetchData();
  };

  if (loading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin inline text-slate-400" /></div>;
  if (!groupe) return <div className="text-center py-12 text-slate-400">Groupe introuvable</div>;

  const canModerate = isAdmin || isGroupAdmin();
  const displayedPubs = publications.filter(p => p.status === 'approved' || p.user_id === profile?.id || canModerate);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/mes-groupes" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4 mr-1" /> Mes groupes
      </Link>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-800">{groupe.name}</h2>
        <p className="text-sm text-slate-500">{groupe.type === 'filiere' ? 'Filière' : 'Niveau'}{groupe.description ? ` • ${groupe.description}` : ''}</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button onClick={() => setTab('publications')} className={`px-4 py-3 text-sm font-bold border-b-2 ${tab === 'publications' ? 'border-[#1e2a5e] text-[#1e2a5e]' : 'border-transparent text-slate-500'}`}><MessageSquare className="w-4 h-4 inline mr-1" />Publications</button>
        <button onClick={() => setTab('members')} className={`px-4 py-3 text-sm font-bold border-b-2 ${tab === 'members' ? 'border-[#1e2a5e] text-[#1e2a5e]' : 'border-transparent text-slate-500'}`}><Users className="w-4 h-4 inline mr-1" />Membres ({members.length})</button>
      </div>

      {tab === 'publications' && (
        <>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <form onSubmit={handlePost} className="space-y-3">
              <textarea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="Écrire dans le groupe..."
                className="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 resize-none" />
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-slate-500 cursor-pointer hover:text-[#1e2a5e]">
                  <Image className="w-4 h-4" /><span>{imageFile ? imageFile.name : "Image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setImageFile(f); }} />
                </label>
                <button type="submit" disabled={posting || !content.trim()}
                  className="inline-flex items-center px-4 py-2 bg-[#1e2a5e] text-white text-xs font-bold rounded-lg disabled:opacity-50">
                  {posting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />} Publier
                </button>
              </div>
            </form>
          </div>

          {displayedPubs.length === 0 ? (
            <div className="text-center py-8 text-slate-400"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Aucune publication</p></div>
          ) : (
            displayedPubs.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[9px] font-bold">{p.profiles?.first_name?.[0] || 'U'}</div>
                  <span className="text-xs font-bold text-slate-700">{p.profiles?.first_name} {p.profiles?.last_name}</span>
                  <span className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                  {p.status !== 'approved' && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{p.status === 'pending' ? 'En attente' : 'Rejeté'}</span>
                  )}
                </div>
                <p className="text-sm text-slate-700">{p.content}</p>
                {p.image_url && <img src={p.image_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
                {canModerate && p.status === 'pending' && (
                  <div className="mt-3 flex space-x-2">
                    <button onClick={() => moderate(p.id, 'approved')} className="text-xs px-3 py-1 bg-emerald-600 text-white rounded font-bold">Approuver</button>
                    <button onClick={() => { const r = prompt("Motif du rejet :"); if (r) moderate(p.id, 'rejected', r); }} className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded font-bold">Rejeter</button>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {tab === 'members' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {members.map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold overflow-hidden">
                  {m.profiles?.photo_url ? <img src={m.profiles.photo_url} alt="" className="w-full h-full object-cover" /> : (m.profiles?.first_name?.[0] || 'U')}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{m.profiles?.first_name} {m.profiles?.last_name}</p>
                  <p className="text-[11px] text-slate-400">{m.profiles?.card_number}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded ${m.role === 'admin_groupe' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                {m.role === 'admin_groupe' ? 'Responsable' : 'Membre'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
