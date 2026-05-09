import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { FileText, Loader2 } from "lucide-react";

export default function MyRequests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!profile?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('expense_requests')
          .select('*, category:expense_categories(name)')
          .eq('member_id', profile.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRequests(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    
    if (profile?.id) {
       const sub = supabase.channel('my_requests')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_requests', filter: `member_id=eq.${profile.id}` }, () => {
           loadData();
         }).subscribe();
       return () => { sub.unsubscribe(); };
    }
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Mes Demandes de Dépense</h2>
        <p className="text-sm text-slate-500 mt-1">Suivez l'état d'avancement de vos demandes.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center text-slate-500">
          Vous n'avez soumis aucune demande pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
             <div key={req.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <h3 className="font-bold text-slate-800">{req.description}</h3>
                   <div className="flex flex-wrap items-center text-xs text-slate-500 mt-1 gap-3">
                      <span>{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>Catégorie: {req.category?.name || 'Autre'}</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-right">
                      <div className="text-lg font-black text-[#1e2a5e] mb-1">{req.amount.toLocaleString('fr-SN')} FCFA</div>
                      <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider
                        ${req.status === 'pending' || req.status === 'treasurer_approved' ? 'bg-orange-100 text-orange-700' : ''}
                        ${req.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                        ${(req.status === 'converted') ? 'bg-emerald-100 text-emerald-700' : ''}
                      `}>
                        {req.status === 'pending' && 'En cours...'}
                        {req.status === 'treasurer_approved' && 'En attente (Président)'}
                        {req.status === 'rejected' && 'Rejetée'}
                        {req.status === 'converted' && 'Validée'}
                      </span>
                   </div>
                   {req.justification_url && (
                     <a href={req.justification_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Voir le justificatif">
                       <FileText className="w-4 h-4" />
                     </a>
                   )}
                </div>
                {req.status === 'rejected' && req.rejection_reason && (
                  <div className="w-full mt-2 text-xs bg-red-50 text-red-600 p-2 rounded">
                    Motif: {req.rejection_reason}
                  </div>
                )}
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
