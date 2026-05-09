import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Loader2, Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();
  const pageSize = 20;

  useEffect(() => {
    if (!profile?.id) return;
    fetchNotifications();

    const notifsSub = supabase
      .channel(`public:notifications:user_id=${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      notifsSub.unsubscribe();
    };
  }, [profile?.id, page, filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let query = supabase.from('notifications').select('*', { count: 'exact' }).eq('user_id', profile?.id).order('created_at', { ascending: false });
      
      if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        setNotifications(data);
        if (count !== null) setTotalCount(count);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile?.id).eq('is_read', false);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette notification ?")) return;
    try {
      await supabase.from('notifications').delete().eq('id', id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-[#1e2a5e]" />
            Mes Notifications
          </h2>
          <p className="text-sm text-slate-500 mt-1">Consultez l'historique complet de vos alertes et messages.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => { setFilter(e.target.value as 'all' | 'unread'); setPage(1); }}
            className="border border-slate-200 text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 rounded-lg focus:ring-[#1e2a5e] focus:border-[#1e2a5e]"
          >
            <option value="all">Toutes</option>
            <option value="unread">Non lues</option>
          </select>
          <button 
            onClick={markAllAsRead}
            className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-600 shadow-sm text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            <Check className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-lg font-medium">Aucune notification trouvée.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map(n => (
              <li key={n.id} className={`p-5 transition-colors ${!n.is_read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>}
                      <h4 className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {n.title || 'Notification'}
                      </h4>
                      <span className="text-xs text-slate-400 font-medium ml-2">
                        {new Date(n.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className={`text-sm text-slate-600 ${!n.is_read ? 'font-medium' : ''}`}>
                      {n.content || n.message}
                    </p>
                    
                    {n.link && (
                      <button 
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                          navigate(n.link);
                        }}
                        className="mt-3 inline-flex items-center text-xs font-bold text-[#1e2a5e] hover:text-blue-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors"
                      >
                         Ouvrir le lien <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {!n.is_read && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="p-2 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors tooltip-trigger"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(n.id)}
                      className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors tooltip-trigger"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && notifications.length > 0 && (
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Page {page} sur {totalPages} ({totalCount} au total)
            </p>
            <div className="flex space-x-2">
               <button 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1}
                 className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
               >
                 Précédent
               </button>
               <button 
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page >= totalPages}
                 className="px-3 py-1.5 bg-[#1e2a5e] text-white rounded-md text-xs font-bold hover:opacity-90 disabled:opacity-50"
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
