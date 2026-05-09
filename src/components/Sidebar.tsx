import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, History, FilePlus, Users, X, LogOut, Bell, Megaphone, UserCircle, Send, CheckSquare } from "lucide-react";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    { name: "Actualités", to: "/actualites", icon: Megaphone },
    { name: "Mon Profil", to: "/mon-profil", icon: UserCircle },
    { name: "Tableau de bord", to: "/dashboard", icon: LayoutDashboard },
    { name: "Historique", to: "/historique", icon: History },
    { name: "Mes Notifications", to: "/notifications", icon: Bell },
    { name: "Nouvelle publication", to: "/nouvelle-publication", icon: Send },
    { name: "Mes groupes", to: "/mes-groupes", icon: Users },
    { name: "Nouvelle demande", to: "/nouvelle-demande", icon: FilePlus },
    { name: "Mes demandes", to: "/mes-demandes", icon: History },
    ...(profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'trésorier' || profile?.role?.toLowerCase() === 'présidente' || profile?.role?.toLowerCase() === 'président' || profile?.role?.toLowerCase() === 'commissaire'
      ? [{ name: "Validation publications", to: "/validation-publications", icon: CheckSquare }]
      : []),
    ...(profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'trésorier' || profile?.role?.toLowerCase() === 'présidente' || profile?.role?.toLowerCase() === 'président'
      ? [{ name: "Approbations", to: "/approbations", icon: FilePlus }]
      : []),
    ...(profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'trésorier'
      ? [{ name: "Nouvelle entrée", to: "/nouvelle-entree", icon: FilePlus }]
      : []),
    ...(profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'trésorier' || profile?.role?.toLowerCase() === 'présidente' || profile?.role?.toLowerCase() === 'président'
      ? [{ name: "Gestion membres", to: "/gestion-membres", icon: Users }]
      : []),
    ...(profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'commissaire'
      ? [{ name: "Journal d'Audit", to: "/audit", icon: History }]
      : [])
  ];

  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email?.split('@')[0] || "Connecté";
  const initials = profile ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() : "U";

  return (
    <aside className="w-full bg-[#1e2a5e] flex flex-col h-full">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl tracking-tight uppercase">SAS Finance</h1>
          <p className="text-blue-200 text-xs mt-1 opacity-70">Amicale UCAB Dakar</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-blue-200 hover:bg-white/5"
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-3 bg-[#12193b] text-white rounded-lg hover:bg-white/5 transition-colors mb-2 focus:outline-none"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-semibold">Déconnexion</span>
        </button>
        <div className="flex items-center space-x-3 p-3 bg-[#12193b] text-white rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-xs font-bold shrink-0 text-white">
            {initials || "U"}
          </div>
          <div className="text-sm min-w-0 pr-2">
            <p className="font-semibold text-white truncate" title={displayName}>{displayName}</p>
            <p className="text-xs text-blue-300 truncate">{profile?.role || "Utilisateur"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
