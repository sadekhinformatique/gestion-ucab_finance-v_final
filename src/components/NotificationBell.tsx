import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.id) return;
    fetchNotifications();
    const notifsSub = supabase
      .channel(`public:notifications:user_id=${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { notifsSub.unsubscribe(); };
  }, [profile?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile?.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    } catch (err) { console.error(err); }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile?.id).eq("is_read", false);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const handleNotifClick = (n: any) => {
    if (!n.is_read) markAsRead(n.id);
    setIsOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full focus:outline-none"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-on-error ring-2 ring-surface-bright">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant z-50 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <h3 className="font-bold text-on-surface text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-[10px] font-bold text-primary hover:text-primary-container transition-colors">
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-on-surface-variant">Aucune notification pour le moment.</div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`p-4 border-b border-outline-variant last:border-0 cursor-pointer hover:bg-surface-container-low transition-colors ${!n.is_read ? "bg-primary-fixed/30" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm ${!n.is_read ? "font-bold text-on-surface" : "font-medium text-on-surface-variant"}`}>
                        {n.title || "Notification"}
                      </p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0 ml-2" />}
                    </div>
                    <p className="text-xs text-on-surface-variant mb-2">{n.content || n.message}</p>
                    <p className="text-[10px] text-outline font-medium">
                      {new Date(n.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-outline-variant bg-surface-container-low">
            <button
              onClick={() => { setIsOpen(false); navigate("/notifications"); }}
              className="w-full py-1.5 text-xs font-bold text-on-surface-variant hover:text-primary text-center"
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
