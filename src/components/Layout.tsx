import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session && location.pathname !== "/") {
      navigate("/");
    }
  }, [session, loading, navigate, location]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background text-on-surface overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition duration-300 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-gutter max-w-container-max mx-auto w-full space-y-gutter">
          <Outlet />
        </main>
        <footer className="bg-surface-container-low border-t border-outline-variant mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center px-gutter py-stack-lg max-w-container-max mx-auto gap-stack-md">
            <div className="flex flex-col items-center md:items-start">
              <span className="font-label-caps text-label-caps text-primary">SAS – AMICALE UCAB DAKAR</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                © {new Date().getFullYear()} SAS – Amicale UCAB Dakar. Institutional Trust & Fiscal Responsibility.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
