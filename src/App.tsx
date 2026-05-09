import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Announcements from "./pages/Announcements";
import PublicAnnouncements from "./pages/PublicAnnouncements";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import NewRequest from "./pages/NewRequest";
import NewIncome from "./pages/NewIncome";
import Approbations from "./pages/Approbations";
import MyRequests from "./pages/MyRequests";
import MembersManagement from "./pages/MembersManagement";
import AuditLogs from "./pages/AuditLogs";
import Notifications from "./pages/Notifications";
import MonProfil from "./pages/MonProfil";
import NewPublication from "./pages/NewPublication";
import ValidationPublications from "./pages/ValidationPublications";
import MesGroupes from "./pages/MesGroupes";
import GroupeDetail from "./pages/GroupeDetail";
import Layout from "./components/Layout";
import { AuthProvider } from "./components/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/actualites" element={<Announcements />} />
          <Route path="/actualites-publiques" element={<PublicAnnouncements />} />
          
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/historique" element={<History />} />
            <Route path="/nouvelle-demande" element={<NewRequest />} />
            <Route path="/mes-demandes" element={<MyRequests />} />
            <Route path="/nouvelle-entree" element={<NewIncome />} />
            <Route path="/approbations" element={<Approbations />} />
            <Route path="/gestion-membres" element={<MembersManagement />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profil" element={<MonProfil />} />
            <Route path="/mon-profil" element={<MonProfil />} />
            <Route path="/nouvelle-publication" element={<NewPublication />} />
            <Route path="/validation-publications" element={<ValidationPublications />} />
            <Route path="/mes-groupes" element={<MesGroupes />} />
            <Route path="/groupe/:id" element={<GroupeDetail />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
