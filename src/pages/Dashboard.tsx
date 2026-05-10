import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import type { RealtimeChannel } from "@supabase/supabase-js";

export default function Dashboard() {
  const { profile } = useAuth();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [solde, setSolde] = useState(0);
  const [depenses, setDepenses] = useState(0);
  const [membresCount, setMembresCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (amt: number) => new Intl.NumberFormat("fr-SN", { maximumFractionDigits: 0 }).format(amt) + " FCFA";

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: txs, error: txError } = await supabase
        .from("transactions").select("*").order("created_at", { ascending: false });
      if (txError) throw txError;
      if (txs) {
        setTransactions(txs.slice(0, 5).map((t) => ({
          id: t.id, name: t.description || t.titre || t.libelle || "Transaction",
          amount: Number(t.montant || t.amount || 0),
          category: t.categorie || t.category || (t.type === "entree" || t.type === "recette" ? "ENTREE" : "SORTIE"),
          status: t.statut || t.status || "En attente",
          income: t.type === "entree" || t.type === "recette",
          date: new Date(t.created_at || t.date || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        })));
        let totalS = 0, totalD = 0;
        txs.forEach((t) => {
          const status = t.statut || t.status;
          const isApproved = status === "approved" || status === "validated_president" || status === "converted";
          if (isApproved) {
            const amt = Number(t.montant || t.amount || 0);
            if (t.type === "entree" || t.type === "recette") totalS += amt;
            else { totalS -= amt; totalD += amt; }
          }
        });
        setSolde(totalS);
        setDepenses(totalD);
      }
      if (profile?.id) {
        const { data: alts } = await supabase
          .from("notifications").select("*").eq("user_id", profile.id).eq("is_read", false)
          .order("created_at", { ascending: false }).limit(5);
        if (alts) setAlerts(alts.map((a) => ({
          id: a.id, title: a.title || "Notification", message: a.content || a.message,
          link: a.link, date: new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        })));
      }
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true);
      if (count !== null) setMembresCount(count);
    } catch (err: any) {
      console.error("Erreur chargement données dashboard:", err);
      setError("Impossible de charger les données du tableau de bord.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();

    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    const transactionsCh = supabase
      .channel("public:transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadData())
      .subscribe();
    channelsRef.current.push(transactionsCh);

    if (profile?.id) {
      const notifsCh = supabase
        .channel(`public:notifications:user_id=${profile.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }, () => loadData())
        .subscribe();
      channelsRef.current.push(notifsCh);
    }

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [profile?.id]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const isFinancialAdmin = profile?.role?.toLowerCase() === "admin" || profile?.role?.toLowerCase() === "trésorier" || profile?.role?.toLowerCase() === "président" || profile?.role?.toLowerCase() === "presidente";

  const statusBadge = (status: string) => {
    if (status === "approved" || status === "validated_president" || status === "converted")
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-tertiary-fixed/40 text-on-tertiary-fixed-variant">Validé</span>;
    if (status === "rejected")
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-error-container text-on-error-container">Refusé</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-secondary-fixed/60 text-on-secondary-fixed-variant">En attente</span>;
  };

  return (
    <div className="space-y-gutter">
      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-xl border border-error/20">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="md:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-lg flex flex-col justify-between relative">
          {loading && <div className="absolute inset-0 bg-surface-container-lowest/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl"><span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>}
          <div>
            <p className="font-label-caps text-on-surface-variant mb-unit">SOLDE TOTAL DISPONIBLE</p>
            <h2 className="font-h1 text-h1 text-primary">{formatAmount(solde)}</h2>
            <div className="flex items-center gap-unit mt-unit">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded text-[12px] font-semibold flex items-center">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> En direct
              </span>
              <span className="text-body-sm text-on-surface-variant">{membresCount} membres actifs</span>
            </div>
          </div>
          <div className="mt-stack-lg flex gap-stack-md">
            <a href="/nouvelle-demande"
              className="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm">
              <span className="material-symbols-outlined">add</span>
              Nouvelle Demande
            </a>
            {isFinancialAdmin && (
              <a href="/nouvelle-entree"
                className="border-2 border-primary text-primary px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-surface-container transition-all">
                <span className="material-symbols-outlined">payments</span>
                Enregistrer Entrée
              </a>
            )}
          </div>
        </div>

        <div className="md:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-lg relative">
          {loading && <div className="absolute inset-0 bg-surface-container-lowest/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl"><span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>}
          <div className="flex items-center justify-between mb-stack-md">
            <h3 className="font-h3 text-h3">Alertes & Actions</h3>
            {alerts.length > 0 && (
              <span className="bg-error text-on-error w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-bold">{alerts.length}</span>
            )}
          </div>
          <div className="space-y-stack-md max-h-[300px] overflow-y-auto">
            {alerts.length === 0 && !loading && (
              <p className="text-body-sm text-on-surface-variant text-center py-4">Vous n'avez aucune notification non lue.</p>
            )}
            {alerts.map((a) => (
              <div key={a.id} className="flex gap-stack-sm p-stack-sm bg-error-container rounded-lg border border-error/10">
                <span className="material-symbols-outlined text-error shrink-0">priority_high</span>
                <div className="flex-1">
                  <p className="text-body-sm font-semibold text-on-error-container">{a.title}</p>
                  <p className="text-[12px] text-on-error-container">{a.message}</p>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => markAsRead(a.id)} className="text-[10px] font-bold text-on-error-container hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check</span> Marquer lue
                    </button>
                    {a.link && (
                      <a href={a.link} onClick={() => markAsRead(a.id)} className="text-[10px] font-bold text-on-error-container hover:underline">
                        Voir détail
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-lg">
          <div className="flex items-center justify-between mb-stack-lg">
            <div>
              <h3 className="font-h3 text-h3">Flux de Trésorerie</h3>
              <p className="text-body-sm text-on-surface-variant">Revenus vs Dépenses</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-end gap-4 px-4 pb-4 border-b border-l border-outline-variant">
            {(() => {
            const monthLabels = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN"];
            const monthlyData = monthLabels.map((_, i) => {
              const monthTransactions = transactions.filter(t => {
                const d = new Date(t.date || Date.now());
                return d.getMonth() === i;
              });
              const rev = monthTransactions.filter(t => t.income).reduce((s, t) => s + t.amount, 0);
              const dep = monthTransactions.filter(t => !t.income).reduce((s, t) => s + t.amount, 0);
              return { rev, dep };
            });
            const maxVal = Math.max(...monthlyData.flatMap(d => [d.rev, d.dep]), 1);
            return monthLabels.map((m, i) => {
              const revH = (monthlyData[i].rev / maxVal) * 90;
              const depH = (monthlyData[i].dep / maxVal) * 90;
              return (
                <div key={m} className="flex-1 flex flex-col justify-end gap-1 group relative">
                  <div className="bg-primary w-full rounded-t transition-all" style={{ height: `${Math.max(revH, 2)}%` }} />
                  <div className="bg-secondary-container w-full rounded-t transition-all" style={{ height: `${Math.max(depH, 2)}%` }} />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-label-caps text-on-surface-variant">{m}</span>
                </div>
              );
            });
          })()}
          </div>
          <div className="flex gap-stack-lg mt-12 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-sm" />
              <span className="text-[12px] font-label-caps text-on-surface-variant">Revenus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-secondary-container rounded-sm" />
              <span className="text-[12px] font-label-caps text-on-surface-variant">Dépenses</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-gutter">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-md flex items-center gap-stack-md">
            <div className="w-12 h-12 bg-tertiary-fixed/20 rounded-full flex items-center justify-center text-on-tertiary-fixed-variant">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div>
              <p className="text-[12px] font-label-caps text-on-surface-variant">SOLDE ACTUEL</p>
              <p className="font-h3 text-h3">{formatAmount(solde)}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-md flex items-center gap-stack-md">
            <div className="w-12 h-12 bg-secondary-fixed/30 rounded-full flex items-center justify-center text-on-secondary-fixed-variant">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
            <div>
              <p className="text-[12px] font-label-caps text-on-surface-variant">DÉPENSES VALIDÉES</p>
              <p className="font-h3 text-h3">{formatAmount(depenses)}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-md">
            <h4 className="font-label-caps mb-stack-sm text-primary">Action Rapide</h4>
            <div className="space-y-stack-sm">
              <a href="/nouvelle-demande" className="block text-center w-full bg-primary text-on-primary py-3 rounded-lg font-semibold text-sm hover:bg-primary-container hover:text-on-primary-container transition-all">
                <span className="material-symbols-outlined text-sm align-text-bottom">add_circle</span> Nouvelle Demande
              </a>
              {isFinancialAdmin && (
                <a href="/nouvelle-entree" className="block text-center w-full bg-secondary-fixed text-on-secondary-fixed py-3 rounded-lg font-semibold text-sm hover:bg-secondary-container transition-all">
                  <span className="material-symbols-outlined text-sm align-text-bottom">payments</span> Enregistrer Entrée
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-stack-lg py-stack-md flex items-center justify-between border-b border-outline-variant">
          <h3 className="font-h3 text-h3">Transactions Récentes</h3>
          <a href="/historique" className="text-primary text-body-sm font-semibold hover:underline">Voir tout</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-stack-lg py-stack-sm font-label-caps text-on-surface-variant">Date</th>
                <th className="px-stack-lg py-stack-sm font-label-caps text-on-surface-variant">Description</th>
                <th className="px-stack-lg py-stack-sm font-label-caps text-on-surface-variant">Montant</th>
                <th className="px-stack-lg py-stack-sm font-label-caps text-on-surface-variant">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading && (
                <tr><td colSpan={4} className="px-stack-lg py-stack-md text-body-sm text-on-surface-variant text-center">Chargement...</td></tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr><td colSpan={4} className="px-stack-lg py-stack-md text-body-sm text-on-surface-variant text-center">Aucune transaction enregistrée.</td></tr>
              )}
              {!loading && transactions.map((t) => (
                <tr key={t.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-stack-lg py-stack-md text-body-sm text-on-surface-variant">{t.date}</td>
                  <td className="px-stack-lg py-stack-md font-semibold">{t.name}</td>
                  <td className={`px-stack-lg py-stack-md font-bold ${t.income ? "text-primary" : "text-error"}`}>
                    {t.income ? "+ " : "- "} {formatAmount(t.amount)}
                  </td>
                  <td className="px-stack-lg py-stack-md">{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
