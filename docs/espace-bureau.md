# Espace bureau — hub et contrat technique

## Vue d'ensemble du hub

`/espace-bureau` est un **hub à comptes individuels** (administration des comptes à `/espace-bureau/administration`, `/espace-bureau/admin` redirige). Une même connexion (`/espace-bureau/connexion`, cookie `succieu_hub`) donne accès aux modules autorisés, dans le groupe de pages `app/espace-bureau/(hub)/`. Tout le hub est en `noindex`, hors sitemap, `Disallow` dans `robots.txt` (ainsi que `/api/`).

| Module (`id`) | Page | Contenu | Doc |
|---|---|---|---|
| `actus-agenda` | `/espace-bureau/actualites` (+ `/moderation`, admin seulement) | Saisie des actualités et de l'agenda, relecture par l'agent, modération | ci-dessous |
| `espace-bureau` | `/espace-bureau/bureau` | Suivi des dossiers du bureau (porté de suivi.succieu.fr) | « Module Espace Bureau » |
| `salle-des-fetes` | `/espace-bureau/salle-des-fetes` | Réservations, conflits, exports, journal (porté de sdf.succieu.fr) | « Module Salle des fêtes » |
| `documents` | `/espace-bureau/documents` | Lien vers le drive (`BUREAU_DRIVE_URL`) | `lib/hub/drive.ts` |

**Droits** : rôle `admin` (tout en écriture, administration des comptes, modération) ou `membre` avec un niveau par module : `none` (invisible), `read`, `write`. Les mots de passe sont attribués par l'administrateur (généré `xxxx-xxxx-xxxx` ou saisi, affiché une seule fois) et ne peuvent pas être changés par la personne ; ils sont les mêmes sur le hub et sur le drive quand la synchro est active (voir « Synchronisation des comptes avec le drive ») ; le dernier administrateur actif ne peut être ni désactivé ni rétrogradé. **Variables** : voir la section suivante. **Premier administrateur** : `scripts/hub-create-admin.mjs`. **Migration** depuis les anciennes applications : `scripts/hub-migrate.mjs` (`--dry-run` par défaut, `--apply` explicite : comptes depuis une liste hors dépôt + fiche imprimable 0600, import du suivi, import de la salle des fêtes ; idempotent). **Déploiement et retour arrière** : `docs/deploiement-hub.md` ; redirections `deploy/nginx/`.

Tests : `npm test` (dont `lib/hub/parcours.test.ts` : admin crée un compte avec mot de passe attribué, connexion directe, droits par module, reset, migration ; `lib/hub/drive-sync.test.ts` : synchro drive contre un faux serveur local) et `node scripts/e2e-hub.mjs` (mêmes parcours sur les vraies routes HTTP après `next build`).

---

Le bureau municipal soumet des actualités (carrousel d'accueil) et des rendez-vous (agenda). Un agent Timon relit chaque saisie (avis + version corrigée), puis Florent (admin) publie ou rejette. Le reste de ce document fixe le contrat technique utilisé par les volets interface, relecture agent et pages publiques.

## Variables d'environnement

Voir `.env.example`. Aucun secret dans le dépôt.

| Variable | Rôle |
|---|---|
| `DATA_DIR` | Dossier des données hors build. Défaut `./data` (dev, ignoré par git) ; prod `/var/lib/succieu-web` (propriétaire `loic`). |
| `SESSION_SECRET` | Clé HMAC des sessions, 32 caractères minimum. |
| `REVIEW_API_TOKEN` | Jeton Bearer de l'agent de relecture, 24 caractères minimum. |
| `BUREAU_DRIVE_URL` | Facultatif : adresse https du drive (module Documents) ; défaut `https://drive.succieu.fr/`. |
| `DRIVE_URL` | Facultatif : adresse https du drive oCIS **pour la synchronisation des comptes** (ex. `https://drive.succieu.fr`). Distincte de `BUREAU_DRIVE_URL` (simple lien). |
| `DRIVE_ADMIN_USER` | Facultatif : compte administrateur oCIS (`admin`). |
| `DRIVE_ADMIN_PASSWORD` | Facultatif, **secret** : mot de passe de ce compte (jamais dans le dépôt). Les trois variables `DRIVE_*` doivent être présentes ; sinon la synchro est désactivée et le hub fonctionne seul (préversion, tests). |
| `DRIVE_MAIL_DOMAIN` | Facultatif : domaine de l'adresse technique (`<identifiant>@<domaine>`, défaut `drive.succieu.fr`) exigée par oCIS à la création d'un compte drive. |
| `HUB_SESSION_HOURS` | Facultatif : durée de la session du hub en heures (défaut 2160 = 90 jours). |
| `SITE_ORIGINS` | Facultatif : origines supplémentaires acceptées pour les écritures (séparées par des virgules). |

Les anciennes variables `BUREAU_PASSWORD_HASH` et `ADMIN_PASSWORD_HASH` (mots de passe communs) sont **supprimées** : la connexion passe par les comptes individuels du hub. Elles peuvent être retirées de l'environnement du service. Empreinte scrypt (utilitaire de diagnostic, hors fonctionnement du hub) : `node scripts/hash-password.mjs` (saisie masquée, ou mot de passe sur l'entrée standard). Format : `scrypt$N$r$p$sel(base64)$empreinte(base64)`. Les `$` doivent être échappés dans un `.env` lu par Next (`\$`) ou la valeur mise entre apostrophes dans un `EnvironmentFile` systemd. Une variable de session ou de relecture manquante renvoie `server_misconfigured`.

## Stockage (`DATA_DIR`)

- `articles.json`, `events.json` : tableaux de saisies.
- `users.json` : comptes du hub. `bureau.json` (anciens noms) n'est plus lu : il est conservé tel quel, lisible, pour la migration des comptes (les `author` déjà enregistrés restent de simples libellés texte).
- `uploads/` : images (`<32 hex>.jpg|png|webp`).
- Écriture atomique (fichier temporaire + `rename`) ; verrou : file d'attente par processus + fichier `.lock` (`O_EXCL`, périmé après 15 s).

