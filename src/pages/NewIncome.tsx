import { useState, useEffect } from "react";
import { Upload, Info, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Navigate } from "react-router-dom";
import { logAction } from "../lib/audit";

export default function NewIncome() {
  const { profile } = useAuth();
  const [type, setType] = useState("Cotisation");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberId, setMemberId] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
//... Same loadMembers ...
    async function loadMembers() {
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, card_number').eq('is_active', true);
      if (!error && data) {
        setMembers(data);
      }
    }
    loadMembers();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      setMessage({ type: 'error', text: "Veuillez remplir tous les champs obligatoires." });
      return;
    }

    setLoading(true);
    setMessage(null);

    let fileUrl = null;

    try {
      if (file) {
        try {
          const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const { error: uploadError } = await supabase.storage.from('justificatifs').upload(fileName, file);
          if (!uploadError) {
             const { data: pubData } = supabase.storage.from('justificatifs').getPublicUrl(fileName);
             fileUrl = pubData.publicUrl;
          }
        } catch (e) {
          console.warn("L'upload a échoué, on continue sans fichier.", e);
        }
      }

      // Insertion dans la table transactions
      const insertData: any = {
        type: 'entree',
        categorie: type,
        montant: Number(amount),
        description: description + (memberId ? ` (Membre ID: ${memberId})` : ''),
        date: date,
        statut: 'approved',
        created_by: profile?.id
      };

      if (fileUrl) {
         insertData.fichier_url = fileUrl;
         insertData.justification_url = fileUrl;
      }

      const { data: newTx, error: insertError } = await supabase.from('transactions').insert([insertData]).select();
      
      if (insertError) throw insertError;

      // Log action
      await logAction(profile?.id, "creation_entree", { 
        transaction_id: newTx?.[0]?.id,
        montant: insertData.montant,
        categorie: insertData.categorie 
      });

      // Création des notifications pour les membres actifs sauf l'utilisateur actuel
      if (members.length > 0) {
        const notifications = members
          .filter(m => m.id !== profile?.id)
          .map(m => ({
            user_id: m.id,
            title: 'Nouvelle Entrée',
            content: `Une entrée de ${Number(amount).toLocaleString('fr-SN')} FCFA a été ajoutée au titre de : ${type}.`,
            message: `Une entrée de ${Number(amount).toLocaleString('fr-SN')} FCFA a été ajoutée au titre de : ${type}.`, // Fallback
            type: 'entree',
            link: '/historique'
          }));
        
        // Chunk inserts for large arrays if needed, but 142 members is small enough for one bulk insert
        if (notifications.length > 0) {
           await supabase.from('notifications').insert(notifications);
        }
      }

      setMessage({ type: 'success', text: "L'entrée a été enregistrée avec succès." });
      setAmount("");
      setDescription("");
      setMemberId("");
      setDate(new Date().toISOString().split('T')[0]);
      setFile(null);

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: "Une erreur s'est produite lors de l'enregistrement : " + (err.message || "") });
    } finally {
      setLoading(false);
    }
  };

  // Restreindre l'accès
  if (profile && profile.role?.toLowerCase() !== 'admin' && profile.role?.toLowerCase() !== 'trésorier') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded-r-lg mb-6 flex items-start space-x-3">
        <Info className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800 font-medium">
          Cette section est réservée au bureau. Toute entrée enregistrée est automatiquement validée et notifiée aux membres.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 border-l-4 rounded-r-lg flex items-start space-x-3 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-red-50 border-red-400 text-red-800'}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Enregistrer une Nouvelle Entrée</h3>
          <p className="text-xs text-slate-500 mt-1">Saisissez les détails financiers (Cotisation, Don, etc.)</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="type" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Type d'entrée
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 px-3 bg-white font-medium text-slate-700 hover:border-slate-300 transition-colors"
              >
                <option>Cotisation</option>
                <option>Don</option>
                <option>Sponsoring</option>
                <option>Vente</option>
                <option>Autre</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="date" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 px-3 bg-white font-medium text-slate-700 hover:border-slate-300 transition-colors"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Montant <span className="text-red-500">*</span>
              </label>
              <div className="relative w-full md:w-1/2">
                <input
                  type="number"
                  id="amount"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 pl-3 pr-16 bg-white font-bold text-emerald-600 hover:border-slate-300 transition-colors"
                  placeholder="0"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-slate-400 font-medium text-xs">FCFA</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="memberId" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Membre concerné (Optionnel)
              </label>
              <select
                id="memberId"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 px-3 bg-white font-medium text-slate-700 hover:border-slate-300 transition-colors"
              >
                <option value="">Aucun membre spécifique</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} ({m.card_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="description" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 px-3 bg-white text-slate-800 resize-none hover:border-slate-300 transition-colors"
                placeholder="Précisez l'origine des fonds..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Justificatif (Optionnel)
              </label>
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-lg hover:border-[#1e2a5e] hover:bg-slate-50 transition-colors bg-slate-50/50 group cursor-pointer relative">
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={handleFileChange}
                />
                <div className="space-y-2 text-center flex flex-col items-center">
                  <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-[#1e2a5e]" />
                  </div>
                  <div className="flex text-sm text-[#1e2a5e] font-semibold justify-center">
                    {file ? file.name : "Sélectionner un fichier"}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Reçu, note (PNG, PDF) jusqu'à 5MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1e2a5e] text-white rounded-lg text-sm font-bold hover:opacity-90 focus:outline-none transition-opacity shadow-sm flex items-center w-full justify-center md:w-auto"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer l'entrée
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
