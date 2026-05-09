import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const { profile } = useAuth();
  
  let title = "Vue d'ensemble";
  switch(location.pathname) {
    case '/historique': title = "Historique des Transactions"; break;
    case '/nouvelle-demande': title = "Nouvelle Demande"; break;
    case '/nouvelle-entree': title = "Nouvelle Entrée"; break;
    case '/gestion-membres': title = "Gestion des Membres"; break;
    case '/audit': title = "Journal d'Audit"; break;
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
      <div className="flex items-center">
        <button 
          className="mr-4 text-slate-500 focus:outline-none lg:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-700">{title}</h2>
        {profile?.role?.toLowerCase() === 'commissaire' && (
          <span className="ml-4 bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200">
            Commissaire - Lecture seule
          </span>
        )}
      </div>
      <div className="flex items-center space-x-4 text-slate-500">
        <NotificationBell />
        <span className="text-sm font-medium">Dakar, {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </header>
  );
}

