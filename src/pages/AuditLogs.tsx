import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Navigate } from "react-router-dom";
import { Loader2, Search, Filter, ShieldAlert } from "lucide-react";

export default function AuditLogs() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const pageSize = 50;

  const canView = profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'commissaire';

  useEffect(() => {
    if (!canView) return;
    
    async function fetchProfiles() {
      const { data } = await supabase.from('profiles').select('id, first_name, last_name');
      if (data) {
        const pMap: Record<string, any> = {};
        data.forEach(p => pMap[p.id] = p);
        setProfiles(pMap);
      }
    }
    fetchProfiles();
  }, [canView]);

  useEffect(() => {
    if (!canView) return;

    async function fetchLogs() {
      setLoading(true);
      try {
        let query = supabase.from('audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false });
        
        if (search) {
          query = query.ilike('action', `%${search}%`);
        }

        query = query.range((page - 1) * pageSize, page * pageSize - 1);
        
        const { data, count } = await query;
        if (data) {
          setLogs(data);
        }
        if (count !== null) setTotalCount(count);
      } catch (err) {
        console.error("Error fetching logs", err);
      } finally {
        setLoading(false);
      }
    }

    const handler = setTimeout(fetchLogs, 300);
    return () => clearTimeout(handler);
  }, [canView, page, search]);

  if (!canView) {
    return <Navigate to="/dashboard" replace />;
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-[#1e2a5e]" />
            Journal d'Audit
          </h2>
          <p className="text-sm text-slate-500 mt-1">Traceabilité complète des actions effectuées sur la plateforme.</p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une action..."
            className="border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e2a5e] outline-none text-sm py-2 pl-9 pr-3 bg-white w-full sm:w-64"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto min-h-[400px]">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                 <th className="px-5 py-4">Date / Heure</th>
                 <th className="px-5 py-4">Utilisateur</th>
                 <th className="px-5 py-4">Action</th>
                 <th className="px-5 py-4">Détails (JSON)</th>
                 <th className="px-5 py-4 text-right">Adresse IP</th>
               </tr>
             </thead>
             <tbody className="text-sm text-slate-600">
               {loading ? (
                 <tr>
                   <td colSpan={5} className="px-6 py-16 text-center">
                     <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto mb-2" />
                     <span className="text-slate-400">Chargement des logs...</span>
                   </td>
                 </tr>
               ) : logs.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium">
                     Aucun log trouvé.
                   </td>
                 </tr>
               ) : (
                 logs.map(log => {
                   const userName = log.user_id && profiles[log.user_id] 
                     ? `${profiles[log.user_id].first_name} ${profiles[log.user_id].last_name}` 
                     : log.user_id || 'Système';
                     
                   return (
                     <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                       <td className="px-5 py-4 whitespace-nowrap text-xs">
                         {new Date(log.created_at).toLocaleString('fr-FR')}
                       </td>
                       <td className="px-5 py-4 font-medium text-slate-800">
                         {userName}
                       </td>
                       <td className="px-5 py-4 font-bold text-[#1e2a5e]">
                         {log.action}
                       </td>
                       <td className="px-5 py-4">
                         <div className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200" title={JSON.stringify(log.details, null, 2)}>
                            {JSON.stringify(log.details)}
                         </div>
                       </td>
                       <td className="px-5 py-4 text-right font-mono text-xs text-slate-500">
                         {log.ip_address}
                       </td>
                     </tr>
                   );
                 })
               )}
             </tbody>
           </table>
         </div>

         {!loading && logs.length > 0 && (
          <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Page {page} sur {totalPages} ({totalCount} logs au total)
            </p>
            <div className="flex items-center space-x-2">
               <button 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1}
                 className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
               >
                 Précédent
               </button>
               <button 
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page >= totalPages}
                 className="px-3 py-1 bg-[#1e2a5e] text-white rounded text-xs font-bold hover:opacity-90 disabled:opacity-50"
               >
                 Suivant
               </button>
            </div>
          </div>
         )}
      </div>
    </div>
  );
}
