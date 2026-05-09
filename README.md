# SAS — Suivi des Finances de l'Amicale UCAB Dakar

Application web de gestion financière pour l'Amicale des Étudiants de l'Université UCAB Dakar.

**Tech stack :** React 19 · TypeScript · Vite · Supabase (Auth + DB + Storage) · TailwindCSS 4 · jsPDF · SheetJS

---

## Table des matières

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation locale](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Rôles et permissions](#rôles-et-permissions)
- [Déploiement](#déploiement)
- [Build & preview](#build--preview)

---

## Architecture

```
src/
├── main.tsx              # Point d'entrée React
├── App.tsx               # Routeur (react-router-dom v7)
├── index.css             # Styles Tailwind + Google Fonts
├── lib/
│   ├── supabase.ts       # Client Supabase
│   └── audit.ts          # Fonction de journalisation des actions
├── components/
│   ├── AuthProvider.tsx   # Contexte d'authentification (session, profil, rôle)
│   ├── Layout.tsx         # Layout connecté (sidebar + header + contenu)
│   ├── Header.tsx         # Barre du haut (titre, date, cloche notifications)
│   ├── Sidebar.tsx        # Navigation latérale (adaptée au rôle)
│   └── NotificationBell.tsx # Dropdown notifications en temps réel
└── pages/
    ├── Login.tsx               # Connexion / inscription
    ├── Dashboard.tsx           # Tableau de bord
    ├── History.tsx             # Historique et exports PDF/Excel
    ├── NewRequest.tsx          # Nouvelle demande de dépense
    ├── NewIncome.tsx           # Nouvelle entrée d'argent
    ├── Approbations.tsx        # Approbations (workflow trésorier → président)
    ├── MyRequests.tsx          # Mes demandes
    ├── MembersManagement.tsx   # Gestion des membres
    ├── AuditLogs.tsx           # Logs d'audit (admin/commissaire)
    └── Notifications.tsx       # Centre de notifications
```

### Workflow des dépenses

```
Membre → soumet une demande
  └→ Trésorier approuve
       ├→ Si montant ≤ seuil (50 000 FCFA) → transaction créée
       └→ Si montant > seuil → Président valide → transaction créée
```

---

## Prérequis

- Node.js ≥ 18
- npm ≥ 9
- Un projet Supabase (gratuit) avec Auth Email/Password activé

---

## Installation locale

```bash
# 1. Cloner le dépôt
git clone <votre-url>
cd sas-amicale-ucab-dakar

# 2. Installer les dépendances
npm install

# 3. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés Supabase

# 4. Lancer en développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé anon/publique Supabase | `eyJ...` |

Ces variables sont **injectées à build time** par Vite. En production (Netlify), les définir dans **Site settings → Environment variables**.

---

## Base de données

Le fichier [`database/init.sql`](database/init.sql) contient la totalité du schéma :

- Tables : `profiles`, `transactions`, `expense_requests`, `expense_categories`, `filieres`, `notifications`, `audit_log`, `app_config`
- Index
- Politiques RLS (Row Level Security)
- Bucket Storage `justificatifs`
- Trigger `updated_at`

**Exécution :** Copier-coller le contenu dans l'éditeur SQL de Supabase puis **Run**.

> ⚠️ Après exécution, désactiver l'insertion anonyme dans `profiles` si vous utilisez l'inscription publique (optionnel).

---

## Rôles et permissions

| Rôle | Accès |
|---|---|
| `Admin` | Tout : membres, finances, logs, configuration |
| `Trésorier` | Entrées d'argent, approbations < seuil, gestion membres |
| `Président` / `Presidente` | Validation finale des dépenses > seuil |
| `Commissaire` | Lecture seule : historique, logs d'audit, exports |
| `Membre` | Soumettre demandes, voir son historique, notifications |

---

## Déploiement

Voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md) pour les instructions détaillées.

**TL;DR — Netlify :**
```bash
npm run build
# Glisser-déposer dist/ dans Netlify
# Ajouter VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les env vars
```

---

## Build & preview

```bash
npm run build          # Génère dist/
npm run preview        # Sert dist/ localement pour vérifier le build
npm run lint           # Vérification TypeScript
```

---

## Licence

Projet interne — Amicale UCAB Dakar.