## Modèle (`lib/content/types.ts`)

Saisie : `id` (`a-<16 hex>` article, `e-<16 hex>` événement), `kind` (`"article"|"event"`), `author`, `createdAt` (ISO), `status` (`"submitted"|"reviewed"|"published"|"rejected"`), `original`, `review?` (`ok`, `issues[]`, `corrected`, `summary`, `reviewedAt`), `published?` (`version` `"original"|"corrected"`, `fields`, `publishedAt`), `rejectionReason?`, `history[]` (`at`, `action`, `by`, `note?`).

Champs article : `title` (≤ 90), `summary` (chapeau carrousel, ≤ 280), `body` (≤ 5000), `linkUrl?` (http(s) ou chemin `/…`), `linkLabel?` (≤ 60, exige `linkUrl`), `image?` (nom renvoyé par l'upload), `publishedAt` (AAAA-MM-JJ).

Champs événement : `title` (≤ 90), `date` (AAAA-MM-JJ), `startTime?`, `endTime?` (HH:MM ; fin ≥ début, fin exige début), `place` (≤ 120), `description` (≤ 2000), `linkUrl?`.

Images : jpeg/png/webp en entrée (type vérifié par signature), plafond technique 40 Mo. Chaque image est redressée (EXIF), réduite à 2 000 px de côté maximum, convertie en WebP qualité 80 sans métadonnées (GPS supprimé) par sharp, renommée aléatoirement (`<hex>.webp`) et servie par `GET /api/uploads/<nom>`. Les anciens noms `.jpg`/`.png` restent lisibles. En production, nginx doit accepter ces envois : `client_max_body_size 41m;` sur succieu.fr.

Transitions (`lib/content/transitions.ts`) : `submitted → reviewed` (agent) ; `submitted|reviewed → published|rejected` (admin) ; `published` et `rejected` sont terminaux. Publier `"corrected"` exige un avis. Chaque transition ajoute une entrée d'historique (`by` : nom affiché du compte, `agent`, `admin`).

Fonctions serveur réutilisables (`lib/content/store.ts`) : `getPublishedArticles(limit?)` (récentes d'abord, dates futures masquées), `getUpcomingEvents(from = aujourd'hui Paris)` (chronologique). Elles lisent le disque à chaque appel : les pages qui les utilisent doivent être dynamiques ou revalidées (la publication appelle `revalidatePath("/", "layout")`).

## Authentification

Toute session humaine est celle du hub (section suivante) : cookie `succieu_hub`, comptes individuels. Les anciens cookies `succieu_bureau` / `succieu_admin`, la connexion par mot de passe commun et le choix du nom dans une liste sont **supprimés**. L'auteur d'une saisie est le `displayName` du compte connecté.

- Toute requête qui écrit (POST) doit porter `Origin` (ou `Referer`) identique à l'hôte du site (`Host`/`X-Forwarded-Host`) ou listé dans `SITE_ORIGINS`, sinon `bad_origin`. Les routes de relecture agent (Bearer `REVIEW_API_TOKEN`) n'utilisent pas de cookie et sont exemptées.
- Droits du module `actus-agenda` : `read` = voir ses saisies et l'historique ; `write` = soumettre (et téléverser une image) ; modération (publier / rejeter, liste complète) = rôle `admin` (`requireAdmin`).

## Authentification du hub (comptes individuels)

Le hub `/espace-bureau` a remplacé les anciens mots de passe communs. Code : `lib/hub/`.

- **Comptes** : `DATA_DIR/users.json` (écriture atomique + verrou). Champs : `id` stable, `identifier` (prénom en minuscules sans accent, unique ; la saisie à la connexion est normalisée), `displayName`, `role` (`admin` | `membre`), `active`, `passwordHash` (scrypt, `lib/auth/password.ts`), `passwordVersion`, `driveLogin` (facultatif, défaut = `identifier`), `driveSync` (`{ at?, error? }`, sans secret), `rights`, `createdAt`, `updatedAt`.
- **Droits** : `{ "actus-agenda" | "espace-bureau" | "salle-des-fetes" | "documents": "none" | "read" | "write" }` ; un module absent vaut `none` ; un admin a `write` partout. Registre des modules (id, libellé, chemin, description) : `lib/hub/modules.ts`, unique endroit à compléter par les volets suivants.
- **Session** : cookie `succieu_hub`, jeton `base64url({uid, pv, exp}).HMAC-SHA256` (`SESSION_SECRET`), httpOnly, `Secure` en production, **`SameSite=Lax`** (Strict casse l'ouverture depuis un lien WhatsApp : le cookie n'est pas envoyé au rechargement), durée `HUB_SESSION_HOURS` (90 jours par défaut). Invalidée si le compte est désactivé ou si le mot de passe change (`pv` ≠ `passwordVersion`).
- **Mots de passe attribués par l'administrateur uniquement** (décision du 24/11/2026) : l'utilisateur ne peut pas changer son mot de passe (ni écran, ni route ; « Mon compte » renvoie à l'administrateur). À la création et à la réinitialisation, l'administrateur choisit « Générer » (`xxxx-xxxx-xxxx`, lisible) ou saisit un mot de passe (10 caractères minimum). Il est renvoyé une seule fois (copier / imprimer), jamais journalisé ni relu. Plus de changement imposé : l'ancien champ `mustChangePassword` d'un `users.json` existant est ignoré et disparaît à la prochaine écriture du compte (aucun compte bloqué). Un administrateur peut réinitialiser son propre mot de passe.
- **Limitation** : 5 échecs / 15 min par IP **et** par identifiant (mémoire du processus), puis 429 `rate_limited` + `Retry-After`. Un identifiant verrouillé l'est même avec le bon mot de passe.
- **Audit** : `DATA_DIR/hub-audit.jsonl`, une ligne JSON `{date, actor, action, detail?, ip?}` (connexions, échecs, créations, droits, réinitialisations) ; jamais de mot de passe ni d'empreinte.

| Méthode et chemin | Accès | Description |
|---|---|---|
| `POST /api/hub/login` | public + origine | `{ identifier, password }` → session (`authenticated`, `user`, `role`, `rights`) + cookie. 401 générique si identifiant inconnu, mot de passe faux ou compte désactivé. |
| `POST /api/hub/logout` | origine | Efface le cookie. |
| `GET /api/hub/session` | connecté | Même corps que la connexion ; 401 sans session. |

**Gardes serveur** (`lib/hub/guards.ts`, logique pure testable dans `lib/hub/access.ts`) : `requireUser()`, `requireAdmin()`, `requireModule(module, "read" | "write", req?)` — avec `req`, une écriture exige aussi l'origine (`assertSameOrigin`). Erreurs : 401 `unauthorized`, 403 `forbidden`.

**Bibliothèque admin** (`lib/hub/users.ts`, utilisée par le volet 2) : `createUser`, `setActive`, `setPassword`, `setDriveState`, `updateRoleAndRights`, `listUsers`, `toPublic`. Impossible de désactiver ou rétrograder le dernier admin actif (409 `invalid_transition`).

**Premier admin** (sur le serveur, saisie masquée) : `DATA_DIR=/var/lib/succieu-web node scripts/hub-create-admin.mjs <prenom> ["Nom affiché"]`.

## Console d'administration des comptes (`/espace-bureau/administration`)

Page `noindex` (sous `/espace-bureau`, donc hors sitemap et `Disallow` dans `robots.txt`), servie dans la coquille du hub (groupe `(hub)`, garde `requireHubPageUser` + rôle `admin` ; un membre est redirigé vers l'accueil, la connexion et le mot de passe imposé sont ceux de la coquille). L'ancienne URL `/espace-bureau/admin` redirige (permanent) vers celle-ci. Présentation **compacte** : un tableau (nom, identifiant, rôle, actif, droits résumés, état du drive, dernière connexion tirée du journal) et un **panneau de modification d'un seul compte à la fois** (rôle, grille de droits Aucun / Lecture / Écriture à enregistrement explicite, identifiant du drive, réinitialisation du mot de passe, désactivation / réactivation). Création (identifiant proposé = prénom sans accent, modifiable ; identifiant du drive si différent). Choix du mot de passe « Générer » ou « Saisir » à la création et à la réinitialisation ; affiché une seule fois (copier / imprimer), jamais relu ni journalisé. Écran **« Comptes du drive »** (visible si la synchro est active) : comparaison hub ↔ drive en lecture seule (comptes drive sans compte hub, comptes hub sans compte drive, désactivés d'un côté seulement) et action « Rattacher ». Journal filtrable par personne. Confirmation dans la page (bandeau Confirmer / Annuler, pas de `window.confirm`) avant enregistrement, réinitialisation et (dés)activation. Garde-fous : on ne peut ni se désactiver, ni changer son propre rôle (409 `invalid_transition`) ; le dernier admin actif est protégé (bibliothèque `lib/hub/users.ts`).

Logique : `lib/hub/admin.ts` (testée dans `lib/hub/admin.test.ts`) ; composants : `components/hub-admin/`. Toutes les routes exigent la session hub admin (401/403) et, en écriture, l'origine.

| Méthode et chemin | Description |
|---|---|
| `GET /api/admin/users` | `{ users }` (vue publique + `lastLogin`, sans empreinte). |
| `POST /api/admin/users` | `{ displayName, identifier?, role?, rights?, driveLogin?, passwordMode?: "generate"\|"custom", password? }` → 201 `{ user, password, drive }` (`drive.status` : `disabled`, `created`, `attached`). Le drive passe d'abord : s'il refuse (502 `drive_sync_failed`), rien n'est créé. |
| `PATCH /api/admin/users/<id>` | `{ role?, rights?, displayName?, driveLogin? }` → `{ user }` ; journalisé (`user.update`). |
| `POST /api/admin/users/<id>/active` | `{ active: boolean }` → `{ user, drive }`. Le hub change toujours ; le drive suit (`accountEnabled`), un échec est consigné dans `driveSync.error` et renvoyé (`drive.status: "error"`). |
| `POST /api/admin/users/<id>/reset-password` | `{ passwordMode?, password? }` → `{ user, password, drive }` (une seule fois). Le drive d'abord : refus ⇒ 502 `drive_sync_failed`, hub inchangé (les deux restent identiques). |
| `GET /api/admin/drive` | `{ enabled, rows }` : comparaison hub ↔ drive (lecture seule) ; `enabled: false` sans variables `DRIVE_*`. |
| `POST /api/admin/drive/attach` | `{ userId, driveLogin }` : rattache un compte hub à un compte drive existant (aucune écriture sur le drive). |
| `GET /api/admin/audit?person=&limit=` | `{ entries }` du journal `hub-audit.jsonl`, plus récentes d'abord (limite 500). |

Les routes `/api/admin/submissions*` sont celles de la modération (session hub, rôle admin) ; `/api/admin/login|logout|session` n'existent plus.

## Synchronisation des comptes avec le drive (oCIS)

Décision du 24/11/2026 : l'accès au hub et au drive (`drive.succieu.fr`, oCIS 8, IdP intégré) sont **les mêmes** (même identifiant, même mot de passe), pilotés depuis l'administration du hub. Tout le conseil municipal a un compte drive ; les dossiers et espaces réservés (ex. « Bureau ») se gèrent **dans le drive** : le hub ne crée, ne modifie ni ne supprime jamais un espace, une permission ou un compte drive. Code : `lib/hub/drive-sync.ts` (côté serveur uniquement), orchestration dans `lib/hub/admin.ts`.

- **Authentification auprès d'oCIS** : la basic auth est coupée côté oCIS ; le hub obtient un jeton OIDC de `admin` par le flux de `docs/drive-bureau.md` du dépôt du serveur (§ « Procédures ») : `/.well-known/openid-configuration`, `authorization_endpoint` (code + PKCE, client `web`, redirect `<DRIVE_URL>/oidc-callback.html`), `POST /signin/v1/identifier/_/logon` (JSON, `Kopano-Konnect-XSRF: 1`, `Origin` et `Referer`), rejeu de l'autorisation (302 avec `code`), échange sur le `token_endpoint`. Jeton mis en cache jusqu'à son expiration (moins 30 s), renouvelé sur 401. Sans `DRIVE_URL`, `DRIVE_ADMIN_USER` et `DRIVE_ADMIN_PASSWORD`, la synchro est **désactivée** : l'administration l'indique et le hub fonctionne seul. `DRIVE_URL` est en https (http accepté seulement vers localhost, pour les tests).
- **Compte hub** : `driveLogin` (défaut = identifiant ; modifiable, ex. `secretariat`) et `driveSync` (`at` = dernière synchro réussie, `error` = dernière erreur).
- **Création** : compte drive absent → `POST /graph/v1.0/users` (`onPremisesSamAccountName`, `displayName`, `mail` technique, `passwordProfile`) puis rôle « User » (`appRoleAssignments`) ; présent → rattaché (seul le mot de passe est aligné, rôle et espaces intacts). Le drive passe avant le hub.
- **Mot de passe** (création / réinitialisation) : `PATCH /graph/v1.0/users/<login>` `passwordProfile` sur le drive **d'abord** ; le hub n'enregistre le nouveau mot de passe que si le drive l'a accepté (sinon message clair, hub inchangé, erreur consignée dans `driveSync.error`). Une réinitialisation sur un compte hub sans compte drive crée celui-ci.
- **Désactivation / réactivation** : `PATCH` `accountEnabled` false / true. Le hub change toujours (la sécurité ne dépend pas du drive) ; une erreur du drive est consignée et affichée. **Non vérifié** : la prise en charge de `accountEnabled` par Libre Graph d'oCIS 8.0.10 n'a pas pu être testée (aucun accès au drive) ; si le drive la refuse, l'état « Erreur » apparaît sur le compte, rien n'est supprimé, et la désactivation côté drive se fait alors à la main. À vérifier au premier essai réel.
- **Garde-fou administrateur du drive** : un `driveLogin` explicite égal (casse ignorée) à `DRIVE_ADMIN_USER` ou à « admin » est refusé (422 `validation_failed`, « administrateur technique du drive ») à la création, à la modification, au rattachement et dans la migration (`parseDriveLogin`) ; `ensureDriveAccount`, `setDrivePassword` et `setDriveEnabled` le refusent aussi, sans aucun appel Graph (un compte hub dont l'identifiant par défaut est « admin » reste possible mais n'est jamais synchronisé). L'écran « Comptes du drive » liste ce compte comme « compte technique » sans action « Rattacher ».
- **Réinitialisation** : si le drive a accepté le mot de passe mais que l'enregistrement hub échoue, l'erreur « Mots de passe hub et drive différents : refaire la réinitialisation » est journalisée (sans mot de passe), consignée dans `driveSync.error` et renvoyée à l'administrateur (502).
- **Jamais** : `DELETE`, ni appel aux espaces (`/drives`) ni aux permissions ; le module n'émet que des `GET`, `POST` et `PATCH` sur `/graph/v1.0/users…` (test dédié).
- **Écran « Comptes du drive »** et **`node scripts/drive-accounts.mjs`** (lecture seule, mêmes variables `DRIVE_*` + `DATA_DIR`, `--json` possible) : comptes drive sans compte hub, comptes hub sans compte drive, désactivés d'un côté seulement.
- **Risque assumé** : le hub détient un accès administrateur au drive (le secret `DRIVE_ADMIN_PASSWORD` est dans l'environnement du service). Fichier d'environnement en 640 root:loic ; ne jamais le journaliser ni le versionner.

## Coquille du hub (`/espace-bureau`)

Pages, toutes `noindex` (layout `app/espace-bureau/layout.tsx`), hors sitemap, `Disallow /espace-bureau` dans `robots.txt` :

| Chemin | Fichier | Rôle |
|---|---|---|
| `/espace-bureau/connexion` | `connexion/page.tsx` | Identifiant + mot de passe ; message dédié si limité (429), identifiant/mot de passe faux, serveur non configuré. Déjà connecté : redirigé. |
| `/espace-bureau` | `(hub)/page.tsx` | Accueil : une tuile par module autorisé (icône, titre, description, résumé facultatif, « Lecture seule »). |
| `/espace-bureau/compte` | `(hub)/compte/page.tsx` | Taille du texte, déconnexion ; « Mot de passe oublié : s'adresser à l'administrateur ». |
| `/espace-bureau/administration` | `(hub)/administration/page.tsx` | Admin seulement ; console de gestion des comptes (`components/hub-admin/`). `/espace-bureau/admin` y redirige. |
| `/espace-bureau/<chemin du module>` | `(hub)/[module]/page.tsx` | Emplacement provisoire des modules sans page propre. |
| `/espace-bureau/actualites` | `(hub)/actualites/page.tsx` | Module Actualités & agenda (`actus-agenda`) : saisie et historique. |
| `/espace-bureau/actualites/moderation[/<id>]` | `(hub)/actualites/moderation/` | Modération, admin seulement (les autres sont renvoyés au module). Anciennes URL `/espace-bureau/moderation*` : redirection 308 (`next.config.ts`). |

Le groupe de routes `(hub)` n'ajoute aucun segment d'URL : son `layout.tsx` exige une session (`requireHubPageUser` : sinon redirection vers la connexion), puis affiche `HubNav` (`components/hub/HubNav.tsx`) : Accueil, modules autorisés (niveau ≥ lecture, ordre du registre), Administration (admin), Mon compte, taille du texte. Sur un module en lecture seule, un bandeau jaune « Lecture seule » s'affiche. Le layout ne protège pas les données : chaque page de module appelle sa propre garde.

**Charte** : aucun nouveau thème. Les pages reprennent `PageHero` (variante `slim`), `PageShell`, `Card`, les champs et boutons de `components/bureau/fields.tsx` (cibles ≥ 44 px, anneau de focus `--color-focus`), les polices Bricolage/Source Sans et les jetons de `app/globals.css`. L'en-tête et le pied du site public restent visibles au-dessus et en dessous.

**Taille du texte** : Petit / Normal / Grand (93,75 % / 100 % / 118,75 %), mémorisée dans `localStorage` (`succieu-hub-taille`) et appliquée à `<html>` (tout est en rem) par un script inline avant l'affichage (`components/hub/sizeStore.ts`, `TextSize.tsx`) ; rendue au site public en quittant l'espace.

### Module Documents (`/espace-bureau/documents`)

Page courte (`(hub)/documents/page.tsx`, garde `requireModulePage("documents")`, droit ≥ lecture) : explication, bouton « Ouvrir le drive » (`target="_blank" rel="noopener"`) et aide « mot de passe oublié = contacter l'administrateur ». L'URL vient de `BUREAU_DRIVE_URL` (lue côté serveur par `lib/hub/drive.ts`, **https uniquement**, sans identifiants intégrés ; absente ou invalide : repli `https://drive.succieu.fr/`). Aucun appel serveur vers oCIS, aucune donnée partagée, pas d'iframe.

**Authentification unique : non faite.** Le drive a ses propres identifiants, attribués par Florent, distincts de ceux du hub ; l'utilisateur se connecte deux fois. Une SSO (OIDC entre le hub et oCIS) serait un chantier séparé.

### Ajouter un module

1. Ajouter l'entrée dans `HUB_MODULES` (`lib/hub/modules.ts`) : `id`, `icon` (`news`, `people`, `room`, `documents` ; en ajouter une dans `components/hub/ModuleIcon.tsx` si besoin), `label`, `path` (`/espace-bureau/<segment>`), `description`. La navigation, les tuiles, les droits (`rights`, console admin) et `allowedModules` en dérivent.
2. Créer la page `app/espace-bureau/(hub)/<segment>/page.tsx` (elle prend le pas sur `[module]`) et appeler en tête `const { user, level } = await requireModulePage("<id>")` (`lib/hub/page-guards.ts`) : 404 si inconnu, redirection si non autorisé, `level` = `read` ou `write` pour masquer les actions d'écriture.
3. Routes API du module : `requireModule("<id>", "read" | "write", req)` (`lib/hub/guards.ts`) ; ne jamais se fier à la seule page.
4. Résumé de tuile (compteur) facultatif : enregistrer une fonction `(user) => Promise<string | null>` dans `MODULE_SUMMARIES` (`lib/hub/summaries.ts`) ; une erreur ou `null` masque l'emplacement.

## Module « Salle des fêtes » (`/espace-bureau/salle-des-fetes`)

Porte l'application de réservation de `sdf.succieu.fr` dans le hub (module `salle-des-fetes`). Page dans le groupe `(hub)` (`requireModulePage`), aucune connexion propre : les comptes web-users.json de l'ancienne appli ne sont **pas** importés, ce sont les comptes du hub.

**Droits** : `read` = calendrier, liste, détails, exports, **sans coordonnées ni paiements** (comme l'ancien rôle `viewer` : seuls `id`, `status`, `purpose`, `startDate`, `endDate`, `roomTypes` sortent du serveur ; la recherche texte est limitée à l'identifiant et à l'objet, pour ne pas révéler un nom ou un téléphone). `write` = tout (ancien `editor`) : création, modification, annulation/restauration, statut, tableau de bord, journal. Pas d'accès public.

**Données** (`DATA_DIR/salle-des-fetes/`, fichiers 0600) : `reservations.json` (`{ reservations: [...] }`, écriture atomique, sérialisée par verrou) et `audit.jsonl` (un événement par ligne : `id`, `reservationId`, `action`, `actor` = nom affiché du compte, `at`, `before`, `after`). Code : `lib/salle-des-fetes/` (`logic.ts` pur et testé, `store.ts`, `import.ts`).

**Modèle** : statuts `demande | option | confirmee | annulee` (anciennes valeurs `requested`, `confirmed`, `cancelled` acceptées et normalisées) ; `roomTypes` ⊂ `grande | petite` ; période `startDate`–`endDate` (≤ 31 jours, début non passé à la création) ; `keyHandover` `veille | matin` ; `depositPaid`, `balancePaid`, `balanceAtKeys` `oui | non` ; `revision` (anti-écrasement) ; `statusBeforeCancellation` ; `publicVisible` (défaut `false`) et `publicTitle` facultatif.

**Conflits** : une réservation `demande`/`option`/`confirmee` bloque ses salles sur sa période ; chevauchement + salle commune = 409 `conflict` avec `error.details.conflicts[]` (id, statut, objet, nom, dates, salles, `conflictingRooms`, sans coordonnées ni paiements). Annulation réversible (`DELETE` ; reste visible via le filtre « Annulées »), restauration revalidée (409 si le créneau est repris). `revision` fournie et périmée = 409 `stale_revision`.

| Méthode et chemin | Accès | Description |
|---|---|---|
| `GET /api/salle-des-fetes/reservations?month=AAAA-MM&q=&status=&room=` | lecture | `{ reservations, total }` (projetées selon le droit). `status` vide = actives, `all` = toutes. |
| `POST /api/salle-des-fetes/reservations` | écriture + origine | Création, 201 `{ reservation }` ; 422 `fields`, 409 `conflict`. |
| `GET /api/salle-des-fetes/reservations/<id>` | lecture | Détail (projeté). |
| `PUT /api/salle-des-fetes/reservations/<id>` | écriture | Modification complète + `revision`. |
| `DELETE /api/salle-des-fetes/reservations/<id>` | écriture | Annulation réversible. |
| `PATCH /api/salle-des-fetes/reservations/<id>/status` | écriture | `{ status, revision? }`. |
| `POST /api/salle-des-fetes/reservations/<id>/restore` | écriture | `{ status?, revision? }`. |
| `GET /api/salle-des-fetes/dashboard` | lecture | Prochaines réservations, paiements à suivre (vide en lecture), remises de clés sous 30 jours. |
| `GET /api/salle-des-fetes/audit?reservationId=&limit=` | écriture | Journal (500 max). |
| `GET /api/salle-des-fetes/reservations/export.csv` / `export.ics` | lecture | Mêmes filtres ; CSV `;` avec BOM, cellules commençant par `= + - @` préfixées d'une apostrophe (injection de formule) ; iCalendar journées entières. |

**Agenda public (préparation)** : `projectPublic()` (`lib/salle-des-fetes/logic.ts`) renvoie `{ id, title, startDate, endDate, rooms }` pour les seules réservations `confirmee` avec `publicVisible`, titre = `publicTitle` sinon `purpose`. **Non exposée** : aucune route ni page publique ; à brancher (et à ajouter à `robots`/sitemap au besoin) lors du volet public.

**Interface** : calendrier lundi→dimanche (≥ 768 px) et liste du mois sur téléphone, recherche et filtres (mémorisés), tableau de bord (écriture), formulaire et détail en `<dialog>`, impression (l'en-tête, le pied et la navigation sont masqués), actualisation toutes les 30 s et au retour sur l'onglet (suspendue pendant qu'un formulaire est ouvert). Charte du site (jetons, `PageHero` slim, champs de `components/bureau/fields.tsx`).

**Migration** (sur le serveur, après sauvegarde ; jamais lancée depuis le dépôt) :
`DATA_DIR=/var/lib/succieu-web node scripts/import-salle-des-fetes.mjs <dossier data de l'ancienne appli> --dry-run` puis sans `--dry-run`. Lit `reservations.json` et `audit-log.json`, idempotent (un `id` déjà présent n'est jamais écrasé), rapport : lues / ajoutées / déjà présentes / ignorées, avertissement sur les chevauchements. Les réservations importées passent `publicVisible: false`.

## Module « Espace Bureau » : suivi des dossiers (`/espace-bureau/bureau`)

Port de l'application de suivi de suivi.succieu.fr (module id `espace-bureau`, tuile « Espace Bureau »). Droits : **lecture** = consulter (liste, fiche, tableau, réunion, export) ; **écriture** = créer, modifier, ajouter une nouvelle, clore/rouvrir, « à voir en bureau », changer d'étape. Aucune connexion propre : la session du hub suffit. Les anciens codes par élu et la liste `elus[]` n'existent plus.

**Données** : `DATA_DIR/espace-bureau.json` (`{ version: 1, dossiers[], listes{commissions, decisionsAttendues, blocages} }`), écriture atomique sous verrou (`lib/content/storage.ts`). Ne pas confondre avec `DATA_DIR/bureau.json` (liste de prénoms de l'espace bureau historique, inchangée). Le fichier de production n'entre jamais dans le dépôt.

**Dossier** (`lib/suivi/types.ts`) : `id` (`d_…`), `titre`, `commission`, `referents[]` (**ids de comptes du hub**), `priorite` (P1 Urgent / P2 Important / P3 À programmer ; « P1 » jamais affiché), `avancement` (À étudier, À lancer, En cours, En attente, À arbitrer, Terminé, Abandonné), `blocage`, `decisionAttendue`, `prochaineAction`, `echeance` (date ISO si certaine : `AAAA-MM-JJ`, `JJ/MM/AAAA`, « 15 décembre 2026 » ; sinon libellé tel quel : « ASAP », « Avril 2027 »), `origine`, `aVoirEnBureau`, `statut` (actif / termine / abandonne), `creeLe`, `modifieLe`, `revision`, `nouvelles[]` (`id`, `date`, `auteur` = nom affiché du compte connecté, `auteurId`, `texte`), `importKey?`, `anciensReferents?` (noms d'anciens élus sans compte rapproché, pour mémoire). Avancement et statut sont synchronisés (Terminé/Abandonné ⇔ statut). `revision` détecte une modification concurrente. « En retard » seulement pour une date certaine dépassée.

**Pages** (dans le groupe `(hub)`, `requireModulePage("espace-bureau")` dans le layout et chaque page) :

| Chemin | Contenu |
|---|---|
| `/espace-bureau/bureau` | Mes dossiers (référent = compte connecté), groupés par priorité ; recherche, filtres commission/priorité (formulaire GET, sans JavaScript) |
| `…/bureau/tous` | Tous les dossiers en cours |
| `…/bureau/tableau` | Kanban par avancement (À trier, À étudier, À lancer, En cours, En attente, À arbitrer). « Mes dossiers » par défaut, `?tous=1` pour tous. Bouton « Changer d'étape » (gros boutons) + glisser-déposer ordinateur ; `PATCH` avec `revision`, 409 expliqué ; téléphone : une colonne à la fois. Lecture seule : ni bouton ni glisser-déposer |
| `…/bureau/dossier/<id>` · `…/modifier` | Fiche (champs, nouvelles, actions) · formulaire (contrôle de révision) |
| `…/bureau/nouveau` | Nouveau dossier (écriture) |
| `…/bureau/reunion` | Ordre du jour (à voir en bureau + urgents), impression A4 |
| `…/bureau/termines` | Terminés et abandonnés (ouvrir pour rouvrir) |

« Télécharger en Excel » (`/api/espace-bureau/export`) est dans la sous-navigation. Le lien « Documents ↗ » de l'ancienne appli n'est pas repris : le module Documents (volet 7) le remplace. La tuile d'accueil affiche « N dossiers dont vous êtes référent » (`lib/hub/summaries.ts`).

**API** (`app/api/espace-bureau/…`, gardes `requireModule("espace-bureau", read|write, req)`, écriture = origine exigée ; erreurs `{ error: { code, message } }`, 409 de révision = `invalid_transition`) :

| Méthode et chemin | Niveau | Rôle |
|---|---|---|
| `GET /dossiers?statut=&commission=&referent=<id compte>&bureau=1&q=` | lecture | Lister (tri priorité puis titre) |
| `POST /dossiers` | écriture | Créer (référents = ids de comptes existants) |
| `GET /dossiers/<id>` · `PATCH /dossiers/<id>` | lecture · écriture | Lire · modifier (`revision` facultative ⇒ 409) |
| `POST /dossiers/<id>/clore` `{abandon?, texte?}` · `/rouvrir` · `/nouvelles` `{texte}` · `/bureau` `{valeur?}` | écriture | Actions ; l'auteur des nouvelles est le compte connecté |
| `GET /export` | lecture | Classeur .xlsx (A faire / Terminés / Listes, nouvelles incluses) |
| `GET/POST/PATCH/DELETE /listes` | lecture / écriture | Commissions, décisions attendues, blocages (renommer propage ; supprimer refusé si utilisé). Pas d'écran : API seulement, comme avant |

**Journal d'audit** : celui du hub (`hub-audit.jsonl`), actions `bureau.dossier_cree`, `bureau.dossier_modifie` (champs modifiés), `bureau.dossier_clos`, `bureau.dossier_abandonne`, `bureau.dossier_rouvert`, `bureau.nouvelle_ajoutee`, `bureau.bureau_bascule`, `bureau.liste_*`, `bureau.export_xlsx`, `bureau.import` ; acteur = identifiant du compte. Pas de contenu de nouvelle dans le journal.

**Code** : `lib/suivi/` (modèle pur `model.ts`, `tableau.ts`, `affichage.ts`, `store.ts`, `export.ts`, `xlsx.ts` écriture seule, `import.ts`, tests `suivi.test.ts`) ; composants `components/suivi/` (jetons du site, `PageHero` slim, `PageShell`, champs de `components/bureau/fields.tsx`).

### Import depuis suivi.succieu.fr (`scripts/import-suivi-bureau.mjs`)

```bash
# sur le serveur ou en local, avec le DATA_DIR du hub (users.json présent) ; le bureau.json de suivi.succieu.fr est copié hors dépôt
DATA_DIR=/var/lib/succieu-web node scripts/import-suivi-bureau.mjs <bureau.json> --dry-run          # rapport seul, rien n'est écrit
DATA_DIR=/var/lib/succieu-web node scripts/import-suivi-bureau.mjs <bureau.json> [--map correspondances.json]
```

- Chaque élu est rapproché d'un **compte actif** du hub : table `--map` (`{ "<id ou nom de l'élu>": "<id ou identifiant du compte>" | null }`), puis nom complet normalisé (sans accent ni casse), puis prénom s'il désigne un seul compte. Ambigu ou introuvable : **non rapproché** ; le dossier est importé sans ce référent, dont le nom est gardé dans `anciensReferents`.
- Le rapport (`--dry-run` ou réel) donne : dossiers (source, importés, déjà présents), nouvelles, commissions ajoutées, élus rapprochés (méthode), référents non rapprochés avec nombre de dossiers. Il ne liste aucun titre ni texte.
- **Idempotent** : clé = id du dossier (ou `importKey`). Un dossier déjà présent n'est jamais écrasé (les modifications faites dans le hub sont conservées). Seul rattrapage : un référent resté sans compte est rattaché si son compte existe au nouveau passage (rien d'autre n'est modifié). Dates, `revision`, identifiants et historique des nouvelles sont conservés tels quels ; les listes (commissions…) sont fusionnées.
- Ordre conseillé : créer les comptes des élus dans l'administration, `--dry-run`, compléter `--map`, import réel, relire le rapport.
- Non repris : l'import Excel de l'ancienne appli (les données sont déjà en JSON), l'ancien `audit.jsonl` (à archiver hors site : `docs/deploiement-hub.md`, étape 5) et les codes des élus (remplacés par les comptes).
- Aucune donnée réelle dans le dépôt : les tests utilisent des fixtures fictives.

**Écarts avec l'ancienne appli** : plus de page « Qui êtes-vous ? » ni de codes (comptes du hub) ; pas de gestion des élus (c'est l'administration des comptes) ; navigation par onglets du hub au lieu de la barre fixe mobile ; taille du texte = celle du hub ; filtres dans un `<details>` sans envoi automatique ; pas d'écran pour les listes (API conservée) ; parcours HTTP couvert par `scripts/e2e-hub.mjs`. Non déployé.

## Routes

Corps et réponses en JSON. Succès : `{ ... }` ; échec : `{ "error": { "code", "message", "fields?" } }`. Toutes les réponses JSON sont `Cache-Control: no-store`.

| Méthode et chemin | Accès | Description |
|---|---|---|
| `POST /api/bureau/uploads` | module `actus-agenda` en écriture | multipart, champ `file` → 201 `{ image, url }` ; `image` à placer dans `fields.image`. |
| `GET /api/bureau/submissions` | module `actus-agenda` en lecture | `{ submissions }` : toutes les saisies de l'auteur (`displayName`) : statut, avis, motif. |
| `POST /api/bureau/submissions` | module `actus-agenda` en écriture + origine | `{ kind, fields }` → 201 `{ submission }` (statut `submitted`, auteur = nom affiché du compte). |
| `GET /api/admin/submissions` | admin hub | `?status=submitted,reviewed` (défaut : en attente) → `{ submissions }`. |
| `GET /api/admin/submissions/<id>` | admin hub | `{ submission }`. |
| `POST /api/admin/submissions/<id>/publish` | admin hub + origine | `{ version: "original"\|"corrected" }` ; revalide les pages. |
| `POST /api/admin/submissions/<id>/reject` | admin hub + origine | `{ reason }` obligatoire (≤ 500). |
| `GET /api/review/submissions` | Bearer | Saisies au statut `submitted`. |
| `GET /api/review/submissions/<id>` | Bearer | `{ submission }`. |
| `POST /api/review/submissions/<id>` | Bearer | `{ ok, issues[], corrected, summary }` → statut `reviewed` ; `corrected` = mêmes champs que `original`, validés. |
| `GET /api/public/articles?limit=` | public | Actualités publiées (`limit` ≤ 50). |
| `GET /api/public/events?from=AAAA-MM-JJ` | public | Rendez-vous publiés à venir. |
| `GET /api/uploads/<nom>` | public | Image (`nosniff`, cache immuable). |

## Codes d'erreur

| Code | HTTP | Cas |
|---|---|---|
| `invalid_json` | 400 | Corps non JSON. |
| `unauthorized` | 401 | Pas de session hub / jeton de relecture invalide. |
| `forbidden` | 403 | Réservé. |
| `bad_origin` | 403 | Origine refusée sur une écriture. |
| `not_found` | 404 | Saisie ou image introuvable. |
| `invalid_transition` | 409 | Transition interdite depuis le statut courant, ou version corrigée absente. |
| `payload_too_large` | 413 | Image > 40 Mo. |
| `unsupported_media` | 415 | Image non jpeg/png/webp. |
| `validation_failed` | 422 | Champs invalides : `error.fields` = `{ champ: message lisible }` (avis : `corrected.<champ>`). |
| `drive_sync_failed` | 502 | Hub : le drive a refusé ou ne répond pas (message lisible ; rien n'a été changé dans le hub pour un mot de passe). |
| `conflict` | 409 | Salle déjà réservée (`error.details.conflicts`). |
| `stale_revision` | 409 | Réservation modifiée entre-temps (`revision` périmée). |
| `rate_limited` | 429 | Trop de tentatives de connexion au hub (`Retry-After`). |
| `server_misconfigured` | 500 | Variable d'environnement manquante ou trop courte. |
| `server_error` | 500 | Erreur imprévue. |

## Tests

`npm test` (node:test via `scripts/ts-resolve.mjs`) : parcours complet du hub et migration (`lib/hub/parcours.test.ts`) ; validation, transitions, sessions, empreintes, écriture atomique et verrou ; salle des fêtes (`lib/salle-des-fetes/salle.test.ts`) : conflits, annulation/restauration, révision, lecture sans données personnelles, exports, projection publique, import idempotent ; hub (`lib/hub/hub.test.ts`) : sessions, droits, mot de passe attribué, limitation, dernier admin, audit, CLI ; synchro drive (`lib/hub/drive-sync.test.ts`) : **faux serveur HTTP local** (Konnect + Graph simulés, aucun appel réel) — jeton OIDC, création, rattachement, mot de passe refusé ⇒ hub inchangé, désactivation, synchro désactivée sans variables, aucune suppression ni espace touché, comparaison, migration.

## Pages publiques

`/` (carrousel : 4 dernières actualités, complétées par `lib/homeSpotlight.ts` ; bande « Prochains rendez-vous »), `/actualites`, `/actualites/<id>`, `/agenda`, `/agenda/passes`. Logique dans `lib/publicContent.ts` (le marché du samedi matin, sans heure, est inséré à son prochain samedi, heure de Paris, jusqu'à 13 h). Pages en `revalidate = 60` en repli de `revalidatePath` ; le sitemap inclut les actualités publiées.

## Module Actualités & agenda (`/espace-bureau/actualites`)

Dans la coquille du hub (`app/espace-bureau/(hub)/actualites/page.tsx`, garde `requireModulePage("actus-agenda")`), sans connexion propre. Composant client `components/bureau/ActusApp.tsx` : onglets « Actualités » / « Agenda » (écriture seulement ; en lecture seule, un message remplace les formulaires), historique de l'auteur (statut, avis de l'agent, version corrigée, version publiée, motif de refus, chronologie), lien « Modérer les saisies » pour l'admin. La validation côté client appelle directement `parseArticleFields` / `parseEventFields` de `lib/content/validation.ts` : aucune règle dupliquée. Pas d'édition après envoi. Page `noindex`, hors sitemap, `Disallow` dans `robots.txt` (ainsi que `/api/`).

## Pages de modération (`/espace-bureau/actualites/moderation`)

Pages `noindex` du groupe `(hub)`, réservées à l'admin (`requireModerationPage`, `lib/hub/page-guards.ts`), rendues côté client et alimentées par `/api/admin/submissions*`. `/espace-bureau/actualites/moderation` liste les saisies (« À traiter » / « Traitées ») ; `/espace-bureau/actualites/moderation/<id>` est le lien stable du détail (original/corrigé avec différences mot à mot, avis, aperçu, chronologie, actions avec confirmation et motif de rejet obligatoire, saisie suivante proposée). Les liens des alertes de relecture pointent vers ces nouvelles URL. Parcours de test : `PLAYWRIGHT_CORE=<chemin playwright-core> node scripts/e2e-moderation.mjs` (après `next build`, DATA_DIR temporaire avec comptes fictifs créés par `scripts/hub-create-admin.mjs`, captures dans `SHOTS_DIR`).

`parseReview` est asynchrone : il refuse une `corrected.image` introuvable (comme `createSubmission`).
