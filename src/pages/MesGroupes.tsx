import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";
import { Users, Loader2, ChevronRight, BookOpen } from "lucide-react";

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

  const filieres = groupes.filter(g => g.type === 'filiere');
  const niveaux = groupes.filter(g => g.type === 'niveau');

  if (loading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin inline text-slate-400" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-black text-slate-800">Mes Groupes</h2>

      {groupes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Vous n'êtes dans aucun groupe</p>
          <p className="text-sm">Ils seront créés automatiquement quand l'administrateur configurera les groupes.</p>
        </div>
      ) : (
        <>
          {filieres.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase">Filières</h3>
              {filieres.map(g => (
                <Link key={g.id} to={`/groupe/${g.id}`} className="block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-[#1e2a5e] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1e2a5e]/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-[#1e2a5e]" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{g.name}</p>
                        <p className="text-xs text-slate-400">{g.role === 'admin_groupe' ? 'Responsable' : 'Membre'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {niveaux.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase">Niveaux</h3>
              {niveaux.map(g => (
                <Link key={g.id} to={`/groupe/${g.id}`} className="block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-[#1e2a5e] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{g.name}</p>
                        <p className="text-xs text-slate-400">{g.role === 'admin_groupe' ? 'Responsable' : 'Membre'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
