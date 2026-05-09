import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Check } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [solde, setSolde] = useState(0); 
  const [depenses, setDepenses] = useState(0); 
  const [membresCount, setMembresCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(amt) + ' F';
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Transactions count and 5 latest
      const { data: txs, error: txError } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      
      if (txError) throw txError;

      if (txs) {
        setTransactions(txs.slice(0, 5).map(t => {
          const isIncome = t.type === 'entree' || t.type === 'recette';
          return {
            id: t.id,
            name: t.description || t.titre || t.libelle || 'Transaction',
            amount: Number(t.montant || t.amount || 0),
            category: t.categorie || t.category || (isIncome ? 'ENTREE' : 'SORTIE'),
            status: t.statut || t.status || 'En attente',
            income: isIncome,
            date: new Date(t.created_at || t.date || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          };
        }));

        let totalS = 0;
        let totalD = 0;
        txs.forEach(t => {
          const status = t.statut || t.status;
          const isApproved = status === 'approved' || status === 'validated_president';
          
          if (isApproved) {
             const amt = Number(t.montant || t.amount || 0);
             if (t.type === 'entree' || t.type === 'recette') {
               totalS += amt;
             } else {
               totalS -= amt;
               totalD += amt;
             }
          }
        });
        setSolde(totalS);
        setDepenses(totalD);
      }

      // Notifications
      if (profile?.id) {
        const { data: alts, error: altsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!altsError && alts) {
          setAlerts(alts.map(a => ({
            id: a.id,
            title: a.title || 'Notification',
            message: a.content || a.message,
            link: a.link,
            date: new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          })));
        }
      }

      // Membres
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true);
      if (count !== null) setMembresCount(count);

    } catch (err: any) {
      console.error("Erreur chargement données dashboard:", err);
      setError("Impossible de charger les données du tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime subscriptions
    const transactionsSub = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        loadData();
      })
      .subscribe();

    let notifsSub: any;
    if (profile?.id) {
      notifsSub = supabase
        .channel(`public:notifications:user_id=${profile.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
          loadData();
        })
        .subscribe();
    }

    return () => {
      transactionsSub.unsubscribe();
      if (notifsSub) notifsSub.unsubscribe();
    };
  }, [profile?.id]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      console.error("Erreur mise à jour notification:", err);
    }
  };

  const isFinancialAdmin = profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'trésorier' || profile?.role?.toLowerCase() === 'président' || profile?.role?.toLowerCase() === 'presidente';

  return (
    <div className="space-y-6">
      {/* Messages d'erreur */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Top Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">...</div>}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Solde Actuel</p>
          <p className="text-3xl font-black text-[#1e2a5e]">
            {new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(solde)} <span className="text-lg font-normal">FCFA</span>
          </p>
          <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"></path></svg>
            En direct
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">...</div>}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dépenses Approuvées</p>
          <p className="text-3xl font-black text-slate-700">
            {new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(depenses)} <span className="text-lg font-normal">FCFA</span>
          </p>
          <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-1.5 rounded-full ${depenses > 0 ? 'bg-orange-400' : 'bg-slate-300'}`} style={{ width: depenses > 0 ? '65%' : '0%' }}></div>
          </div>
        </div>
        <div className="bg-[#1e2a5e] p-6 rounded-xl border border-slate-200 shadow-sm text-white relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-[#1e2a5e]/50 backdrop-blur-sm flex items-center justify-center z-10">...</div>}
          <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Membres Actifs</p>
          <p className="text-3xl font-black">{membresCount} <span className="text-lg font-normal text-blue-200">Étudiants</span></p>
          <div className="mt-4 flex -space-x-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#1e2a5e] bg-blue-300"></div>
            <div className="w-6 h-6 rounded-full border-2 border-[#1e2a5e] bg-blue-400"></div>
            <div className="w-6 h-6 rounded-full border-2 border-[#1e2a5e] bg-blue-500"></div>
            <div className="w-6 h-6 rounded-full border-2 border-[#1e2a5e] bg-slate-600 flex items-center justify-center text-[8px] font-bold text-white">+{membresCount > 3 ? membresCount - 3 : 0}</div>
          </div>
        </div>
      </div>

      {/* Bottom Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Dernières Transactions</h3>
            <a href="/historique" className="text-xs text-[#1e2a5e] font-semibold hover:underline">Voir tout</a>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-600">
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 cursor-wait">
                       <span className="inline-block animate-pulse w-4 h-4 bg-slate-200 rounded-full"></span> Chargement...
                    </td>
                  </tr>
                )}
                {!loading && transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Aucune transaction enregistrée.</td>
                  </tr>
                )}
                {!loading && transactions.map((t) => {
                  let statusColors = "bg-slate-50 text-slate-600";
                  if (t.status === 'approved' || t.status === 'validated_president') statusColors = "bg-emerald-50 text-emerald-600";
                  if (t.status === 'rejected') statusColors = "bg-red-50 text-red-600";
                  if (t.status === 'pending') statusColors = "bg-orange-50 text-orange-600";
                  
                  return (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{t.date}</td>
                      <td className="px-6 py-4 font-medium">{t.name}</td>
                      <td className="px-6 py-4 text-center">
                         <span className={`${statusColors} px-2 py-1 rounded text-[10px] font-bold`}>{t.status}</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${t.income ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.income ? '+ ' : '- '} {formatAmount(t.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Action Center */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {alerts.length > 0 ? (
                    <span className="block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                ) : (
                    <span className="block w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
                <span>Alertes & Notifications</span>
              </div>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{alerts.length}</span>
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {alerts.length === 0 && !loading && (
                <p className="text-sm text-slate-500 text-center py-4">Vous n'avez aucune notification non lue.</p>
              )}
              {alerts.map((a) => (
                <div key={a.id} className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded flex flex-col justify-between items-start space-y-2">
                  <div className="text-xs font-medium w-full">
                    <p className="font-bold text-red-800 mb-0.5">{a.title}</p>
                    <p className="font-medium mb-1">{a.message}</p>
                    <p className="opacity-70">{a.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => markAsRead(a.id)} className="text-[10px] bg-red-100 px-2 py-1 rounded font-bold hover:bg-red-200 flex items-center">
                      <Check className="w-3 h-3 mr-1" /> Marquer lue
                    </button>
                    {a.link && (
                      <a href={a.link} onClick={() => markAsRead(a.id)} className="text-[10px] bg-white border border-red-200 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-50 flex items-center">
                        Voir détail
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-700 mb-3">Action Rapide</h3>
             <div className="space-y-2">
               <a href="/nouvelle-demande" className="block text-center w-full bg-[#1e2a5e] text-white py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                 + Nouvelle Demande (Sortie)
               </a>
               {isFinancialAdmin && (
                 <a href="/nouvelle-entree" className="block text-center w-full bg-emerald-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors">
                   + Enregistrer une Entrée
                 </a>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
