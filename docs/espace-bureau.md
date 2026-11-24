# Espace bureau — contrat technique

Le bureau municipal soumet des actualités (carrousel d'accueil) et des rendez-vous (agenda). Un agent Timon relit chaque saisie (avis + version corrigée), puis Florent (admin) publie ou rejette. Ce document fixe le contrat utilisé par les volets interface, relecture agent et pages publiques. Seuls `lib/`, `app/api/`, `scripts/` et la doc sont fournis ici : aucune page d'interface.

## Variables d'environnement

Voir `.env.example`. Aucun secret dans le dépôt.

| Variable | Rôle |
|---|---|
| `DATA_DIR` | Dossier des données hors build. Défaut `./data` (dev, ignoré par git) ; prod `/var/lib/succieu-web` (propriétaire `loic`). |
| `SESSION_SECRET` | Clé HMAC des sessions, 32 caractères minimum. |
| `REVIEW_API_TOKEN` | Jeton Bearer de l'agent de relecture, 24 caractères minimum. |
| `HUB_SESSION_HOURS` | Facultatif : durée de la session du hub en heures (défaut 2160 = 90 jours). |
| `SITE_ORIGINS` | Facultatif : origines supplémentaires acceptées pour les écritures (séparées par des virgules). |

Les anciennes variables `BUREAU_PASSWORD_HASH` et `ADMIN_PASSWORD_HASH` (mots de passe communs) sont **supprimées** : la connexion passe par les comptes individuels du hub. Elles peuvent être retirées de l'environnement du service. Empreinte scrypt (utilitaire) : `node scripts/hash-password.mjs` (saisie masquée, ou mot de passe sur l'entrée standard). Format : `scrypt$N$r$p$sel(base64)$empreinte(base64)`. Les `$` doivent être échappés dans un `.env` lu par Next (`\$`) ou la valeur mise entre apostrophes dans un `EnvironmentFile` systemd. Une variable de session ou de relecture manquante renvoie `server_misconfigured`.

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

- **Comptes** : `DATA_DIR/users.json` (écriture atomique + verrou). Champs : `id` stable, `identifier` (prénom en minuscules sans accent, unique ; la saisie à la connexion est normalisée), `displayName`, `role` (`admin` | `membre`), `active`, `passwordHash` (scrypt, `lib/auth/password.ts`), `passwordVersion`, `mustChangePassword`, `rights`, `createdAt`, `updatedAt`.
- **Droits** : `{ "actus-agenda" | "espace-bureau" | "salle-des-fetes" | "documents": "none" | "read" | "write" }` ; un module absent vaut `none` ; un admin a `write` partout. Registre des modules (id, libellé, chemin, description) : `lib/hub/modules.ts`, unique endroit à compléter par les volets suivants.
- **Session** : cookie `succieu_hub`, jeton `base64url({uid, pv, exp}).HMAC-SHA256` (`SESSION_SECRET`), httpOnly, `Secure` en production, **`SameSite=Lax`** (Strict casse l'ouverture depuis un lien WhatsApp : le cookie n'est pas envoyé au rechargement), durée `HUB_SESSION_HOURS` (90 jours par défaut). Invalidée si le compte est désactivé ou si le mot de passe change (`pv` ≠ `passwordVersion`).
- **Mot de passe provisoire** : création et réinitialisation génèrent `xxxx-xxxx-xxxx`, renvoyé une seule fois, avec `mustChangePassword`. Tant qu'il est vrai, toute garde refuse avec 403 `password_change_required` ; seuls `session`, `password` et `logout` répondent.
- **Limitation** : 5 échecs / 15 min par IP **et** par identifiant (mémoire du processus), puis 429 `rate_limited` + `Retry-After`. Un identifiant verrouillé l'est même avec le bon mot de passe.
- **Audit** : `DATA_DIR/hub-audit.jsonl`, une ligne JSON `{date, actor, action, detail?, ip?}` (connexions, échecs, créations, droits, réinitialisations) ; jamais de mot de passe ni d'empreinte.

