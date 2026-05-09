# SAS — Guide Utilisateur

**Système de Suivi des Finances de l'Amicale UCAB Dakar**

---

## 1. Accès au site

**URL :** (fournie par l'administrateur après déploiement)

**Navigateurs recommandés :**
- Google Chrome (dernière version)
- Mozilla Firefox (dernière version)
- Microsoft Edge (dernière version)
- Safari (dernière version)

L'application est accessible depuis un ordinateur, une tablette ou un smartphone.

---

## 2. Connexion

### 2.1 Première connexion

1. Rendez-vous sur l'URL du site.
2. Saisissez votre **numéro de carte étudiant** (ex: `20260001`) ou votre **email**.
3. Saisissez le **mot de passe initial** communiqué par l'administrateur.
   - Par défaut : `votreprenom2026` (ex: `jean2026`).
4. Cliquez sur **Connexion**.

> ⚠️ Si vous n'avez pas encore de compte, contactez l'administrateur de l'amicale.

### 2.2 Mot de passe oublié ?

Contactez l'administrateur ou le président de l'amicale pour réinitialiser votre mot de passe.

---

## 3. Rôles et responsabilités

| Rôle | Responsabilités |
|---|---|
| **Membre** | Soumettre des demandes de dépense, consulter l'historique, recevoir des notifications |
| **Trésorier** | Enregistrer les entrées d'argent, approuver les demandes ≤ seuil, gérer les membres |
| **Président** | Valider les demandes > seuil, superviser la trésorerie |
| **Commissaire** | Vérifier les comptes (lecture seule), consulter les logs d'audit |
| **Administrateur** | Gérer les membres, configurer les filières/catégories, modifier le seuil |

---

## 4. Interface générale

Après connexion, vous accédez au **tableau de bord**. La navigation se fait via :

- **Barre latérale** (à gauche) : contient les liens vers les différentes pages, adaptés à votre rôle.
- **Barre du haut** : affiche la date, votre nom, et une **cloche de notifications** (badge rouge = notifications non lues).

---

## 5. Guide par rôle

### 5.1 Membre ordinaire

#### Soumettre une demande de dépense

1. Cliquez sur **Nouvelle demande** dans le menu.
2. Remplissez le formulaire :
   - **Catégorie** : choisissez le type de dépense.
   - **Montant** : saisissez le montant en FCFA.
   - **Description** : expliquez l'objet de la demande.
   - **Justificatif** : joignez un fichier (devis, facture, etc.).
3. Cliquez sur **Soumettre**.
4. Vous recevrez une notification dès que votre demande sera traitée.

#### Suivre ses demandes

1. Cliquez sur **Mes demandes** dans le menu.
2. Vous voyez toutes vos demandes avec leur statut :
   - `en_attente` : en attente d'approbation
   - `treasurer_approved` : approuvé par le trésorier, en attente du président
   - `validated_president` / `converted` : acceptée et convertie en transaction
   - `rejected` : refusée (le motif est affiché)

#### Consulter l'historique

Cliquez sur **Historique** pour voir toutes les transactions. Utilisez les filtres pour trier par type, catégorie, date ou mot-clé.

#### Notifications

- La cloche en haut à droite indique le nombre de notifications non lues.
- Cliquez dessus pour voir les dernières notifications.
- Cliquez sur **Voir tout** pour accéder à la page complète des notifications.

---

### 5.2 Trésorier

En plus des actions de membre, le trésorier peut :

#### Enregistrer une entrée d'argent

1. Cliquez sur **Nouvelle entrée**.
2. Remplissez : catégorie, montant, description, date.
3. Cliquez sur **Enregistrer**.
4. Une notification est envoyée aux membres concernés.

#### Approuver/rejeter des demandes

1. Cliquez sur **Approbations**.
2. Vous voyez toutes les demandes en attente.
3. Pour une demande **≤ seuil** (50 000 FCFA par défaut) :
   - Cliquez **Approuver** → la transaction est créée immédiatement.
4. Pour une demande **> seuil** :
   - Cliquez **Approuver** → la demande passe au président pour validation finale.
5. Pour refuser, cliquez **Rejeter** et saisissez le motif.

#### Gérer les membres

Accès à la liste des membres, possibilité de modifier les informations et d'activer/désactiver des comptes.

---

### 5.3 Président

1. Cliquez sur **Approbations**.
2. Vous voyez les demandes pré-approuvées par le trésorier (montant > seuil).
3. Cliquez **Valider** pour confirmer → la transaction est créée.
4. Cliquez **Rejeter** pour refuser en saisissant un motif.

---

### 5.4 Commissaire aux comptes

1. **Accès lecture seule** : vous ne pouvez pas créer de transaction ni de demande.
2. **Historique** : consultez et exportez (PDF/Excel) toutes les transactions.
3. **Audit** : consultez les logs de toutes les actions réalisées sur la plateforme (connexions, créations, approbations, etc.).
4. Les exports incluent le logo de l'amicale et les totaux.

---

### 5.5 Administrateur

1. **Gestion des membres** : créez, modifiez, activez/désactivez des comptes.
   - À la création, un mot de passe temporaire est généré.
2. **Filières** : ajoutez ou modifiez les filières et niveaux (L1, L2, L3...).
3. **Catégories** : gérez les catégories de dépenses.
4. **Configuration** : le seuil de dépense importante est modifiable dans la base de données.
5. **Audit** : accès complet aux logs.

---

## 6. Exports PDF et Excel

### Depuis la page Historique

1. Cliquez sur **Exporter PDF** → télécharge un fichier avec :
   - Logo de l'amicale
   - Période et filtres appliqués
   - Tableau des transactions
   - Totaux (entrées, dépenses, solde)
2. Cliquez sur **Exporter Excel** → télécharge un fichier `.xlsx` exploitable dans Excel ou LibreOffice.

---

## 7. FAQ

**Q : J'ai oublié mon mot de passe.**
R : Contactez l'administrateur ou le président de l'amicale. Ils peuvent réinitialiser votre mot de passe dans la page **Gestion des membres**.

**Q : Je n'arrive pas à me connecter.**
R : Vérifiez que vous utilisez le bon numéro de carte étudiant. Si le problème persiste, votre compte est peut-être désactivé. Contactez l'administrateur.

**Q : Puis-je modifier ma demande après l'avoir soumise ?**
R : Non, une fois soumise, la demande ne peut plus être modifiée. Vous devez contacter le trésorier ou l'administrateur.

**Q : Comment savoir si ma demande a été acceptée ?**
R : Vous recevrez une notification (cloche en haut à droite). Vous pouvez aussi consulter **Mes demandes**.

**Q : Le justificatif est trop volumineux.**
R : Réduisez la taille du fichier (image compressée ou PDF allégé). La limite est celle de Supabase (gratuit : 100 Mo par bucket).

**Q : L'export PDF ne montre pas le logo.**
R : L'administrateur doit configurer l'URL du logo dans la table `app_config` (colonne `logo_url`).

**Q : Que faire en cas de bug ou d'erreur ?**
R : Signalez-le à l'administrateur avec une capture d'écran et les étapes pour reproduire le problème.

---

## 8. Contact

Pour toute question ou assistance :

- **Administrateur :** Djahfar Sadekh Ouedraogo — djahfarsadekh2015@gmail.com
- **Président de l'Amicale :** (à compléter)
- **Trésorier :** (à compléter)

---

*Document généré le 09/05/2026 — SAS Amicale UCAB Dakar v1.0*
