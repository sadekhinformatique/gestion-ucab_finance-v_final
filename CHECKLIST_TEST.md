# Checklist de validation — Avant mise en ligne

## 1. Authentification

- [ ] La page de connexion s'affiche correctement (logo SAS, champs email/carte + mot de passe).
- [ ] Connexion avec un **numéro de carte étudiant** (ex: `20260001`) fonctionne.
- [ ] Connexion avec un **email** fonctionne.
- [ ] Un message d'erreur clair s'affiche si identifiants incorrects.
- [ ] La création de compte fonctionne.
- [ ] Après connexion, redirection vers `/dashboard`.
- [ ] La déconnexion fonctionne (bouton dans la sidebar).

## 2. Rôles — Tests par profil

### Admin (compte `djahfarsadekh2015@gmail.com`)

- [ ] Connexion réussie, profil reconnu comme **Admin**.
- [ ] Sidebar affiche tous les liens : Dashboard, Historique, Nouvelle Demande, Mes Demandes, Nouvelle Entrée, Approbations, Gestion, Audit, Notifications.
- [ ] Accès à la page **Gestion** (gestion-membres).
- [ ] Peut créer un nouveau membre (carte étudiant, nom, prénom, filière, niveau, rôle).
- [ ] Un mot de passe temporaire est affiché après la création.
- [ ] Peut modifier un membre existant (nom, rôle, etc.).
- [ ] Peut activer/désactiver un membre.
- [ ] Peut modifier le seuil de dépense importante (via SQL si pas d'UI dédiée).
- [ ] Peut voir les logs d'audit (`/audit`).

### Trésorier

- [ ] Sidebar inclut : Dashboard, Historique, Nouvelle Entrée, Approbations, Gestion, Notifications.
- [ ] Peut enregistrer une **entrée d'argent** (montant, catégorie, description).
- [ ] L'entrée apparaît dans le Dashboard et l'Historique.
- [ ] **Notification** reçue par les autres membres de la nouvelle entrée (si implémenté).
- [ ] Peut voir les demandes de dépense en attente dans **Approbations**.
- [ ] Peut **approuver** une demande de dépense inférieure au seuil → transaction créée.
- [ ] Peut **rejeter** une demande avec motif.

### Président / Presidente

- [ ] Sidebar inclut : Dashboard, Approbations, Gestion, Notifications.
- [ ] Peut voir les demandes marquées `treasurer_approved` dans les approbations.
- [ ] Peut **valider** une demande importante → transaction créée.
- [ ] Peut **rejeter** une demande importante avec motif.

### Commissaire

- [ ] Sidebar inclut : Dashboard, Historique, Audit, Notifications.
- [ ] Badge "Lecture seule" affiché dans l'en-tête.
- [ ] Accès **lecture seule** à l'Historique.
- [ ] Accès aux **logs d'audit** (`/audit`).
- [ ] Peut exporter PDF/Excel.
- [ ] Ne peut PAS créer de demande ou d'entrée.

### Membre ordinaire

- [ ] Sidebar inclut : Dashboard, Historique, Nouvelle Demande, Mes Demandes, Notifications.
- [ ] Peut soumettre une **demande de dépense** (catégorie, montant, description, justificatif).
- [ ] Peut voir ses demandes dans **Mes Demandes**.
- [ ] Statut des demandes s'affiche correctement (en attente → approuvé trésorier → validé président / converti).
- [ ] Peut voir l'historique des transactions (propres).

## 3. Workflow dépenses

### 3.1 Demande ≤ seuil (ex: 10 000 FCFA)

- [ ] Membre soumet une demande.
- [ ] Trésorier voit la demande dans Approbations (statut `en_attente`).
- [ ] Trésorier approuve → statut passe à `converted`.
- [ ] Une transaction de type `depense` est créée.
- [ ] Le demandeur reçoit une notification.
- [ ] Le solde du Dashboard est mis à jour.

### 3.2 Demande > seuil (ex: 100 000 FCFA)

- [ ] Membre soumet une demande.
- [ ] Trésorier voit la demande et l'approuve → statut `treasurer_approved`.
- [ ] Président voit la demande dans Approbations (statut `treasurer_approved`).
- [ ] Président valide → statut `converted`, transaction créée.
- [ ] Le demandeur reçoit une notification.

## 4. Fonctionnalités générales

### Dashboard

- [ ] Le solde actuel s'affiche.
- [ ] Le total des dépenses du mois s'affiche.
- [ ] Le nombre de membres actifs s'affiche.
- [ ] Le tableau des dernières transactions s'affiche.
- [ ] Les alertes (dépenses importantes récentes) s'affichent.
- [ ] Les données sont à jour après chaque action.

### Historique

- [ ] Toutes les transactions s'affichent avec date, catégorie, montant, description.
- [ ] Les filtres par type (entrée/dépense) fonctionnent.
- [ ] Les filtres par catégorie fonctionnent.
- [ ] Les filtres par date fonctionnent.
- [ ] La recherche par mot-clé fonctionne.
- [ ] **Export PDF** : le fichier généré contient le logo, les en-têtes, et les totaux.
- [ ] **Export Excel** (.xlsx) : le fichier généré contient les données structurées.

### Notifications

- [ ] Le badge cloche (Header) affiche le nombre de notifications non lues.
- [ ] Le dropdown des notifications affiche les dernières notifications.
- [ ] Cliquer sur "Voir tout" redirige vers `/notifications`.
- [ ] Marquer une notification comme lue met à jour le badge.
- [ ] La page Notifications liste toutes les notifications avec filtre lu/non lu.

### Audit Logs

- [ ] Les actions sont journalisées (connexion, création membre, approbation, rejet, etc.).
- [ ] Seuls Admin et Commissaire peuvent voir les logs.
- [ ] Les logs sont en lecture seule (pas de modification possible).

## 5. Responsive & UI

- [ ] La sidebar se masque sur mobile (burger menu ou similaire).
- [ ] Les tableaux sont scrollables horizontalement sur mobile.
- [ ] Les formulaires sont utilisables sur écran ≤ 768px.
- [ ] Les couleurs et la charte graphique sont cohérentes.

## 6. Sécurité

- [ ] Les routes non autorisées redirigent vers la page de connexion.
- [ ] Les clés API Supabase exposées côté client sont des **clés anon** (pas de `service_role`).
- [ ] Les politiques RLS sont actives et fonctionnent (vérifier en désactivant une politique).
- [ ] Le bucket `justificatifs` est en lecture publique mais écriture authentifiée.
- [ ] Le compte admin par défaut existe et fonctionne.

## 7. Pré-déploiement

- [ ] `npm run build` se termine sans erreur.
- [ ] `npm run lint` ne remonte aucune erreur bloquante.
- [ ] `npm run preview` sert correctement l'application en local.
- [ ] Les variables d'environnement sont configurées sur la plateforme de déploiement.
- [ ] Le fichier `netlify.toml` (ou `.htaccess`) est présent pour le routage SPA.
- [ ] La base de données Supabase est initialisée avec `database/init.sql`.

---

## Récapitulatif des comptes de test

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Admin | `djahfarsadekh2015@gmail.com` | (celui défini lors de la création) |
| Membre | (créé par admin) | `prenom2026` (par défaut) |
| Trésorier | (créé par admin) | `prenom2026` |
| Président | (créé par admin) | `prenom2026` |
| Commissaire | (créé par admin) | `prenom2026` |
