import { useEffect, useState } from "react";
import { UserPlus, Search, Shield, XCircle, CheckCircle, Edit, BookOpen, Tags, Key } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { logAction } from "../lib/audit";

type TabType = 'membres' | 'filieres' | 'categories';

export default function MembersManagement() {
  const { profile } = useAuth();
  const isAdmin = profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'présidente' || profile?.role?.toLowerCase() === 'trésorier';

  const [activeTab, setActiveTab] = useState<TabType>('membres');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showFiliereModal, setShowFiliereModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [mCard, setMCard] = useState('');
  const [mFirstName, setMFirstName] = useState('');
  const [mLastName, setMLastName] = useState('');
  const [mFiliere, setMFiliere] = useState('');
  const [mNiveau, setMNiveau] = useState('');
  const [mRole, setMRole] = useState('Membre');
  const [mBirthDate, setMBirthDate] = useState('');

  const [fName, setFName] = useState('');
  const [fLevels, setFLevels] = useState('L1, L2, L3');
  const [cName, setCName] = useState('');
  const [generatedPwd, setGeneratedPwd] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    } else {
      setLoading(false);
      setError("Vous n'avez pas les droits d'administration nécessaires.");
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profRes, filRes, catRes] = await Promise.all([
        supabase.from('profiles').select('*').order('last_name'),
        supabase.from('filieres').select('*').order('name'),
        supabase.from('expense_categories').select('*').order('name')
      ]);

      if (profRes.data) setMembers(profRes.data);
      if (filRes.data) setFilieres(filRes.data);
      if (catRes.data) setCategories(catRes.data);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setGeneratedPwd(null);

    const dataObj = {
      card_number: mCard,
      first_name: mFirstName,
      last_name: mLastName,
      filiere: mFiliere,
      niveau: mNiveau,
      role: mRole,
      birth_date: mBirthDate || null,
      is_active: true
    };

    try {
      if (editingId) {
        const { error: updErr } = await supabase.from('profiles').update(dataObj).eq('id', editingId);
        if (updErr) throw updErr;

        await supabase.from('notifications').insert([{
           user_id: editingId,
           title: 'Profil Mis à Jour',
           content: `Votre profil a été mis à jour par l'administration. Rôle actuel: ${mRole}.`,
           message: `Votre profil a été mis à jour. Rôle: ${mRole}.`,
           type: 'profil_maj',
           link: '/dashboard'
        }]);
      } else {
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        
        const email = `${mCard.toLowerCase()}@temp.ucab`;
        const initialPassword = `${mFirstName.toLowerCase().replace(/\s/g, '')}${new Date().getFullYear()}`;
        
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password: initialPassword,
        });

        if (authErr) throw authErr;

        if (authData.user) {
          const { error: insErr } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            ...dataObj
          });
          if (insErr) throw insErr;
          
          await supabase.from('notifications').insert([{
             user_id: authData.user.id,
             title: 'Bienvenue',
             content: `Bienvenue sur la plateforme SAS Amicale UCAB Dakar. Vous êtes inscrit avec le rôle: ${mRole}.`,
             message: `Bienvenue! Vous êtes inscrit avec le rôle: ${mRole}.`,
             type: 'nouveau_membre',
             link: '/dashboard'
          }]);
        }
        setGeneratedPwd(`Email (Login) : ${email} | MDP : ${initialPassword}`);

        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token
          });
        }
        
        await logAction(profile?.id, "creation_membre", { card_number: mCard, email });
      }
      await fetchData();
      if (editingId) {
        await logAction(profile?.id, "modification_membre", { member_id: editingId, ...dataObj });
        setShowMemberModal(false);
      }
    } catch (err: any) {
      setError(err.message || "Erreur de sauvegarde.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleMemberStatus = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', id);
      await logAction(profile?.id, "modification_statut_membre", { member_id: id, new_status: !currentStatus });
      
      await supabase.from('notifications').insert([{
         user_id: id,
         title: 'Statut du compte',
         content: `Votre statut a été modifié. Vous êtes maintenant ${!currentStatus ? 'actif' : 'inactif'}.`,
         message: `Votre statut a été modifié en ${!currentStatus ? 'Actif' : 'Inactif'}.`,
         type: 'statut_maj'
      }]);

      fetchData();
    } catch (err: any) {
      alert("Erreur de modification du statut.");
    }
  };

  const openEditMember = (m: any) => {
    setEditingId(m.id); setMCard(m.card_number || ''); setMFirstName(m.first_name || '');
    setMLastName(m.last_name || ''); setMFiliere(m.filiere || ''); setMNiveau(m.niveau || '');
    setMRole(m.role || 'Membre'); setMBirthDate(m.birth_date || '');
    setShowMemberModal(true); setGeneratedPwd(null);
  };

  const handleSaveFiliere = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const niveauxArray = fLevels.split(',').map(s => s.trim()).filter(Boolean);
    try {
      if (editingId) {
        await supabase.from('filieres').update({ name: fName, niveaux: niveauxArray }).eq('id', editingId);
      } else {
        await supabase.from('filieres').insert({ name: fName, niveaux: niveauxArray });
      }
      fetchData(); setShowFiliereModal(false);
    } catch (err) { alert("Erreur."); } finally { setActionLoading(false); }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingId) {
        await supabase.from('expense_categories').update({ name: cName }).eq('id', editingId);
      } else {
         await supabase.from('expense_categories').insert({ name: cName });
      }
      fetchData(); setShowCategoryModal(false);
    } catch (err) { alert("Erreur."); } finally { setActionLoading(false); }
  };

  if (!isAdmin) return <div className="p-8 text-center text-slate-500 font-medium">{error || "Chargement..."}</div>;

  const selectedFiliereObj = filieres.find(f => f.name === mFiliere);
  const availableNiveaux = selectedFiliereObj?.niveaux || ['L1', 'L2', 'L3'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-black text-slate-800">Administration & Configuration</h2>
      </div>

      <div className="flex flex-wrap space-x-2 border-b border-slate-200">
        <button className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'membres' ? 'border-[#1e2a5e] text-[#1e2a5e]' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('membres')}><Shield className="w-4 h-4" /><span>Membres</span></button>
        <button className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'filieres' ? 'border-[#1e2a5e] text-[#1e2a5e]' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('filieres')}><BookOpen className="w-4 h-4" /><span>Filières</span></button>
        <button className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'categories' ? 'border-[#1e2a5e] text-[#1e2a5e]' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('categories')}><Tags className="w-4 h-4" /><span>Catégories</span></button>
      </div>

      {activeTab === 'membres' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700">Liste des membres</h3>
            <button onClick={() => { setEditingId(null); setMCard(''); setMFirstName(''); setMLastName(''); setMBirthDate(''); setMFiliere(filieres[0]?.name || ''); setMNiveau(''); setMRole('Membre'); setShowMemberModal(true); setGeneratedPwd(null); }} className="inline-flex items-center px-4 py-2 bg-[#1e2a5e] text-white text-xs font-bold rounded-lg hover:opacity-90"><UserPlus className="w-4 h-4 mr-2" /> Nouveau</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-50"><th className="px-6 py-4">Membre</th><th className="px-6 py-4 font-mono">Carte</th><th className="px-6 py-4">Scolarité</th><th className="px-6 py-4 text-center">Rôle</th><th className="px-6 py-4 text-center">Statut</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="text-sm text-slate-600">
                {loading && <tr><td colSpan={6} className="text-center py-8">Chargement...</td></tr>}
                {!loading && members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-4"><div className="flex items-center space-x-3"><div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase border border-blue-200">{m.first_name?.charAt(0) || m.last_name?.charAt(0) || 'U'}</div><div className="font-bold text-slate-800">{m.last_name} {m.first_name}</div></div></td>
                    <td className="px-6 py-4"><div className="font-mono text-xs font-medium bg-slate-100 px-2 py-1 rounded inline-block">{m.card_number}</div></td>
                    <td className="px-6 py-4"><div className="text-xs font-semibold">{m.filiere}</div><div className="text-[11px] text-slate-400">{m.niveau}</div></td>
                    <td className="px-6 py-4 text-center"><span className="px-2 py-1 bg-slate-100 text-[10px] font-bold rounded">{m.role}</span></td>
                    <td className="px-6 py-4 text-center"><span className={`px-2 py-1 text-[10px] font-bold rounded-full ${m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{m.is_active ? 'Actif' : 'Désactivé'}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => openEditMember(m)} className="p-1 hover:text-[#1e2a5e]"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => toggleMemberStatus(m.id, m.is_active)} className="p-1 hover:text-[#1e2a5e]">
                          {m.is_active ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS implementation here (Member, Filiere, Category)... (simili) */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center p-4">
           <div className="bg-white p-6 rounded-xl w-full max-w-xl shadow-2xl">
              <h3 className="font-bold mb-4">{editingId ? 'Modifier un membre' : 'Nouveau membre'}</h3>
              <form onSubmit={handleSaveMember} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-xs font-bold uppercase">Carte</label><input type="text" className="w-full border-slate-200 rounded text-sm" value={mCard} onChange={e=>setMCard(e.target.value)} disabled={!!editingId} required/></div>
                    <div><label className="text-xs font-bold uppercase">Rôle</label><select className="w-full border-slate-200 rounded text-sm" value={mRole} onChange={e=>setMRole(e.target.value)}><option>Membre</option><option>Admin</option><option>Trésorier</option><option>Président</option><option>Presidente</option><option>Commissaire</option></select></div>
                   <div><label className="text-xs font-bold uppercase">Nom</label><input type="text" className="w-full border-slate-200 rounded text-sm" value={mLastName} onChange={e=>setMLastName(e.target.value)} required/></div>
                   <div><label className="text-xs font-bold uppercase">Prénom(s)</label><input type="text" className="w-full border-slate-200 rounded text-sm" value={mFirstName} onChange={e=>setMFirstName(e.target.value)} required/></div>
                   <div><label className="text-xs font-bold uppercase">Filière</label><select className="w-full border-slate-200 rounded text-sm" value={mFiliere} onChange={e=>setMFiliere(e.target.value)}><option value="">-</option>{filieres.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}</select></div>
                   <div><label className="text-xs font-bold uppercase">Niveau</label><select className="w-full border-slate-200 rounded text-sm" value={mNiveau} onChange={e=>setMNiveau(e.target.value)}><option value="">-</option>{availableNiveaux.map((lvl: string)=><option key={lvl} value={lvl}>{lvl}</option>)}</select></div>
                 </div>
                 {generatedPwd && <div className="p-3 bg-emerald-50 text-emerald-800 font-mono text-xs rounded">{generatedPwd}</div>}
                 <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={()=>setShowMemberModal(false)} className="px-4 py-2 border rounded text-sm">Annuler</button>
                    {!generatedPwd && <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-[#1e2a5e] text-white rounded text-sm font-bold">{actionLoading?'...':'Enregistrer'}</button>}
                 </div>
              </form>
           </div>
        </div>
      )}
      
      {/* Filiere Modal and Category Modal similar... */}
      {showFiliereModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
             <h3 className="font-bold mb-4">{editingId?"Modifier Filière":"Nouvelle Filière"}</h3>
             <form onSubmit={handleSaveFiliere} className="space-y-4">
                <div><label className="text-xs font-bold uppercase">Nom</label><input type="text" className="w-full border-slate-200 rounded text-sm" value={fName} onChange={e=>setFName(e.target.value)}/></div>
                <div><label className="text-xs font-bold uppercase">Niveaux</label><input type="text" className="w-full border-slate-200 rounded text-sm" value={fLevels} onChange={e=>setFLevels(e.target.value)} placeholder="L1, L2..."/></div>
                <div className="flex justify-end space-x-2"><button type="button" onClick={()=>setShowFiliereModal(false)} className="px-4 py-2 border rounded">Fermer</button><button type="submit" className="px-4 py-2 bg-[#1e2a5e] text-white rounded">Ok</button></div>
             </form>
           </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
             <h3 className="font-bold mb-4">{editingId?"Modifier Catégorie":"Nouvelle Catégorie"}</h3>
             <form onSubmit={handleSaveCategory} className="space-y-4">
                <div><label className="text-xs font-bold uppercase">Nom</label><input type="text" className="w-full border-slate-200 rounded text-sm" value={cName} onChange={e=>setCName(e.target.value)}/></div>
                <div className="flex justify-end space-x-2"><button type="button" onClick={()=>setShowCategoryModal(false)} className="px-4 py-2 border rounded">Fermer</button><button type="submit" className="px-4 py-2 bg-[#1e2a5e] text-white rounded">Ok</button></div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
}
