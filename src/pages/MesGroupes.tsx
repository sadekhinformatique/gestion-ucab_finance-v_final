import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

interface Groupe {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
  description: string | null;
  role: string;
  member_count?: number;
}

export default function MesGroupes() {
  const { profile } = useAuth();
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("membres_groupes").select("groupe_id, role, groupes!inner(*)").eq("user_id", profile.id)
      .then(({ data }) => {
        if (data) {
          const gs = data.map((d: any) => ({ ...d.groupes, role: d.role }));
          setGroupes(gs);
        }
        setLoading(false);
      });
  }, [profile]);

  const filieres = groupes.filter((g) => g.type === "filiere");
  const niveaux = groupes.filter((g) => g.type === "niveau");

  if (loading) return <div className="text-center py-12"><span className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full inline-block" /></div>;

  return (
    <div className="space-y-gutter">
      <div className="border-b border-outline-variant pb-stack-md">
        <h2 className="font-h1 text-h1 text-primary">Mes Groupes</h2>
        <p className="font-body-md text-on-surface-variant">Retrouvez vos groupes par filière et niveau</p>
      </div>

      <div className="flex items-center gap-gutter">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-md flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-container/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">group</span>
            </div>
            <div>
              <p className="text-[12px] font-label-caps text-on-surface-variant">Total Groupes</p>
              <p className="font-h3 text-h3 text-primary">{groupes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-md flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary-fixed/30 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">school</span>
            </div>
            <div>
              <p className="text-[12px] font-label-caps text-on-surface-variant">Filières</p>
              <p className="font-h3 text-h3 text-secondary">{filieres.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-stack-md flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-tertiary-fixed/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary">layers</span>
            </div>
            <div>
              <p className="text-[12px] font-label-caps text-on-surface-variant">Niveaux</p>
              <p className="font-h3 text-h3 text-tertiary">{niveaux.length}</p>
            </div>
          </div>
        </div>
      </div>

      {groupes.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 opacity-50">groups</span>
          <p className="font-medium">Vous n'êtes dans aucun groupe</p>
          <p className="text-sm">Ils seront créés automatiquement quand l'administrateur configurera les groupes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {groupes.map((g) => (
            <Link
              key={g.id}
              to={`/groupe/${g.id}`}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="h-32 bg-primary relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90" />
                <div className="absolute top-3 right-3">
                  <span className="bg-on-primary/20 text-on-primary text-[10px] font-label-caps px-2 py-0.5 rounded-full uppercase">
                    {g.type === "filiere" ? "Filière" : "Niveau"}
                  </span>
                </div>
                <div className="absolute bottom-3 left-4">
                  <h3 className="font-h3 text-h3 text-on-primary">{g.name}</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-3">
                  {g.description || `Groupe de ${g.type === "filiere" ? "filière" : "niveau"}`}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">group</span>
                    <span>{g.member_count || 0} membres</span>
                  </div>
                  <span className="text-primary font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Accéder
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
