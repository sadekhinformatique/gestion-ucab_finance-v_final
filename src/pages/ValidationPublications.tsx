import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { CheckCircle, XCircle, Clock, Loader2, MessageSquare } from "lucide-react";
import { logAction } from "../lib/audit";

export default function ValidationPublications() {
  const { profile } = useAuth();
  const canModerate = profile && ['Admin', 'Trésorier', 'Président', 'Presidente', 'Commissaire'].includes(profile.role);

  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const fetchPublications = async () => {
    const { data } = await supabase.from("publications").select("*, profiles!publications_user_id_fkey(first_name, last_name, photo_url, card_number)").order("created_at", { ascending: false });
    if (data) setPublications(data);
    setLoading(false);
  };

  useEffect(() => { fetchPublications(); }, []);

  const handleApprove = async (id: number) => {
    setActionLoading(`approve-${id}`);
    try {
      await supabase.from("publications").update({ status: "approved", published_at: new Date().toISOString() }).eq("id", id);
      await logAction(profile?.id, "approbation_publication", { publication_id: id });
      fetchPublications();
    } finally { setActionLoading(null); }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) return;
    setActionLoading(`reject-${id}`);
    try {
      await supabase.from("publications").update({ status: "rejected", rejected_reason: rejectReason }).eq("id", id);
      await logAction(profile?.id, "rejet_publication", { publication_id: id, reason: rejectReason });
      setRejectId(null); setRejectReason("");
      fetchPublications();
    } finally { setActionLoading(null); }
  };

  const filtered = publications.filter(p => p.status === tab);

  if (!canModerate) return <div className="p-8 text-center text-slate-500 font-medium">Accès réservé au bureau.</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-800">Validation des publications</h2>

      <div className="flex space-x-2 border-b border-slate-200">
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${tab === t ? 'border-[#1e2a5e] text-[#1e2a5e]' : 'border-transparent text-slate-500'}`}>
            {t === 'pending' ? 'En attente' : t === 'approved' ? 'Approuvées' : 'Rejetées'}
            <span className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{publications.filter(p => p.status === t).length}</span>
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin inline text-slate-400" /></div>
      : filtered.length === 0 ? <div className="text-center py-12 text-slate-400"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Aucune publication</p></div>
      : <div className="space-y-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold uppercase">{p.profiles?.first_name?.[0] || 'U'}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{p.profiles?.first_name} {p.profiles?.last_name}</p>
                    <p className="text-[10px] text-slate-400">{p.profiles?.card_number} • {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {p.status === 'approved' ? 'Approuvé' : p.status === 'rejected' ? 'Rejeté' : 'En attente'}
                </span>
              </div>
              <p className="text-sm text-slate-700">{p.content}</p>
              {p.image_url && <img src={p.image_url} alt="" className="mt-3 rounded-lg max-h-48 object-cover" />}

              {p.status === 'pending' && (
                <div className="mt-4 flex items-center space-x-2">
                  <button onClick={() => handleApprove(p.id)} disabled={actionLoading === `approve-${p.id}`}
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                    {actionLoading === `approve-${p.id}` ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />} Approuver
                  </button>
                  {rejectId === p.id ? (
                    <div className="flex items-center space-x-2">
                      <input type="text" placeholder="Motif du rejet" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        className="border border-slate-200 rounded text-xs px-2 py-1.5 w-40" />
                      <button onClick={() => handleReject(p.id)} disabled={actionLoading === `reject-${p.id}`}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg">Confirmer</button>
                      <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="text-xs text-slate-400">Annuler</button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectId(p.id)} className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200">
                      <XCircle className="w-3 h-3 mr-1" /> Rejeter
                    </button>
                  )}
                </div>
              )}
              {p.status === 'rejected' && p.rejected_reason && (
                <p className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded">Motif : {p.rejected_reason}</p>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
