import { useEffect, useState } from "react";
import { Filter, ChevronDown, Download, Search, ChevronLeft, ChevronRight, Eye, X, FileText, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { logAction } from "../lib/audit";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function History() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [associationLogo, setAssociationLogo] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    category: 'all',
    startDate: '',
    endDate: '',
    member: 'all'
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Modale
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const isPrivileged = profile?.role?.toLowerCase() === 'admin' ||
                       profile?.role?.toLowerCase() === 'trésorier' ||
                       profile?.role?.toLowerCase() === 'président' ||
                       profile?.role?.toLowerCase() === 'presidente' ||
                       profile?.role?.toLowerCase() === 'commissaire';

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(amt) + ' F';
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(filters.search), 500);
    return () => clearTimeout(handler);
  }, [filters.search]);

  // Load profiles & expense categories once
  useEffect(() => {
    async function loadInitial() {
      const { data: profData } = await supabase.from('profiles').select('id, first_name, last_name, card_number, role').eq('is_active', true);
      if (profData) {
        const pMap: Record<string, any> = {};
        profData.forEach(p => pMap[p.id] = p);
        setProfiles(pMap);
        setMembersList(profData.sort((a, b) => a.first_name.localeCompare(b.first_name)));
      }

      const { data: catData } = await supabase.from('expense_categories').select('name');
      const cats = new Set<string>();
      ['Cotisation', 'Don', 'Sponsoring', 'Vente', 'Autre'].forEach(c => cats.add(c));
      if (catData) {
        catData.forEach(c => cats.add(c.name));
      }
      setCategories(Array.from(cats).sort());

      const { data: configData } = await supabase.from('app_config').select('value').eq('key', 'logo_url').single();
      if (configData && configData.value) {
        setAssociationLogo(configData.value);
      }
    }
    loadInitial();
  }, []);

  // Fetch transactions when filters or page change
  useEffect(() => {
    async function loadData() {
      if (!profile?.id) return;
      setLoading(true);
      try {
        let query = supabase
          .from('transactions')
          .select('*', { count: 'exact' });

        // Security check for standard members
        if (!isPrivileged) {
          query = query.or(`created_by.eq.${profile.id},description.ilike.%${profile.id}%`);
        }

        // Apply Filters
        if (filters.type !== 'all') {
          query = query.eq('type', filters.type);
        }
        if (filters.category !== 'all') {
          query = query.eq('categorie', filters.category);
        }
        if (filters.startDate) {
          // Utiliser created_at si la colonne date pose problème. Mais NewIncome utilise 'date' tandis que Dashboard utilise created_at
          query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('date', filters.endDate);
        }
        if (debouncedSearch) {
          query = query.or(`description.ilike.%${debouncedSearch}%,name.ilike.%${debouncedSearch}%,titre.ilike.%${debouncedSearch}%`);
        }
        if (filters.member !== 'all' && isPrivileged) {
          query = query.or(`created_by.eq.${filters.member},description.ilike.%${filters.member}%`);
        }

        query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
        query = query.range((page - 1) * pageSize, page * pageSize - 1);

        const { data, count, error } = await query;
        
        if (error) throw error;
        
        if (data) {
          setTransactions(data.map(t => {
            const isIncome = t.type === 'entree' || t.type === 'recette';
            let creatorName = t.created_by ? `${profiles[t.created_by]?.first_name || ''} ${profiles[t.created_by]?.last_name || ''}`.trim() : 'Inconnu';
            
            // Tentative d'extraire le membre de la description si c'est une entrée
            if (isIncome && t.description?.includes('Membre ID:')) {
               const match = t.description.match(/Membre ID:\s*([a-zA-Z0-9-]+)/);
               if (match && match[1] && profiles[match[1]]) {
                 creatorName = `${profiles[match[1]].first_name} ${profiles[match[1]].last_name} (Conc.)`;
               }
            }

            return {
              ...t,
              isIncome,
              displayName: t.description || t.name || t.titre || 'Transaction sans description',
              amountFormatted: formatAmount(Number(t.montant || t.amount || 0)),
              dateFormatted: new Date(t.date || t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
              displayCategory: t.categorie || t.category || (isIncome ? 'ENTREE' : 'SORTIE'),
              displayStatus: t.statut || t.status || 'Terminé',
              creatorName
            };
          }));
          if (count !== null) setTotalCount(count);
        }
      } catch (err) {
        console.error("Erreur historique:", err);
      } finally {
        setLoading(false);
      }
    }
    
    // We only load data once profiles map exists or immediately if not waiting for profiles.
    loadData();
  }, [profile, isPrivileged, page, filters.type, filters.category, filters.startDate, filters.endDate, debouncedSearch, filters.member /* Dependency array avoids calling before profile is ready */ ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleFilterChange = (key: string, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1); // Reset pagination
  };

  const fetchExportData = async () => {
    if (!profile?.id) return [];
    
    let query = supabase
      .from('transactions')
      .select('*');

    if (!isPrivileged) {
      query = query.or(`created_by.eq.${profile.id},description.ilike.%${profile.id}%`);
    }

    if (filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }
    if (filters.category !== 'all') {
      query = query.eq('categorie', filters.category);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (debouncedSearch) {
      query = query.or(`description.ilike.%${debouncedSearch}%,name.ilike.%${debouncedSearch}%,titre.ilike.%${debouncedSearch}%`);
    }
    if (filters.member !== 'all' && isPrivileged) {
      query = query.or(`created_by.eq.${filters.member},description.ilike.%${filters.member}%`);
    }

    query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
    query = query.limit(10000); // Max 10000 records for export

    const { data } = await query;
    if (!data) return [];

    return data.map(t => {
      const isIncome = t.type === 'entree' || t.type === 'recette';
      let creatorName = t.created_by ? `${profiles[t.created_by]?.first_name || ''} ${profiles[t.created_by]?.last_name || ''}`.trim() : 'Inconnu';
      
      if (isIncome && t.description?.includes('Membre ID:')) {
         const match = t.description.match(/Membre ID:\s*([a-zA-Z0-9-]+)/);
         if (match && match[1] && profiles[match[1]]) {
           creatorName = `${profiles[match[1]].first_name} ${profiles[match[1]].last_name} (Conc.)`;
         }
      }

      return {
        Date: new Date(t.date || t.created_at).toLocaleDateString('fr-FR'),
        Type: isIncome ? 'Entrée' : 'Sortie',
        Catégorie: t.categorie || t.category || (isIncome ? 'ENTREE' : 'SORTIE'),
        Description: t.description || t.name || t.titre || 'Sans description',
        Montant: Number(t.montant || t.amount || 0),
        Statut: t.statut || t.status || 'Terminé',
        Membre: creatorName,
        Approbateur: t.approved_by ? `${profiles[t.approved_by]?.first_name || ''} ${profiles[t.approved_by]?.last_name || ''}`.trim() : ''
      };
    });
  };

  const getSubTitle = () => {
    let parts = [];
    if (filters.startDate) parts.push(`Du ${new Date(filters.startDate).toLocaleDateString('fr-FR')}`);
    if (filters.endDate) parts.push(`Au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`);
    if (filters.type !== 'all') parts.push(`Type: ${filters.type === 'entree' ? 'Entrées' : 'Sorties'}`);
    if (filters.category !== 'all') parts.push(`Catégorie: ${filters.category}`);
    if (filters.member !== 'all' && isPrivileged) {
      const p = profiles[filters.member];
      if (p) parts.push(`Membre: ${p.first_name} ${p.last_name}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'Toutes les transactions';
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      await logAction(profile?.id, "export_excel", { filters });
      const exportData = await fetchExportData();
      if (exportData.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
      }

      const totalEntrees = exportData.filter(d => d.Type === 'Entrée').reduce((acc, val) => acc + val.Montant, 0);
      const totalSorties = exportData.filter(d => d.Type === 'Sortie').reduce((acc, val) => acc + val.Montant, 0);
      const solde = totalEntrees - totalSorties;

      const ws = XLSX.utils.json_to_sheet([]);
      XLSX.utils.sheet_add_aoa(ws, [
        ["Amicale UCAB Dakar - Relevé des transactions"],
        [getSubTitle()],
        ["Généré le", new Date().toLocaleString('fr-FR')],
        [],
      ], { origin: -1 });

      XLSX.utils.sheet_add_json(ws, exportData, { origin: -1 });
      
      XLSX.utils.sheet_add_aoa(ws, [
        [],
        ["Total Entrées (+)", totalEntrees],
        ["Total Sorties (-)", totalSorties],
        ["Solde", solde]
      ], { origin: -1 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      XLSX.writeFile(wb, `Transactions_UCAB_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export Excel.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await logAction(profile?.id, "export_pdf", { filters });
      const exportData = await fetchExportData();
      if (exportData.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Load logo if available
      if (associationLogo) {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = associationLogo;
          await new Promise((resolve) => {
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if(ctx) {
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL("image/png");
                doc.addImage(dataURL, 'PNG', 14, 10, 20, 20);
              }
              resolve(null);
            };
            img.onerror = () => resolve(null);
          });
        } catch (e) {
             console.warn("Could not load logo for PDF", e);
        }
      }

      doc.setFontSize(16);
      doc.text("Amicale UCAB Dakar - Relevé des transactions", associationLogo ? 40 : 14, 20);
      
      doc.setFontSize(10);
      doc.text(getSubTitle(), associationLogo ? 40 : 14, 26);
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, associationLogo ? 40 : 14, 32);

      const tableData = exportData.map(d => [
        d.Date,
        d.Type,
        d.Catégorie,
        d.Description,
        d.Membre,
        d.Approbateur,
        d.Statut,
        new Intl.NumberFormat('fr-SN').format(d.Montant)
      ]);

      autoTable(doc, {
        head: [['Date', 'Type', 'Catégorie', 'Description', 'Membre Co.', 'App. par', 'Statut', 'Montant (F)']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 42, 94] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            7: { cellWidth: 20, halign: 'right' }
        }
      });
      
      const totalEntrees = exportData.filter(d => d.Type === 'Entrée').reduce((acc, val) => acc + val.Montant, 0);
      const totalSorties = exportData.filter(d => d.Type === 'Sortie').reduce((acc, val) => acc + val.Montant, 0);
      const solde = totalEntrees - totalSorties;
      
      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(10);
      doc.text(`Total Entrées : ${new Intl.NumberFormat('fr-SN').format(totalEntrees)} F`, 14, finalY + 10);
      doc.text(`Total Sorties : ${new Intl.NumberFormat('fr-SN').format(totalSorties)} F`, 14, finalY + 16);
      doc.text(`Solde : ${new Intl.NumberFormat('fr-SN').format(solde)} F`, 14, finalY + 22);

      doc.save(`Transactions_UCAB_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export PDF.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Historique des Transactions</h2>
            <p className="text-sm text-slate-500 mt-1">Consultez et filtrez toutes les entrées et sorties d'argent.</p>
          </div>
          {isPrivileged && (
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleExportExcel}
                disabled={exporting !== null}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white shadow-sm text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {exporting === 'excel' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Exporter Excel
              </button>
              <button 
                onClick={handleExportPDF}
                disabled={exporting !== null}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white shadow-sm text-sm font-bold rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {exporting === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Exporter PDF
              </button>
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
           <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] outline-none text-sm py-2.5 pl-9 pr-3 bg-white"
              placeholder="Rechercher une description..."
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          
          <div>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] outline-none text-sm py-2.5 px-3 bg-white font-medium text-slate-700"
            >
              <option value="all">Tous types</option>
              <option value="entree">Entrées (+)</option>
              <option value="sortie">Sorties (-)</option>
            </select>
          </div>

          <div>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] outline-none text-sm py-2.5 px-3 bg-white font-medium text-slate-700"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {isPrivileged && (
            <div>
              <select
                value={filters.member}
                onChange={(e) => handleFilterChange('member', e.target.value)}
                className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] outline-none text-sm py-2.5 px-3 bg-white font-medium text-slate-700"
              >
                <option value="all">Tous les membres</option>
                {membersList.map(m => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex space-x-2 lg:col-span-1">
            <input 
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
               className="w-1/2 border border-slate-200 rounded-lg text-sm py-2 px-2"
               title="Date de début"
            />
            <input 
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
               className="w-1/2 border border-slate-200 rounded-lg text-sm py-2 px-2"
               title="Date de fin"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Catégorie</th>
                <th className="px-5 py-4 hidden md:table-cell">Membre Co.</th>
                <th className="px-5 py-4 text-center">Statut</th>
                <th className="px-5 py-4 text-right">Montant</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto mb-2" />
                    <span className="text-slate-400">Chargement de l'historique...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                     <span className="block text-slate-400 font-medium">Aucune transaction trouvée pour ces critères.</span>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-500 text-xs whitespace-nowrap">{t.dateFormatted}</td>
                    <td className="px-5 py-4 font-medium text-slate-800 max-w-[200px] truncate" title={t.displayName}>{t.displayName}</td>
                    <td className="px-5 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase whitespace-nowrap">{t.displayCategory}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-500 truncate max-w-[150px]" title={t.creatorName}>
                       {t.creatorName}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold tracking-wide rounded-full whitespace-nowrap ${
                         t.displayStatus === 'approved' || t.displayStatus === 'validated_president' || t.displayStatus === 'converted' || t.displayStatus === 'Validé' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
                       }`}>
                         {t.displayStatus === 'approved' || t.displayStatus === 'validated_president' || t.displayStatus === 'converted' ? 'Validé' : t.displayStatus}
                      </span>
                    </td>
                    <td className={`px-5 py-4 text-right font-bold whitespace-nowrap ${t.isIncome ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {t.isIncome ? "+ " : "- "} {t.amountFormatted}
                    </td>
                    <td className="px-5 py-4 text-center">
                       <button onClick={async () => {
                         setSelectedTx(t);
                         await logAction(profile?.id, "consultation_transaction", { transaction_id: t.id });
                       }} className="p-1.5 text-slate-400 hover:text-[#1e2a5e] hover:bg-blue-50 rounded transition-colors" title="Détails">
                          <Eye className="w-5 h-5" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Affichage de {((page - 1) * pageSize) + 1} à {Math.min(page * pageSize, totalCount)} sur <span className="font-bold">{totalCount}</span>
            </p>
            <div className="flex items-center space-x-1 border border-slate-200 p-1 rounded-lg">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-700">{page} / {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-black text-slate-800 text-lg">Détails de la Transaction</h3>
               <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-red-500 transition-colors p-1 bg-white rounded-full shadow-sm">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="p-6 overflow-y-auto space-y-6">
                <div className="text-center pb-6 border-b border-slate-100">
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{selectedTx.displayCategory}</p>
                   <p className={`text-5xl font-black ${selectedTx.isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {selectedTx.isIncome ? '+' : '-'}{selectedTx.amountFormatted}
                   </p>
                   <div className="mt-3">
                     <span className={`px-3 py-1 inline-flex text-xs font-bold tracking-wide rounded-full ${
                         selectedTx.displayStatus === 'approved' || selectedTx.displayStatus === 'validated_president' || selectedTx.displayStatus === 'converted' || selectedTx.displayStatus === 'Validé' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
                       }`}>
                         {selectedTx.displayStatus === 'approved' || selectedTx.displayStatus === 'validated_president' || selectedTx.displayStatus === 'converted' ? 'Validé et Compta. à jour' : selectedTx.displayStatus}
                     </span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Description</p>
                    <p className="font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedTx.displayName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Date</p>
                    <p className="font-medium text-slate-800">{selectedTx.dateFormatted}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Acteur principal</p>
                    <p className="font-medium text-slate-800">{selectedTx.creatorName}</p>
                  </div>
                  {selectedTx.approved_by && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Approuvé par</p>
                      <p className="font-medium text-slate-800">{profiles[selectedTx.approved_by]?.first_name} {profiles[selectedTx.approved_by]?.last_name}</p>
                    </div>
                  )}
                </div>

                {(selectedTx.justification_url || selectedTx.fichier_url) && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Justificatif attaché</p>
                    <a href={selectedTx.justification_url || selectedTx.fichier_url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-col items-center justify-center p-4 border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors w-full group">
                       <FileText className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-sm font-bold text-blue-600">Voir le document source</span>
                       <span className="text-xs mt-1 text-slate-500">Ouvre dans un nouvel onglet</span>
                    </a>
                  </div>
                )}
             </div>
             <div className="p-4 border-t border-slate-100 text-center bg-slate-50">
               <p className="text-[10px] text-slate-400 font-medium">Ref ID: {selectedTx.id} • Sys. Log: {new Date(selectedTx.created_at || selectedTx.date).toLocaleString('fr-FR')}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
