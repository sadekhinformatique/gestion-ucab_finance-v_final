import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Check, X, FileText, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { logAction } from "../lib/audit";

export default function Approbations() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(50000);

  const isPresident = profile?.role?.toLowerCase() === 'président' || profile?.role?.toLowerCase() === 'presidente';
  const isTresorier = profile?.role?.toLowerCase() === 'trésorier';
  const isAdmin = profile?.role?.toLowerCase() === 'admin';

  const canApprove = isPresident || isTresorier || isAdmin;

  useEffect(() => {
    loadData();
    // Subscribe to changes
    const sub = supabase.channel('requests_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_requests' }, () => {
        loadData();
      }).subscribe();
      
    return () => { sub.unsubscribe(); };
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load config
      const { data: config } = await supabase.from('app_config').select('*').eq('key', 'significant_expense_threshold').single();
      if (config) {
        setThreshold(Number(config.value));
      }

      // Load requests based on role
      let query = supabase
        .from('expense_requests')
        .select(`
          *,
          member:profiles!expense_requests_member_id_fkey(first_name, last_name),
          category:expense_categories(name)
        `)
        .order('created_at', { ascending: false });

      if (isTresorier && !isAdmin) {
        query = query.in('status', ['pending', 'treasurer_approved']);
      } else if (isPresident && !isAdmin) {
        query = query.eq('status', 'treasurer_approved');
      }

      const { data, error } = await query;
      if (!error && data) {
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req: any) => {
    setProcessingId(req.id);
    try {
      let newStatus = '';
      
      if (req.status === 'pending') {
        // Trésorier approuve
        if (req.amount < threshold) {
          // Validation finale directe
          newStatus = 'converted';
        } else {
          newStatus = 'treasurer_approved'; // Part au président
        }
        
        await supabase.from('expense_requests').update({
          status: newStatus,
          treasurer_approved_by: profile?.id,
          updated_at: new Date().toISOString()
        }).eq('id', req.id);
        
      } else if (req.status === 'treasurer_approved') {
        // Président valide
        newStatus = 'converted';
        await supabase.from('expense_requests').update({
          status: newStatus,
          president_validated_by: profile?.id,
          updated_at: new Date().toISOString()
        }).eq('id', req.id);
      }

      await logAction(profile?.id, "approbation_demande", { request_id: req.id, newStatus });

      // Si validation finale, créer la transaction
      if (newStatus === 'converted') {
        await supabase.from('transactions').insert([{
          type: 'sortie',
          categorie: req.category?.name || 'Autre',
          montant: req.amount,
          description: req.description + (req.member ? ` (Demandé par ${req.member.first_name} ${req.member.last_name})` : ''),
          statut: 'converted',
          created_by: req.member_id,
          approved_by: profile?.id, // simplifié, on met l'ID de la dernière personne qui valide
          fichier_url: req.justification_url,
          justification_url: req.justification_url,
          date: new Date().toISOString().split('T')[0]
        }]);

        // Notifier le demandeur
        await supabase.from('notifications').insert([{
          user_id: req.member_id,
          title: 'Demande Approuvée',
          content: `Votre demande de dépense de ${req.amount.toLocaleString('fr-SN')} FCFA a été approuvée via le circuit de validation.`,
          message: `Votre demande de dépense de ${req.amount.toLocaleString('fr-SN')} FCFA a été approuvée via le circuit de validation.`,
          type: 'demande_approuvee',
          link: '/historique'
        }]);
      } else if (newStatus === 'treasurer_approved') {
        // Notifier le président
        const { data: president } = await supabase.from('profiles').select('id').in('role', ['Président', 'Presidente', 'Admin']);
        if (president) {
           const notifs = president.map(p => ({
             user_id: p.id,
             title: 'Demande à Valider',
             content: `Le trésorier a approuvé une demande de ${req.amount.toLocaleString('fr-SN')} FCFA (dépassement du seuil). Elle requiert votre validation finale.`,
             message: `Le trésorier a approuvé une demande de ${req.amount.toLocaleString('fr-SN')} FCFA (dépassement du seuil). Elle requiert votre validation finale.`,
             type: 'demande_a_valider',
             link: '/approbations'
           }));
           await supabase.from('notifications').insert(notifs);
        }
      }

    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'approbation.");
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  const handleReject = async (reqId: number) => {
    if (!rejectionReason) {
      alert("Veuillez fournir un motif de rejet.");
      return;
    }
    setProcessingId(reqId);
    try {
      const { data } = await supabase.from('expense_requests').select('member_id, amount').eq('id', reqId).single();
      
      await supabase.from('expense_requests').update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString()
      }).eq('id', reqId);

      await logAction(profile?.id, "rejet_demande", { request_id: reqId, reason: rejectionReason });

      if (data) {
        await supabase.from('notifications').insert([{
          user_id: data.member_id,
          title: 'Demande Rejetée',
          content: `Votre demande de dépense de ${data.amount.toLocaleString('fr-SN')} FCFA a été rejetée. Motif: ${rejectionReason}`,
          message: `Votre demande de dépense de ${data.amount.toLocaleString('fr-SN')} FCFA a été rejetée. Motif: ${rejectionReason}`,
          type: 'demande_rejetee',
          link: '/mes-demandes'
        }]);
      }
      
      setShowRejectModal(null);
      setRejectionReason("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors du rejet.");
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  if (!canApprove) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestion des Demandes de Dépense</h2>
          <p className="text-sm text-slate-500 mt-1">
            Seuil de validation par le président : <span className="font-bold">{threshold.toLocaleString('fr-SN')} FCFA</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center text-slate-500">
          Aucune demande en attente pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="p-4 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-center items-center md:w-48 shrink-0">
                <span className="text-2xl font-black text-[#1e2a5e] mb-1">{req.amount.toLocaleString('fr-SN')}</span>
                <span className="text-xs font-bold text-slate-500">FCFA</span>
                <span className={`mt-3 px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider
                  ${req.status === 'pending' ? 'bg-orange-100 text-orange-700' : ''}
                  ${req.status === 'treasurer_approved' ? 'bg-blue-100 text-blue-700' : ''}
                  ${req.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                  ${req.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : ''}
                `}>
                  {req.status === 'pending' && 'En attente (Trésorier)'}
                  {req.status === 'treasurer_approved' && 'En attente (Président)'}
                  {req.status === 'rejected' && 'Rejetée'}
                  {req.status === 'converted' && 'Validée'}
                </span>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800">{req.description}</h3>
                    <p className="text-xs text-slate-500">
                      Demandé par <span className="font-semibold text-slate-700">{req.member?.first_name} {req.member?.last_name}</span> le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                    {req.category?.name || 'Autre'}
                  </span>
                </div>
                
                {req.justification_url && (
                  <div className="mt-2 mb-4">
                    <a href={req.justification_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded">
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Voir le justificatif
                    </a>
                  </div>
                )}

                {req.status === 'rejected' && req.rejection_reason && (
                  <div className="mt-auto bg-red-50 text-red-700 p-3 rounded text-xs font-medium border border-red-100">
                    Motif du rejet: {req.rejection_reason}
                  </div>
                )}

                {/* Actions */}
                {((req.status === 'pending' && (isTresorier || isAdmin)) || (req.status === 'treasurer_approved' && (isPresident || isAdmin))) && req.status !== 'converted' && (
                  <div className="mt-auto pt-4 flex gap-3">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processingId === req.id}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition flex items-center justify-center"
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      Approuver
                    </button>
                    <button
                      onClick={() => setShowRejectModal(req.id)}
                      disabled={processingId === req.id}
                      className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition flex items-center justify-center"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Rejeter la demande</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Motif du rejet</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-slate-200 rounded p-3 text-sm focus:ring-[#1e2a5e] focus:border-[#1e2a5e]"
                  rows={3}
                  placeholder="Ce motif sera communiqué au demandeur..."
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end space-x-2">
              <button onClick={() => setShowRejectModal(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded">
                Annuler
              </button>
              <button onClick={() => handleReject(showRejectModal)} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded flex items-center">
                {processingId === showRejectModal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
