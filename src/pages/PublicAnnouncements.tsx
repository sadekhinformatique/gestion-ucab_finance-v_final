import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Megaphone, Loader2, ArrowRight } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  pinned: boolean;
  created_at: string;
}

export default function PublicAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setAnnouncements(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1e2a5e] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">SAS Finance</h1>
            <p className="text-blue-200 text-sm">Amicale UCAB Dakar</p>
          </div>
          <div className="flex space-x-3">
            <Link to="/inscription" className="px-4 py-2 bg-white text-[#1e2a5e] text-sm font-bold rounded-lg hover:opacity-90">
              S'inscrire
            </Link>
            <Link to="/" className="px-4 py-2 border border-white/30 text-white text-sm font-bold rounded-lg hover:bg-white/10">
              Connexion
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800">Actualités</h2>
            <p className="text-sm text-slate-500">Informations publiées par le bureau de l'Amicale</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin inline text-slate-400" /></div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucune actualité pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.slice(0, 10).map(a => (
              <div key={a.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${a.pinned ? 'border-[#1e2a5e] ring-1 ring-[#1e2a5e]/20' : 'border-slate-200'}`}>
                {a.pinned && (
                  <div className="bg-[#1e2a5e] text-white text-[10px] font-bold uppercase px-4 py-1">Annonce importante</div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-slate-800">{a.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>
                  {a.image_url && (
                    <img src={a.image_url} alt="" className="mt-3 rounded-lg max-h-64 w-full object-cover" />
                  )}
                  <p className="mt-3 text-[11px] text-slate-400">
                    {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700">Vous êtes étudiant à l'UCAB ?</h3>
          <p className="mt-1 text-sm text-slate-500">Inscrivez-vous pour suivre toutes les actualités et accéder aux services de l'Amicale.</p>
          <div className="mt-4 flex justify-center space-x-3">
            <Link to="/inscription" className="inline-flex items-center px-6 py-3 bg-[#1e2a5e] text-white font-bold rounded-lg hover:opacity-90">
              Créer un compte <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link to="/" className="inline-flex items-center px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50">
              Se connecter
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400">
        SAS — Suivi des Finances de l'Amicale UCAB Dakar
      </footer>
    </div>
  );
}