| Méthode et chemin | Accès | Description |
|---|---|---|
| `POST /api/hub/login` | public + origine | `{ identifier, password }` → session (`authenticated`, `user`, `role`, `rights`, `mustChangePassword`) + cookie. 401 générique si identifiant inconnu, mot de passe faux ou compte désactivé. |
| `POST /api/hub/logout` | origine | Efface le cookie. |
| `GET /api/hub/session` | connecté | Même corps que la connexion ; 401 sans session. |
| `POST /api/hub/password` | connecté + origine | `{ oldPassword, newPassword }` (10 caractères min., différent de l'ancien) ; renvoie la session et un nouveau cookie (les autres sessions tombent). |

**Gardes serveur** (`lib/hub/guards.ts`, logique pure testable dans `lib/hub/access.ts`) : `requireUser({ allowPasswordChange? })`, `requireAdmin()`, `requireModule(module, "read" | "write", req?)` — avec `req`, une écriture exige aussi l'origine (`assertSameOrigin`). Erreurs : 401 `unauthorized`, 403 `forbidden`, 403 `password_change_required`.

**Bibliothèque admin** (`lib/hub/users.ts`, utilisée par le volet 2) : `createUser`, `setActive`, `resetPassword`, `updateRoleAndRights`, `listUsers`, `toPublic`. Impossible de désactiver ou rétrograder le dernier admin actif (409 `invalid_transition`).

**Premier admin** (sur le serveur, saisie masquée) : `DATA_DIR=/var/lib/succieu-web node scripts/hub-create-admin.mjs <prenom> ["Nom affiché"]`.

## Console d'administration des comptes (`/espace-bureau/administration`)

Page `noindex` (sous `/espace-bureau`, donc hors sitemap et `Disallow` dans `robots.txt`), servie dans la coquille du hub (groupe `(hub)`, garde `requireHubPageUser` + rôle `admin` ; un membre est redirigé vers l'accueil, la connexion et le mot de passe imposé sont ceux de la coquille). L'ancienne URL `/espace-bureau/admin` redirige (permanent) vers celle-ci. Fonctions : liste des comptes (nom, identifiant, rôle, actif, dernière connexion tirée du journal), création (identifiant proposé = prénom sans accent, modifiable), grille de droits Aucun / Lecture / Écriture à enregistrement explicite, réinitialisation du mot de passe, désactivation / réactivation, changement de rôle, journal filtrable par personne. Le mot de passe provisoire n'est affiché qu'une fois (copier / imprimer), jamais relu ni journalisé. Confirmation dans la page (bandeau Confirmer / Annuler, pas de `window.confirm`) avant enregistrement des droits, réinitialisation et (dés)activation. Garde-fous : on ne peut ni se désactiver, ni changer son propre rôle, ni réinitialiser son propre mot de passe (409 `invalid_transition`) ; le dernier admin actif est protégé (bibliothèque `lib/hub/users.ts`).

Logique : `lib/hub/admin.ts` (testée dans `lib/hub/admin.test.ts`) ; composants : `components/hub-admin/`. Toutes les routes exigent la session hub admin (401/403) et, en écriture, l'origine.

| Méthode et chemin | Description |
|---|---|
| `GET /api/admin/users` | `{ users }` (vue publique + `lastLogin`, sans empreinte). |
| `POST /api/admin/users` | `{ displayName, identifier?, role?, rights? }` → 201 `{ user, temporaryPassword }`. |
| `PATCH /api/admin/users/<id>` | `{ role?, rights?, displayName? }` → `{ user }` ; journalisé (`user.update`). |
| `POST /api/admin/users/<id>/active` | `{ active: boolean }` → `{ user }`. |
| `POST /api/admin/users/<id>/reset-password` | → `{ user, temporaryPassword }` (une seule fois). |
| `GET /api/admin/audit?person=&limit=` | `{ entries }` du journal `hub-audit.jsonl`, plus récentes d'abord (limite 500). |

Les routes `/api/admin/submissions*` sont celles de la modération (session hub, rôle admin) ; `/api/admin/login|logout|session` n'existent plus.

## Coquille du hub (`/espace-bureau`)

Pages, toutes `noindex` (layout `app/espace-bureau/layout.tsx`), hors sitemap, `Disallow /espace-bureau` dans `robots.txt` :

| Chemin | Fichier | Rôle |
|---|---|---|
| `/espace-bureau/connexion` | `connexion/page.tsx` | Identifiant + mot de passe ; message dédié si limité (429), identifiant/mot de passe faux, serveur non configuré. Déjà connecté : redirigé. |
| `/espace-bureau/nouveau-mot-de-passe` | `nouveau-mot-de-passe/page.tsx` | Écran imposé tant que `mustChangePassword` ; toute autre page du hub y redirige. |
| `/espace-bureau` | `(hub)/page.tsx` | Accueil : une tuile par module autorisé (icône, titre, description, résumé facultatif, « Lecture seule »). |
| `/espace-bureau/compte` | `(hub)/compte/page.tsx` | Changer son mot de passe, taille du texte, se déconnecter. |
| `/espace-bureau/administration` | `(hub)/administration/page.tsx` | Admin seulement ; console de gestion des comptes (`components/hub-admin/`). `/espace-bureau/admin` y redirige. |
| `/espace-bureau/<chemin du module>` | `(hub)/[module]/page.tsx` | Emplacement provisoire des modules sans page propre. |
| `/espace-bureau/actualites` | `(hub)/actualites/page.tsx` | Module Actualités & agenda (`actus-agenda`) : saisie et historique. |
| `/espace-bureau/actualites/moderation[/<id>]` | `(hub)/actualites/moderation/` | Modération, admin seulement (les autres sont renvoyés au module). Anciennes URL `/espace-bureau/moderation*` : redirection 308 (`next.config.ts`). |

Le groupe de routes `(hub)` n'ajoute aucun segment d'URL : son `layout.tsx` exige une session (`requireHubPageUser` : sinon redirection vers la connexion ou vers le changement de mot de passe), puis affiche `HubNav` (`components/hub/HubNav.tsx`) : Accueil, modules autorisés (niveau ≥ lecture, ordre du registre), Administration (admin), Mon compte, taille du texte. Sur un module en lecture seule, un bandeau jaune « Lecture seule » s'affiche. Le layout ne protège pas les données : chaque page de module appelle sa propre garde.

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
| `password_change_required` | 403 | Hub : mot de passe provisoire à changer avant toute autre action. |
| `rate_limited` | 429 | Trop de tentatives de connexion au hub (`Retry-After`). |
| `server_misconfigured` | 500 | Variable d'environnement manquante ou trop courte. |
| `server_error` | 500 | Erreur imprévue. |

## Tests

`npm test` (node:test via `scripts/ts-resolve.mjs`) : validation, transitions, sessions, empreintes, écriture atomique et verrou ; hub (`lib/hub/hub.test.ts`) : sessions, droits, mustChangePassword, limitation, dernier admin, audit, CLI.

## Pages publiques

`/` (carrousel : 4 dernières actualités, complétées par `lib/homeSpotlight.ts` ; bande « Prochains rendez-vous »), `/actualites`, `/actualites/<id>`, `/agenda`, `/agenda/passes`. Logique dans `lib/publicContent.ts` (le marché du samedi matin, sans heure, est inséré à son prochain samedi, heure de Paris, jusqu'à 13 h). Pages en `revalidate = 60` en repli de `revalidatePath` ; le sitemap inclut les actualités publiées.

## Module Actualités & agenda (`/espace-bureau/actualites`)

Dans la coquille du hub (`app/espace-bureau/(hub)/actualites/page.tsx`, garde `requireModulePage("actus-agenda")`), sans connexion propre. Composant client `components/bureau/ActusApp.tsx` : onglets « Actualités » / « Agenda » (écriture seulement ; en lecture seule, un message remplace les formulaires), historique de l'auteur (statut, avis de l'agent, version corrigée, version publiée, motif de refus, chronologie), lien « Modérer les saisies » pour l'admin. La validation côté client appelle directement `parseArticleFields` / `parseEventFields` de `lib/content/validation.ts` : aucune règle dupliquée. Pas d'édition après envoi. Page `noindex`, hors sitemap, `Disallow` dans `robots.txt` (ainsi que `/api/`).

## Pages de modération (`/espace-bureau/actualites/moderation`)

Pages `noindex` du groupe `(hub)`, réservées à l'admin (`requireModerationPage`, `lib/hub/page-guards.ts`), rendues côté client et alimentées par `/api/admin/submissions*`. `/espace-bureau/actualites/moderation` liste les saisies (« À traiter » / « Traitées ») ; `/espace-bureau/actualites/moderation/<id>` est le lien stable du détail (original/corrigé avec différences mot à mot, avis, aperçu, chronologie, actions avec confirmation et motif de rejet obligatoire, saisie suivante proposée). Les liens des alertes de relecture pointent vers ces nouvelles URL. Parcours de test : `PLAYWRIGHT_CORE=<chemin playwright-core> node scripts/e2e-moderation.mjs` (après `next build`, DATA_DIR temporaire avec comptes fictifs créés par `scripts/hub-create-admin.mjs`, captures dans `SHOTS_DIR`).

`parseReview` est asynchrone : il refuse une `corrected.image` introuvable (comme `createSubmission`).
