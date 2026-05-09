import { NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { name: "Actualités", to: "/actualites", icon: "newspaper" },
  { name: "Mon Profil", to: "/mon-profil", icon: "person" },
  { name: "Tableau de bord", to: "/dashboard", icon: "dashboard" },
  { name: "Historique", to: "/historique", icon: "history" },
  { name: "Mes Notifications", to: "/notifications", icon: "notifications" },
  { name: "Nouvelle publication", to: "/nouvelle-publication", icon: "publish" },
  { name: "Mes groupes", to: "/mes-groupes", icon: "groups" },
  { name: "Nouvelle demande", to: "/nouvelle-demande", icon: "add_circle" },
  { name: "Mes demandes", to: "/mes-demandes", icon: "receipt_long" },
  { name: "Validation publications", to: "/validation-publications", icon: "check_circle", adminOnly: true },
  { name: "Approbations", to: "/approbations", icon: "approval", adminOrBureau: true },
  { name: "Nouvelle entrée", to: "/nouvelle-entree", icon: "payments", adminOrTresorier: true },
  { name: "Gestion membres", to: "/gestion-membres", icon: "group", adminOrBureau: true },
  { name: "Journal d'Audit", to: "/audit", icon: "receipt", adminOrCommissaire: true },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const role = profile?.role?.toLowerCase() || "";

  const visibleItems = navItems.filter((item) => {
    if (!item.adminOnly && !item.adminOrBureau && !item.adminOrTresorier && !item.adminOrCommissaire) return true;
    if (item.adminOnly && ["admin", "trésorier", "présidente", "président", "commissaire"].includes(role)) return true;
    if (item.adminOrBureau && ["admin", "trésorier", "présidente", "président"].includes(role)) return true;
    if (item.adminOrTresorier && ["admin", "trésorier"].includes(role)) return true;
    if (item.adminOrCommissaire && ["admin", "commissaire"].includes(role)) return true;
    return false;
  });

  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email?.split("@")[0] || "Connecté";
  const initials = profile ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() : "U";

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant shadow-sm flex flex-col py-stack-lg px-stack-sm z-50">
      <div className="px-4 mb-stack-lg flex items-center justify-between">
        <div>
          <h1 className="font-h3 text-h3 font-semibold text-primary">UCAB Dakar</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Student Association</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150",
                isActive
                  ? "bg-secondary-fixed text-on-secondary-fixed font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container"
              )
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-caps text-label-caps">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-stack-lg border-t border-outline-variant space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-lg transition-all duration-150"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-caps text-label-caps">Déconnexion</span>
        </button>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="text-sm min-w-0">
            <p className="font-semibold text-on-surface truncate">{displayName}</p>
            <p className="text-[10px] text-on-surface-variant font-label-caps truncate">{profile?.role || "Utilisateur"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
