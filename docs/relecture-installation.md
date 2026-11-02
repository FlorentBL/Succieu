# Relecture par agent Timon : installation

Principe : le serveur Mairie ne peut pas joindre Timon (qui n'écoute que sur le Mac de Florent). C'est donc le Mac qui relève les saisies : un déclencheur Timon planifié (toutes les 5 min, de 7 h à 22 h) lance `scripts/relecture/poll.mjs`, qui interroge `GET /api/review/submissions` et crée une tâche pour l'agent `succieu.relecteur` par saisie « submitted » encore non confiée. L'agent suit `docs/relecture-agent.md` (show → submit-review → notify).

Prérequis : Node 20+, CLI `timon` dans le `PATH` du déclencheur, aucune dépendance npm.

## 1. Discord (Florent)

1. Sur le serveur FBL, créer le salon texte `alertes-mairie`.
2. Paramètres du salon → Intégrations → Webhooks → Nouveau webhook ; copier l'URL.

## 2. Secrets Timon (Florent)

Dans le coffre de secrets Timon, en mode **inject** (injection en variables d'environnement), pour le projet `succieu` :

| Variable | Valeur |
|---|---|
| `SUCCIEU_BASE_URL` | URL publique du site, sans `/` final (ex. `https://succieu.fr`) |
| `REVIEW_API_TOKEN` | Même valeur que `REVIEW_API_TOKEN` du serveur (≥ 24 caractères) |
| `DISCORD_WEBHOOK_ALERTES_MAIRIE` | URL du webhook « Alertes Mairie » du salon #alertes-mairie (serveur FBL), déposée par Florent dans le coffre de secrets Timon (mode inject, périmètre `project:succieu`, car c'est l'agent succieu.relecteur qui poste). Ne jamais l'afficher. |

`RELECTURE_STATE_FILE` n'est pas un secret : chemin du journal d'état, **hors dépôt**, par exemple `~/.timon/state/succieu-relecture.json` (créé avec les droits 600). Le journal évite de créer deux fois la même tâche ; le supprimer relance une tâche par saisie encore « submitted ». L'agent relecteur doit aussi recevoir ces variables (secrets injectés), sauf `RELECTURE_STATE_FILE`.

## 3. Agent et déclencheur (Minas-Tirith, après approbation du script par Florent)

Créer l'agent `succieu.relecteur` (projet Succieu, backend Claude, `sonnet`, `bypassPermissions`) avec comme prompt le contenu de `docs/relecture-agent.md`. Puis proposer à Florent :

```bash
timon trigger create \
  --source schedule --cron "*/5 7-22 * * *" --tz Europe/Paris \
  --action run --project succieu \
  --command "RELECTURE_STATE_FILE=$HOME/.timon/state/succieu-relecture.json node scripts/relecture/poll.mjs"
```

Les noms exacts d'options peuvent varier selon la version : vérifier avec `timon trigger create --help`, ou utiliser l'outil MCP `trigger_create` (source `schedule`, fuseau `Europe/Paris`) puis `trigger_test`. Le script lit son environnement : les secrets doivent être injectés dans le contexte du déclencheur. Le script sort 0 s'il n'y a rien à faire (message « Rien à faire. »), 1 sur erreur réseau/API/timon, 2 si une variable manque. Note : « 7-22 » inclut les passages de 22 h 00 à 22 h 55 ; pour s'arrêter à 22 h 00, utiliser `*/5 7-21 * * *` plus `0 22 * * *`.

## 4. Test de bout en bout

1. Vérifier l'environnement : `SUCCIEU_BASE_URL=… REVIEW_API_TOKEN=… RELECTURE_STATE_FILE=/tmp/etat-test.json node scripts/relecture/poll.mjs` → « Rien à faire. » ou création de tâches.
2. Se connecter à l'espace bureau et soumettre une actualité de test (avec une faute volontaire et une date passée).
3. Lancer `poll.mjs` (ou attendre 5 min) : une tâche « Relecture article a-… » apparaît pour `succieu.relecteur`. Relancer : « Rien à faire. » (déduplication).
4. Laisser l'agent travailler : la saisie passe au statut `reviewed` (visible côté admin avec l'avis et la version corrigée) et l'alerte arrive dans `#alertes-mairie`, avec le lien `…/espace-bureau/moderation/<id>`.
5. Rejeter la saisie de test depuis l'espace admin.

Tests automatiques (aucun appel réseau) : `npm run test:relecture`.

## Dépannage

- `HTTP 401` : `REVIEW_API_TOKEN` différent de celui du serveur.
- `injoignable` : `SUCCIEU_BASE_URL` erronée ou site arrêté ; le déclencheur réessaie 5 min plus tard.
- Discord `HTTP 404/401` : webhook supprimé ou mal copié.
- Tâche non créée mais saisie en attente : voir le message d'erreur de `timon task create` (agent `succieu.relecteur` ou projet `succieu` inexistants).
