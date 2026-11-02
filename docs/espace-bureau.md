# Espace bureau — contrat technique (socle)

Le bureau municipal soumet des actualités (carrousel d'accueil) et des rendez-vous (agenda). Un agent Timon relit chaque saisie (avis + version corrigée), puis Florent (admin) publie ou rejette. Ce document fixe le contrat utilisé par les volets interface, relecture agent et pages publiques. Seuls `lib/`, `app/api/`, `scripts/` et la doc sont fournis ici : aucune page d'interface.

## Variables d'environnement

Voir `.env.example`. Aucun secret dans le dépôt.

| Variable | Rôle |
|---|---|
| `DATA_DIR` | Dossier des données hors build. Défaut `./data` (dev, ignoré par git) ; prod `/var/lib/succieu-web` (propriétaire `loic`). |
| `BUREAU_PASSWORD_HASH` | Empreinte scrypt du mot de passe commun du bureau. |
| `ADMIN_PASSWORD_HASH` | Empreinte scrypt du mot de passe admin (Florent). |
| `SESSION_SECRET` | Clé HMAC des sessions, 32 caractères minimum. |
| `REVIEW_API_TOKEN` | Jeton Bearer de l'agent de relecture, 24 caractères minimum. |
| `SITE_ORIGINS` | Facultatif : origines supplémentaires acceptées pour les écritures (séparées par des virgules). |

Générer une empreinte : `node scripts/hash-password.mjs` (saisie masquée, ou mot de passe sur l'entrée standard). Format : `scrypt$N$r$p$sel(base64)$empreinte(base64)`. Les `$` doivent être échappés dans un `.env` lu par Next (`\$`) ou la valeur mise entre apostrophes dans un `EnvironmentFile` systemd. Une variable manquante renvoie `server_misconfigured`.

## Stockage (`DATA_DIR`)

- `articles.json`, `events.json` : tableaux de saisies.
- `bureau.json` : tableau de noms (`["Prénom Nom", ...]`), éditable à la main ; modèle fictif dans `data.example/bureau.json`. Un nom retiré perd l'accès immédiatement.
- `uploads/` : images (`<32 hex>.jpg|png|webp`).
- Écriture atomique (fichier temporaire + `rename`) ; verrou : file d'attente par processus + fichier `.lock` (`O_EXCL`, périmé après 15 s).

## Modèle (`lib/content/types.ts`)

Saisie : `id` (`a-<16 hex>` article, `e-<16 hex>` événement), `kind` (`"article"|"event"`), `author`, `createdAt` (ISO), `status` (`"submitted"|"reviewed"|"published"|"rejected"`), `original`, `review?` (`ok`, `issues[]`, `corrected`, `summary`, `reviewedAt`), `published?` (`version` `"original"|"corrected"`, `fields`, `publishedAt`), `rejectionReason?`, `history[]` (`at`, `action`, `by`, `note?`).

Champs article : `title` (≤ 90), `summary` (chapeau carrousel, ≤ 280), `body` (≤ 5000), `linkUrl?` (http(s) ou chemin `/…`), `linkLabel?` (≤ 60, exige `linkUrl`), `image?` (nom renvoyé par l'upload), `publishedAt` (AAAA-MM-JJ).

Champs événement : `title` (≤ 90), `date` (AAAA-MM-JJ), `startTime?`, `endTime?` (HH:MM ; fin ≥ début, fin exige début), `place` (≤ 120), `description` (≤ 2000), `linkUrl?`.

Images : jpeg/png/webp, 3 Mo max, type vérifié par signature, renommée aléatoirement, servie par `GET /api/uploads/<nom>`.

Transitions (`lib/content/transitions.ts`) : `submitted → reviewed` (agent) ; `submitted|reviewed → published|rejected` (admin) ; `published` et `rejected` sont terminaux. Publier `"corrected"` exige un avis. Chaque transition ajoute une entrée d'historique (`by` : nom du bureau, `agent`, `admin`).

Fonctions serveur réutilisables (`lib/content/store.ts`) : `getPublishedArticles(limit?)` (récentes d'abord, dates futures masquées), `getUpcomingEvents(from = aujourd'hui Paris)` (chronologique). Elles lisent le disque à chaque appel : les pages qui les utilisent doivent être dynamiques ou revalidées (la publication appelle `revalidatePath("/", "layout")`).

## Authentification

- Bureau : `POST /api/bureau/login` avec le nom (présent dans `bureau.json`) + mot de passe commun. Admin : mot de passe seul.
- Cookies `succieu_bureau` / `succieu_admin` : jeton `base64url(JSON).HMAC-SHA256`, httpOnly, `Secure` en production, `SameSite=Strict`, 8 h.
- Toute requête qui écrit (POST) doit porter `Origin` (ou `Referer`) identique à l'hôte du site (`Host`/`X-Forwarded-Host`) ou listé dans `SITE_ORIGINS`, sinon `bad_origin`. Les routes de relecture agent (Bearer) n'utilisent pas de cookie et sont exemptées.
- Connexion : 5 échecs / 15 min par IP (en mémoire, par processus) puis `rate_limited` avec `Retry-After`.

## Routes

Corps et réponses en JSON. Succès : `{ ... }` ; échec : `{ "error": { "code", "message", "fields?" } }`. Toutes les réponses JSON sont `Cache-Control: no-store`.

| Méthode et chemin | Accès | Description |
|---|---|---|
| `GET /api/bureau/names` | public | `{ names }` pour le sélecteur de connexion. |
| `POST /api/bureau/login` | public | `{ name, password }` → `{ ok, role, name }` + cookie. |
| `POST /api/bureau/logout` | origine | Efface le cookie. |
| `GET /api/bureau/session` | public | `{ authenticated, name? }`. |
| `POST /api/bureau/uploads` | bureau | multipart, champ `file` → 201 `{ image, url }` ; `image` à placer dans `fields.image`. |
| `GET /api/bureau/submissions` | bureau | `{ submissions }` : toutes les saisies de l'auteur (statut, avis, motif). |
| `POST /api/bureau/submissions` | bureau | `{ kind, fields }` → 201 `{ submission }` (statut `submitted`). |
| `POST /api/admin/login` | public | `{ password }`. |
| `POST /api/admin/logout`, `GET /api/admin/session` | — | Idem bureau (`{ authenticated }`). |
| `GET /api/admin/submissions` | admin | `?status=submitted,reviewed` (défaut : en attente) → `{ submissions }`. |
| `GET /api/admin/submissions/<id>` | admin | `{ submission }`. |
| `POST /api/admin/submissions/<id>/publish` | admin | `{ version: "original"\|"corrected" }` ; revalide les pages. |
| `POST /api/admin/submissions/<id>/reject` | admin | `{ reason }` obligatoire (≤ 500). |
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
| `unauthorized` | 401 | Pas de session / mauvais mot de passe ou jeton. |
| `forbidden` | 403 | Réservé. |
| `bad_origin` | 403 | Origine refusée sur une écriture. |
| `not_found` | 404 | Saisie ou image introuvable. |
| `invalid_transition` | 409 | Transition interdite depuis le statut courant, ou version corrigée absente. |
| `payload_too_large` | 413 | Image > 3 Mo. |
| `unsupported_media` | 415 | Image non jpeg/png/webp. |
| `validation_failed` | 422 | Champs invalides : `error.fields` = `{ champ: message lisible }` (avis : `corrected.<champ>`). |
| `rate_limited` | 429 | Trop de tentatives de connexion (`Retry-After`). |
| `server_misconfigured` | 500 | Variable d'environnement manquante ou trop courte. |
| `server_error` | 500 | Erreur imprévue. |

## Tests

`npm test` (node:test via `scripts/ts-resolve.mjs`) : validation, transitions, sessions, empreintes, écriture atomique et verrou.

## Pages publiques

`/` (carrousel : 4 dernières actualités, complétées par `lib/homeSpotlight.ts` ; bande « Prochains rendez-vous »), `/actualites`, `/actualites/<id>`, `/agenda`, `/agenda/passes`. Logique dans `lib/publicContent.ts` (le marché du samedi matin, sans heure, est inséré à son prochain samedi, heure de Paris, jusqu'à 13 h). Pages en `revalidate = 60` en repli de `revalidatePath` ; le sitemap inclut les actualités publiées.

## Interface (`/espace-bureau`)

Page client unique (`components/bureau/`) : connexion (nom + mot de passe commun), onglets « Actualités » / « Rendez-vous », historique de l'auteur (statut, avis de l'agent, version corrigée, version publiée, motif de refus, chronologie). Page `noindex`, absente du sitemap, `Disallow` dans `robots.txt` (ainsi que `/api/`). La validation côté client appelle directement `parseArticleFields` / `parseEventFields` de `lib/content/validation.ts` : aucune règle dupliquée. Pas d'édition après envoi.
