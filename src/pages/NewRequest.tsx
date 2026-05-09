import { useState, useEffect } from "react";
import { Upload, Info, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { logAction } from "../lib/audit";
import { Navigate } from "react-router-dom";

export default function NewRequest() {
  const { profile } = useAuth();

  if (profile?.role?.toLowerCase() === "commissaire") {
    return <Navigate to="/dashboard" replace />;
  }
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('expense_categories').select('*');
      if (data) {
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id.toString());
      }
    }
    loadCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !file) {
      setMessage({ type: 'error', text: "Veuillez remplir tous les champs et fournir un justificatif obligatoirement." });
      return;
    }

    setLoading(true);
    setMessage(null);

    let fileUrl = null;

    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('justificatifs').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: pubData } = supabase.storage.from('justificatifs').getPublicUrl(fileName);
      fileUrl = pubData.publicUrl;

      // Insertion dans expense_requests
      const { data: newReq, error: insertError } = await supabase.from('expense_requests').insert([{
        member_id: profile?.id,
        amount: Number(amount),
        description: description,
        category_id: categoryId ? parseInt(categoryId) : null,
        justification_url: fileUrl,
        status: 'pending'
      }]).select();
      
      if (insertError) throw insertError;
      
      await logAction(profile?.id, "creation_demande", {
        request_id: newReq?.[0]?.id,
        montant: Number(amount),
        description: description
      });

      // Chercher le trésorier et l'admin pour les notifier
      const { data: admins } = await supabase.from('profiles').select('id, role').in('role', ['Admin', 'Trésorier']);
      if (admins) {
        const notifications = admins.map(a => ({
          user_id: a.id,
          title: 'Nouvelle Demande',
          content: `Nouvelle demande de dépense de ${Number(amount).toLocaleString('fr-SN')} FCFA par ${profile?.first_name} ${profile?.last_name}`,
          message: `Nouvelle demande de dépense de ${Number(amount).toLocaleString('fr-SN')} FCFA par ${profile?.first_name} ${profile?.last_name}`,
          type: 'demande_depense',
          link: '/approbations'
        }));
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      setMessage({ type: 'success', text: "Votre demande a été soumise avec succès et est en attente de validation par le Trésorier." });
      setAmount("");
      setDescription("");
      setFile(null);

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: "Une erreur s'est produite lors de la soumission : " + (err.message || "Erreur inconnue") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6 flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 font-medium">
          Toute demande de dépense doit obligatoirement être accompagnée d'un justificatif (facture, reçu, devis) lisible.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 border-l-4 rounded-r-lg flex items-start space-x-3 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-red-50 border-red-400 text-red-800'}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Formulaire de Demande de Dépense</h3>
          <p className="text-xs text-slate-500 mt-1">Remplissez les informations ci-dessous pour soumettre votre requête.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="category" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Catégorie
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 px-3 bg-white font-medium text-slate-700 hover:border-slate-300 transition-colors"
                required
              >
                <option value="">Sélectionnez une catégorie...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Montant <span className="text-red-500">*</span>
              </label>
              <div className="relative w-full">
                <input
                  type="number"
                  id="amount"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 pl-3 pr-16 bg-white font-bold text-slate-800 hover:border-slate-300 transition-colors"
                  placeholder="0"
                  min="1"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-slate-400 font-medium text-xs">FCFA</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="description" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Description détaillée <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] focus:border-[#1e2a5e] text-sm py-2.5 px-3 bg-white text-slate-800 resize-none hover:border-slate-300 transition-colors"
                placeholder="Expliquez brièvement l'objet de cette dépense..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Pièce justificative / Devis <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-lg hover:border-[#1e2a5e] hover:bg-slate-50 transition-colors bg-slate-50/50 group cursor-pointer relative">
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  required
                />
                <div className="space-y-2 text-center flex flex-col items-center">
                  <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-[#1e2a5e]" />
                  </div>
                  <div className="flex text-sm text-[#1e2a5e] font-semibold justify-center">
                    {file ? file.name : "Sélectionner un fichier"}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    PNG, JPG, PDF jusqu'à 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
             <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1e2a5e] text-white rounded-lg text-sm font-bold hover:opacity-90 focus:outline-none transition-opacity shadow-sm flex items-center"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Soumettre la demande
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
