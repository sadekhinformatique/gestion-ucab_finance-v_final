# Déploiement — SAS Amicale UCAB Dakar

## Sommaire

1. [Préparation](#1-préparation)
2. [Déploiement Netlify (recommandé)](#2-déploiement-netlify-recommandé)
3. [Déploiement LWS / FTP](#3-déploiement-lws--ftp)
4. [Configuration Supabase](#4-configuration-supabase)

---

## 1. Préparation

### 1.1 Build de l'application

```bash
# À la racine du projet
npm install
npm run build
```

Le dossier `dist/` est généré. C'est lui qui sera déployé.

### 1.2 Vérifier les variables d'environnement

Vérifier que `src/lib/supabase.ts` utilise `import.meta.env` :

```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'fallback_url';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'fallback_key';
```

Les clés en dur (fallback) fonctionnent mais **ne sont pas recommandées** en production. Préférez les variables d'environnement.

### 1.3 Fichiers attendus à la racine

- `netlify.toml` — redirection SPA (toutes les routes → `index.html`)
- `.env.example` — modèle des variables requises

---

## 2. Déploiement Netlify (recommandé)

### 2.1 Créer le site

1. Aller sur [netlify.com](https://netlify.com) et se connecter (gratuit).
2. Cliquer sur **Sites** → **Add new site** → **Deploy manually**.
3. Glisser-déposer le dossier `dist/` dans la zone prévue.
4. Netlify déploie immédiatement et génère une URL (`xxx.netlify.app`).

### 2.2 Configurer les variables d'environnement

1. Dans le dashboard du site, aller dans **Site configuration** → **Environment variables**.
2. Ajouter :

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://votre-projet.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (clé anon) |

3. Aller dans **Deploys** → **Trigger deploy** → **Clear cache and deploy** pour rebuild.

### 2.3 Activer HTTPS

Par défaut, Netlify active HTTPS automatiquement via Let's Encrypt.

### 2.4 (Optionnel) Nom de domaine personnalisé

1. **Site configuration** → **Domain management** → **Add custom domain**.
2. Entrer votre domaine (ex: `sas.amicale-ucab.sn`).
3. Configurer les enregistrements DNS chez votre registrar (CNAME ou NS).
4. Attendre la validation (quelques minutes à 48h).

### 2.5 Notifications de déploiement

Vous pouvez brancher Netlify à GitHub/GitLab pour des déploiements automatiques à chaque `git push` sur la branche principale.

---

## 3. Déploiement LWS / FTP

### 3.1 Générer le build

```bash
npm run build
```

### 3.2 Transférer les fichiers

1. Se connecter au FTP LWS (FileZilla ou similaire).
2. Transférer **tout le contenu** du dossier `dist/` vers le dossier public du serveur (souvent `www/` ou `public_html/`).

### 3.3 Configurer les redirections SPA

Ajouter un fichier `.htaccess` à la racine du dossier publié :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 3.4 Variables d'environnement

Si le serveur LWS ne supporte pas les variables d'environnement, **modifier directement** `src/lib/supabase.ts` avant le build :

```ts
const supabaseUrl = 'https://votre-projet.supabase.co';
const supabaseKey = 'votre-cle-anon';
```

Puis rebuild et retransférer.

---

## 4. Configuration Supabase

### 4.1 Exécuter le script SQL

1. Aller dans le dashboard Supabase → **SQL Editor**.
2. Copier-coller le contenu de [`database/init.sql`](database/init.sql).
3. Cliquer **Run**.

### 4.2 Activer Auth Email/Password

1. **Authentication** → **Providers** → **Email** → Activer.
2. Désactiver **Confirm email** (simplifie l'inscription pour les tests ; optionnel).

### 4.3 Créer un compte admin

Une fois le site déployé :

1. Aller sur le site → cliquer **Créer un compte** avec l'email `djahfarsadekh2015@gmail.com` et un mot de passe.
2. Le profil admin est créé automatiquement (voir `Login.tsx`).

### 4.4 Ajouter des catégories de dépenses et filières

Se connecter en admin → **Gestion** → onglets **Filières** et **Catégories**.

### 4.5 Modifier le seuil de dépense importante

Par défaut : **50 000 FCFA**. Pour le modifier :

```sql
UPDATE public.app_config SET value = '100000' WHERE key = 'threshold';
```

---

## Voir aussi

- [README.md](README.md) — documentation développeur
- [CHECKLIST_TEST.md](CHECKLIST_TEST.md) — tests de validation pré-déploiement
- [DOCUMENTATION_UTILISATEUR.md](DOCUMENTATION_UTILISATEUR.md) — guide pour les membres
