import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { logAction } from "../lib/audit";

export default function ValidationPublications() {
  const { profile } = useAuth();
  const canModerate = profile && ["Admin", "Trésorier", "Président", "Presidente", "Commissaire"].includes(profile.role);

  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  const fetchPublications = async () => {
    const { data } = await supabase
      .from("publications")
      .select("*, profiles!publications_user_id_fkey(first_name, last_name, photo_url, card_number)")
      .order("created_at", { ascending: false });
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

  const filtered = publications.filter((p) => p.status === tab);

  if (!canModerate) return <div className="p-8 text-center text-on-surface-variant font-medium">Accès réservé au bureau.</div>;

  return (
    <div className="space-y-gutter">
      <div className="border-b border-outline-variant pb-stack-md">
        <h2 className="font-h1 text-h1 text-primary">Validation des publications</h2>
        <p className="font-body-md text-on-surface-variant">Approuvez ou rejetez les publications des membres</p>
      </div>

      <div className="flex gap-4 border-b border-outline-variant">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
            <span className="font-label-caps">
              {t === "pending" ? "En attente" : t === "approved" ? "Approuvées" : "Rejetées"}
            </span>
            <span className="text-xs bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded">{publications.filter((p) => p.status === t).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full inline-block" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 opacity-50">forum</span>
          <p>Aucune publication</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold uppercase">
                    {p.profiles?.first_name?.[0] || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{p.profiles?.first_name} {p.profiles?.last_name}</p>
                    <p className="text-[10px] text-outline">{p.profiles?.card_number} • {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-label-caps px-2 py-1 rounded-full ${p.status === "approved" ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : p.status === "rejected" ? "bg-error-container text-on-error-container" : "bg-secondary-fixed text-on-secondary-fixed-variant"}`}>
                  {p.status === "approved" ? "Approuvé" : p.status === "rejected" ? "Rejeté" : "En attente"}
                </span>
              </div>
              <p className="text-body-sm text-on-surface">{p.content}</p>
              {p.image_url && <img src={p.image_url} alt="" className="mt-3 rounded-lg max-h-48 object-cover border border-outline-variant" />}

              {p.status === "pending" && (
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => handleApprove(p.id)} disabled={actionLoading === `approve-${p.id}`}
                    className="inline-flex items-center px-4 py-2 bg-tertiary text-on-tertiary text-xs font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 gap-1">
                    {actionLoading === `approve-${p.id}` ? <span className="animate-spin w-3 h-3 border-2 border-on-tertiary border-t-transparent rounded-full" /> : <span className="material-symbols-outlined text-sm">check</span>}
                    Approuver
                  </button>
                  {rejectId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Motif du rejet" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                        className="bg-surface-bright border border-outline-variant rounded text-xs px-2 py-1.5 w-40 focus:ring-2 focus:ring-primary outline-none" />
                      <button onClick={() => handleReject(p.id)} disabled={actionLoading === `reject-${p.id}`}
                        className="px-3 py-1.5 bg-error text-on-error text-xs font-semibold rounded-lg gap-1 flex items-center">
                        {actionLoading === `reject-${p.id}` ? <span className="animate-spin w-3 h-3 border-2 border-on-error border-t-transparent rounded-full" /> : null}
                        Confirmer
                      </button>
                      <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="text-xs text-on-surface-variant">Annuler</button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectId(p.id)}
                      className="inline-flex items-center px-4 py-2 bg-error-container text-on-error-container text-xs font-semibold rounded-lg hover:opacity-90 transition-all gap-1">
                      <span className="material-symbols-outlined text-sm">close</span> Rejeter
                    </button>
                  )}
                </div>
              )}
              {p.status === "rejected" && p.rejected_reason && (
                <p className="mt-2 text-xs text-on-error-container bg-error-container p-2 rounded">Motif : {p.rejected_reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
