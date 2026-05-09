import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { logAction } from "../lib/audit";

type TabType = "membres" | "filieres" | "categories";

export default function MembersManagement() {
  const { profile } = useAuth();
  const isAdmin = profile?.role?.toLowerCase() === "admin";

  const [activeTab, setActiveTab] = useState<TabType>("membres");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showFiliereModal, setShowFiliereModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("Membre");
  const [editFiliere, setEditFiliere] = useState("");
  const [editNiveau, setEditNiveau] = useState("");
  const [fName, setFName] = useState("");
  const [fLevels, setFLevels] = useState("L1, L2, L3");
  const [cName, setCName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tempPwd, setTempPwd] = useState("");
  const [createCard, setCreateCard] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createFiliere, setCreateFiliere] = useState("");
  const [createNiveau, setCreateNiveau] = useState("");
  const [createRole, setCreateRole] = useState("Membre");
  const [createdResult, setCreatedResult] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(50000);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdInput, setThresholdInput] = useState("50000");

  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'significant_expense_threshold').single().then(({ data }) => {
      if (data) { setThreshold(Number(data.value)); setThresholdInput(data.value); }
    });
  }, []);

  useEffect(() => {
    if (isAdmin) { fetchData(); }
    else { setLoading(false); setError("Vous n'avez pas les droits d'administration nécessaires."); }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profRes, filRes, catRes] = await Promise.all([
        supabase.from("profiles").select("*").order("last_name"),
        supabase.from("filieres").select("*").order("name"),
        supabase.from("expense_categories").select("*").order("name"),
      ]);
      if (profRes.data) setMembers(profRes.data);
      if (filRes.data) setFilieres(filRes.data);
      if (catRes.data) setCategories(catRes.data);
    } catch (err: any) { console.error(err); setError("Erreur lors du chargement des données."); }
    finally { setLoading(false); }
  };

  const filteredMembers = members.filter((m) => {
    const name = `${m.last_name} ${m.first_name}`.toLowerCase();
    const matchesSearch = !search || name.includes(search.toLowerCase()) || m.card_number?.toLowerCase().includes(search.toLowerCase());
    const matchesFiliere = !filiereFilter || m.filiere === filiereFilter;
    const matchesRole = !roleFilter || m.role === roleFilter;
    return matchesSearch && matchesFiliere && matchesRole;
  });

  const openEdit = (m: any) => {
    setEditingId(m.id); setEditRole(m.role || "Membre"); setEditFiliere(m.filiere || ""); setEditNiveau(m.niveau || ""); setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingId) return;
    setActionLoading(true);
    try {
      await supabase.from("profiles").update({ role: editRole, filiere: editFiliere, niveau: editNiveau }).eq("id", editingId);
      await supabase.from("notifications").insert([{ user_id: editingId, title: "Profil mis à jour", content: `Votre rôle a été mis à jour par l'administration. Nouveau rôle: ${editRole}.`, type: "profil_maj", link: "/profil" }]);
      await logAction(profile?.id, "modification_membre", { member_id: editingId, role: editRole });
      setShowEditModal(false); fetchData();
    } catch (err: any) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await supabase.from("profiles").update({ is_active: !current }).eq("id", id);
      await logAction(profile?.id, "modification_statut_membre", { member_id: id, new_status: !current });
      await supabase.from("notifications").insert([{ user_id: id, title: "Statut du compte", content: `Votre statut a été modifié. Vous êtes maintenant ${!current ? "actif" : "inactif"}.`, type: "statut_maj" }]);
      fetchData();
    } catch { alert("Erreur de modification du statut."); }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`Envoyer un lien de réinitialisation à ${email} ?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert("Lien de réinitialisation envoyé !");
    } catch (err: any) { alert("Erreur: " + err.message); }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement le compte de ${name} ? Cette action est irréversible.`)) return;
    if (!confirm(`Confirmer la suppression de ${name} ?`)) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("delete_user", { user_id: id });
      if (error) await supabase.from("profiles").update({ is_active: false, card_number: `DELETED-${id.substring(0, 8)}` }).eq("id", id);
      await logAction(profile?.id, "suppression_membre", { member_id: id });
      fetchData();
    } catch (err: any) { alert("Erreur: " + err.message); }
    finally { setActionLoading(false); }
  };

  const handleSaveFiliere = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    const niveauxArray = fLevels.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      if (editingId) await supabase.from("filieres").update({ name: fName, niveaux: niveauxArray }).eq("id", editingId);
      else await supabase.from("filieres").insert({ name: fName, niveaux: niveauxArray });
      fetchData(); setShowFiliereModal(false);
    } catch { alert("Erreur."); }
    finally { setActionLoading(false); }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      if (editingId) await supabase.from("expense_categories").update({ name: cName }).eq("id", editingId);
      else await supabase.from("expense_categories").insert({ name: cName });
      fetchData(); setShowCategoryModal(false);
    } catch { alert("Erreur."); }
    finally { setActionLoading(false); }
  };

  if (!isAdmin) return <div className="p-8 text-center text-on-surface-variant font-medium">{error || "Chargement..."}</div>;

  const selectedFiliereObj = filieres.find((f) => f.name === editFiliere);
  const availableNiveaux = selectedFiliereObj?.niveaux || ["L1", "L2", "L3"];

  return (
    <div className="space-y-gutter">
      <div className="border-b border-outline-variant pb-stack-md">
        <h2 className="font-h1 text-h1 text-primary">Administration & Configuration</h2>
        <p className="font-body-md text-on-surface-variant">Gestion des membres, filières et catégories</p>
      </div>

      <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un membre..."
            className="w-full pl-10 pr-4 py-2 bg-surface-bright border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
        </div>
        <select value={filiereFilter} onChange={(e) => setFiliereFilter(e.target.value)}
          className="bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
          <option value="">Toutes filières</option>
          {filieres.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-bright border border-outline-variant rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
          <option value="">Tous rôles</option>
          <option>Membre</option><option>Admin</option><option>Trésorier</option><option>Président</option><option>Commissaire</option>
        </select>
        <button onClick={() => { setThresholdInput(threshold.toString()); setShowThresholdModal(true); }}
          className="flex items-center gap-2 px-3 py-2 bg-surface-bright border border-outline-variant rounded-lg text-sm hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-sm">tune</span>
          Seuil: {threshold.toLocaleString('fr-SN')} FCFA
        </button>
      </div>

      <div className="flex gap-4 border-b border-outline-variant">
        <button className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "membres" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`} onClick={() => setActiveTab("membres")}>
          <span className="material-symbols-outlined text-sm">shield</span>
          <span className="font-label-caps">Membres ({filteredMembers.length})</span>
        </button>
        <button className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "filieres" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`} onClick={() => setActiveTab("filieres")}>
          <span className="material-symbols-outlined text-sm">school</span>
          <span className="font-label-caps">Filières</span>
        </button>
        <button className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "categories" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`} onClick={() => setActiveTab("categories")}>
          <span className="material-symbols-outlined text-sm">label</span>
          <span className="font-label-caps">Catégories</span>
        </button>
      </div>

      {activeTab === "membres" && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <div className="grid grid-cols-3 gap-4 flex-1">
            </div>
            <button onClick={() => { setEditingId(null); setShowEditModal(false); const pwd = Math.random().toString(36).slice(-8); setShowCreateModal(true); setTempPwd(pwd); }}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all shrink-0">
              <span className="material-symbols-outlined text-sm">person_add</span> Créer un membre
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 p-4 bg-surface-container-low border-b border-outline-variant">
            <div className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant">
              <p className="text-[12px] font-label-caps text-on-surface-variant">Total Membres</p>
              <p className="font-h3 text-h3 text-primary">{members.length}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant">
              <p className="text-[12px] font-label-caps text-on-surface-variant">Actifs</p>
              <p className="font-h3 text-h3 text-tertiary">{members.filter((m) => m.is_active).length}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant">
              <p className="text-[12px] font-label-caps text-on-surface-variant">Administrateurs</p>
              <p className="font-h3 text-h3 text-secondary">{members.filter((m) => m.role === "Admin").length}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant">Membre</th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant">Carte</th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant">Scolarité</th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant text-center">Rôle</th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant text-center">Statut</th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading && <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant">Chargement...</td></tr>}
                {!loading && filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs uppercase">
                          {m.first_name?.charAt(0) || m.last_name?.charAt(0) || "U"}
                        </div>
                        <div className="font-semibold text-on-surface">{m.last_name} {m.first_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="font-mono text-xs font-medium bg-surface-container px-2 py-1 rounded">{m.card_number}</span></td>
                    <td className="px-6 py-4"><div className="text-xs font-semibold">{m.filiere}</div><div className="text-[11px] text-on-surface-variant">{m.niveau}</div></td>
                    <td className="px-6 py-4 text-center"><span className="px-2 py-1 bg-surface-container text-[10px] font-bold rounded">{m.role}</span></td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${m.is_active ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : "bg-error-container text-on-error-container"}`}>
                        {m.is_active ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(m)} className="p-1.5 hover:text-primary hover:bg-surface-container rounded" title="Modifier"><span className="material-symbols-outlined text-sm">edit</span></button>
                        <button onClick={() => toggleStatus(m.id, m.is_active)} className="p-1.5 hover:text-primary hover:bg-surface-container rounded" title={m.is_active ? "Désactiver" : "Activer"}>
                          <span className={`material-symbols-outlined text-sm ${m.is_active ? "text-error" : "text-tertiary"}`}>{m.is_active ? "cancel" : "check_circle"}</span>
                        </button>
                        <button onClick={() => handleResetPassword(`${m.card_number?.toLowerCase() || m.id}@etudiant.ucab.sn`)} className="p-1.5 hover:text-primary hover:bg-surface-container rounded" title="Réinitialiser mot de passe">
                          <span className="material-symbols-outlined text-sm">key</span>
                        </button>
                        <button onClick={() => handleDeleteMember(m.id, `${m.first_name} ${m.last_name}`)} className="p-1.5 hover:text-error hover:bg-error-container rounded" title="Supprimer">
                          <span className="material-symbols-outlined text-sm">delete</span>
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

      {activeTab === "filieres" && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-stack-lg py-stack-md flex items-center justify-between border-b border-outline-variant">
            <h3 className="font-h3 text-h3">Filières</h3>
            <button onClick={() => { setEditingId(null); setFName(""); setFLevels("L1, L2, L3"); setShowFiliereModal(true); }}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all">
              <span className="material-symbols-outlined text-sm">add</span> Ajouter
            </button>
          </div>
          <div className="divide-y divide-outline-variant">
            {filieres.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors">
                <div>
                  <p className="font-semibold text-on-surface">{f.name}</p>
                  <p className="text-xs text-on-surface-variant">{f.niveaux?.join(", ") || "—"}</p>
                </div>
                <button onClick={() => { setEditingId(f.id); setFName(f.name); setFLevels((f.niveaux || []).join(", ")); setShowFiliereModal(true); }}
                  className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-sm">edit</span></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-stack-lg py-stack-md flex items-center justify-between border-b border-outline-variant">
            <h3 className="font-h3 text-h3">Catégories de dépenses</h3>
            <button onClick={() => { setEditingId(null); setCName(""); setShowCategoryModal(true); }}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all">
              <span className="material-symbols-outlined text-sm">add</span> Ajouter
            </button>
          </div>
          <div className="divide-y divide-outline-variant">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors">
                <p className="font-semibold text-on-surface">{c.name}</p>
                <button onClick={() => { setEditingId(c.id); setCName(c.name); setShowCategoryModal(true); }}
                  className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-sm">edit</span></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl w-full max-w-sm shadow-2xl border border-outline-variant">
            <h3 className="font-h3 text-h3 text-primary mb-4">Modifier le membre</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Rôle</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                  <option>Membre</option><option>Trésorier</option><option>Président</option><option>Presidente</option><option>Commissaire</option><option>Admin</option>
                </select>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Filière</label>
                <select value={editFiliere} onChange={(e) => { setEditFiliere(e.target.value); setEditNiveau(""); }}
                  className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                  <option value="">-</option>
                  {filieres.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Niveau</label>
                <select value={editNiveau} onChange={(e) => setEditNiveau(e.target.value)}
                  className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                  <option value="">-</option>
                  {availableNiveaux.map((lvl: string) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-outline-variant rounded text-sm text-on-surface">Annuler</button>
                <button type="submit" disabled={actionLoading}
                  className="px-4 py-2 bg-primary text-on-primary rounded text-sm font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all">{actionLoading ? "..." : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFiliereModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl w-full max-w-sm shadow-2xl border border-outline-variant">
            <h3 className="font-h3 text-h3 text-primary mb-4">{editingId ? "Modifier Filière" : "Nouvelle Filière"}</h3>
            <form onSubmit={handleSaveFiliere} className="space-y-4">
              <div><label className="font-label-caps text-label-caps uppercase">Nom</label><input type="text" className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={fName} onChange={(e) => setFName(e.target.value)} /></div>
              <div><label className="font-label-caps text-label-caps uppercase">Niveaux</label><input type="text" className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={fLevels} onChange={(e) => setFLevels(e.target.value)} placeholder="L1, L2..." /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowFiliereModal(false)} className="px-4 py-2 border border-outline-variant rounded text-sm">Fermer</button><button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded text-sm font-semibold">Ok</button></div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl w-full max-w-sm shadow-2xl border border-outline-variant">
            <h3 className="font-h3 text-h3 text-primary mb-4">{editingId ? "Modifier Catégorie" : "Nouvelle Catégorie"}</h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div><label className="font-label-caps text-label-caps uppercase">Nom</label><input type="text" className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={cName} onChange={(e) => setCName(e.target.value)} /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border border-outline-variant rounded text-sm">Fermer</button><button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded text-sm font-semibold">Ok</button></div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl w-full max-w-md shadow-2xl border border-outline-variant max-h-[90vh] overflow-y-auto">
            <h3 className="font-h3 text-h3 text-primary mb-4">Créer un nouveau membre</h3>
            {createdResult ? (
              <div className="space-y-4">
                <div className="bg-tertiary-fixed/30 p-4 rounded-lg border border-tertiary-fixed">
                  <p className="font-semibold text-on-tertiary-fixed-variant mb-2">Compte créé avec succès !</p>
                  <p className="text-sm text-on-surface-variant">Identifiants temporaires :</p>
                  <div className="bg-surface-bright p-3 rounded mt-2 font-mono text-sm">
                    <p>Carte: <strong>{createCard}</strong></p>
                    <p>Mot de passe: <strong>{tempPwd}</strong></p>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">Le membre peut se connecter avec son numéro de carte et ce mot de passe.</p>
                </div>
                <button onClick={() => { setShowCreateModal(false); setCreatedResult(null); setCreateCard(""); setCreateFirstName(""); setCreateLastName(""); setCreateFiliere(""); setCreateNiveau(""); setCreateRole("Membre"); }}
                  className="w-full px-4 py-2 bg-primary text-on-primary rounded text-sm font-semibold">Fermer</button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!createCard || !createFirstName || !createLastName) { alert("Veuillez remplir les champs obligatoires."); return; }
                setActionLoading(true);
                try {
                  const email = `${createCard.toLowerCase()}@etudiant.ucab.sn`;
                  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email, password: tempPwd, email_confirm: true,
                  });
                  if (authError) throw new Error(authError.message);
                  const { error: profError } = await supabase.from('profiles').upsert({
                    id: authData.user.id, card_number: createCard, first_name: createFirstName,
                    last_name: createLastName, filiere: createFiliere, niveau: createNiveau,
                    role: createRole, is_active: true,
                  });
                  if (profError) throw new Error(profError.message);
                  await logAction(profile?.id, "creation_membre", { card_number: createCard, role: createRole });
                  setCreatedResult(tempPwd);
                  fetchData();
                } catch (err: any) { alert("Erreur: " + err.message); }
                finally { setActionLoading(false); }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Numéro carte *</label>
                    <input type="text" required value={createCard} onChange={(e) => setCreateCard(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: 20260001" />
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Prénom *</label>
                    <input type="text" required value={createFirstName} onChange={(e) => setCreateFirstName(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Nom *</label>
                    <input type="text" required value={createLastName} onChange={(e) => setCreateLastName(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Filière</label>
                    <select value={createFiliere} onChange={(e) => { setCreateFiliere(e.target.value); setCreateNiveau(""); }}
                      className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                      <option value="">-</option>
                      {filieres.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Niveau</label>
                    <select value={createNiveau} onChange={(e) => setCreateNiveau(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                      <option value="">-</option>
                      {filieres.find(f => f.name === createFiliere)?.niveaux?.map((l: string) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">Rôle</label>
                    <select value={createRole} onChange={(e) => setCreateRole(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none">
                      <option>Membre</option><option>Trésorier</option><option>Président</option><option>Presidente</option><option>Commissaire</option>
                    </select>
                  </div>
                </div>
                <div className="bg-surface-container-low p-3 rounded text-sm">
                  <p className="font-semibold text-on-surface">Mot de passe temporaire généré :</p>
                  <p className="font-mono text-lg font-bold text-primary">{tempPwd}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-outline-variant rounded text-sm">Annuler</button>
                  <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-primary text-on-primary rounded text-sm font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all">{actionLoading ? "..." : "Créer le compte"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showThresholdModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl w-full max-w-sm shadow-2xl border border-outline-variant">
            <h3 className="font-h3 text-h3 text-primary mb-4">Modifier le seuil de dépense</h3>
            <p className="text-body-sm text-on-surface-variant mb-4">Les demandes de dépense supérieures à ce montant nécessitent une validation du Président.</p>
            <form onSubmit={async (e) => {
              e.preventDefault(); setActionLoading(true);
              const val = parseInt(thresholdInput);
              if (isNaN(val) || val < 0) { alert("Montant invalide."); setActionLoading(false); return; }
              await supabase.from('app_config').upsert({ key: 'significant_expense_threshold', value: val.toString() });
              setThreshold(val); setShowThresholdModal(false);
              await logAction(profile?.id, "modification_seuil", { new_threshold: val });
              setActionLoading(false);
            }} className="space-y-4">
              <div>
                <label className="font-label-caps text-label-caps uppercase">Montant (FCFA)</label>
                <input type="number" className="w-full bg-surface-bright border border-outline-variant rounded text-sm px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)} min="0" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowThresholdModal(false)} className="px-4 py-2 border border-outline-variant rounded text-sm">Annuler</button>
                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-primary text-on-primary rounded text-sm font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all">{actionLoading ? "..." : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
