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
  switch (location.pathname) {
    case "/dashboard": title = "Tableau de bord"; break;
    case "/historique": title = "Historique des Transactions"; break;
    case "/nouvelle-demande": title = "Nouvelle Demande"; break;
    case "/nouvelle-entree": title = "Nouvelle Entrée"; break;
    case "/gestion-membres": title = "Gestion des Membres"; break;
    case "/audit": title = "Journal d'Audit"; break;
    case "/actualites": title = "Actualités"; break;
    case "/mon-profil": title = "Mon Profil"; break;
    case "/mes-groupes": title = "Mes Groupes"; break;
    case "/notifications": title = "Notifications"; break;
    case "/nouvelle-publication": title = "Nouvelle publication"; break;
    case "/validation-publications": title = "Validation des publications"; break;
  }

  return (
    <header className="bg-surface-bright border-b border-outline-variant shadow-sm sticky top-0 z-40">
      <div className="flex justify-between items-center px-gutter py-unit w-full h-16">
        <div className="flex items-center gap-unit">
          <button
            className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full"
            onClick={onMenuClick}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-h2 text-h2 text-primary">{title}</span>
          {profile?.role?.toLowerCase() === "commissaire" && (
            <span className="ml-2 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-label-caps px-2 py-1 rounded">
              Lecture seule
            </span>
          )}
        </div>
        <div className="flex items-center gap-stack-md">
          <NotificationBell />
          <div className="flex items-center gap-stack-sm pl-stack-sm border-l border-outline-variant">
            {profile && (
              <div className="text-right hidden md:block">
                <p className="font-body-sm font-semibold text-on-surface">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-[10px] text-on-surface-variant font-label-caps uppercase">
                  {profile.role}
                </p>
              </div>
            )}
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold shrink-0 border border-outline-variant">
              {profile ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() : "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
