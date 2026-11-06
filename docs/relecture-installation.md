# Relecture par agent Timon : installation

Principe : le serveur Mairie ne peut pas joindre Timon (qui n'écoute que sur le Mac de Florent). C'est donc le Mac qui relève les saisies : un déclencheur Timon planifié (toutes les 5 min, de 7 h à 22 h) lance `scripts/relecture/poll.mjs`, qui interroge `GET /api/review/submissions` et crée une tâche pour l'agent `succieu.relecteur` par saisie « submitted » encore non confiée. L'agent suit `docs/relecture-agent.md` (show → submit-review → notify).

Prérequis : Node 20+, CLI `timon` dans le `PATH` du déclencheur, aucune dépendance npm.

## 1. Discord (Florent)

1. Sur le serveur FBL, créer le salon texte `alertes-mairie`.
2. Paramètres du salon → Intégrations → Webhooks → Nouveau webhook ; copier l'URL.

## 1 bis. Mail de modération (Florent)

La 2e modératrice n'a pas accès au Discord : elle reçoit un mail à chaque nouvelle saisie, au même moment que l'alerte Discord (étape `notify`).

1. Dans l'espace client OVH, créer une boîte dédiée du domaine succieu.fr (ex. `moderation@succieu.fr`) et noter son mot de passe. Le domaine a déjà son MX OVH et son SPF `include:mx.ovh.com` : rien d'autre à configurer.
2. Serveur d'envoi OVH : la boîte `moderation@succieu.fr` est un compte **Email Pro** (offre « BAL mairie ») → `pro2.mail.ovh.net`, port 587, STARTTLS (valeurs par défaut du script ; le port 465 est fermé sur ce serveur). Pour une boîte **MX Plan**, fixer `SMTP_HOST=ssl0.ovh.net` et `SMTP_PORT=465` (TLS implicite). Le script choisit le mode selon le port : 465 = TLS implicite, tout autre port = STARTTLS (certificat vérifié, jamais d'authentification en clair). Authentification avec l'adresse complète et le mot de passe de la boîte.
3. Déposer les secrets ci-dessous (section 2). Sans `SMTP_USER` ni `MAIL_MODERATION_TO`, le canal mail est désactivé et seul Discord est utilisé.
4. Valider : `node scripts/relecture/cli.mjs test-mail` envoie un mail d'essai aux destinataires configurés (sans saisie). Sortie attendue : « Mail envoyé (N destinataires). ».

## 2. Secrets Timon (Florent)

Dans le coffre de secrets Timon, en mode **inject** (injection en variables d'environnement), pour le projet `succieu` :

| Variable | Valeur |
|---|---|
| `REVIEW_API_TOKEN` | Même valeur que `REVIEW_API_TOKEN` du serveur (≥ 24 caractères) |
| `DISCORD_WEBHOOK_ALERTES_MAIRIE` | URL du webhook « Alertes Mairie » du salon #alertes-mairie (serveur FBL), déposée par Florent dans le coffre de secrets Timon (mode inject, périmètre `project:succieu`, car c'est l'agent succieu.relecteur qui poste). Ne jamais l'afficher. |
| `SMTP_USER` | Adresse complète de la boîte d'envoi (ex. `moderation@succieu.fr`), secret en mode inject, périmètre `project:succieu` |
| `SMTP_PASSWORD` | Mot de passe de cette boîte (même mode et périmètre). Ne jamais l'afficher. |
| `MAIL_MODERATION_TO` | Adresses des modérateurs, séparées par des virgules |

Variables mail facultatives : `MAIL_FROM` (défaut `SMTP_USER`), `SMTP_HOST` (défaut `pro2.mail.ovh.net`), `SMTP_PORT` (défaut `587`, STARTTLS). Le script n'écrit jamais le mot de passe ni les adresses des destinataires dans ses messages.

`SUCCIEU_BASE_URL` (défaut `https://succieu.fr`), `RELECTURE_STATE_FILE` (défaut `~/.timon/state/succieu-relecture.json`) et `TIMON_BIN` (défaut : CLI de la version active de Timon) ont des valeurs par défaut, car un déclencheur lance le script sans shell ni variables propres. `RELECTURE_STATE_FILE` n'est pas un secret : chemin du journal d'état, **hors dépôt**, par exemple `~/.timon/state/succieu-relecture.json` (créé avec les droits 600). Le journal évite de créer deux fois la même tâche ; le supprimer relance une tâche par saisie encore « submitted ». L'agent relecteur doit aussi recevoir ces variables (secrets injectés), sauf `RELECTURE_STATE_FILE`.

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
4. Laisser l'agent travailler : la saisie passe au statut `reviewed` (visible côté admin avec l'avis et la version corrigée) et l'alerte arrive dans `#alertes-mairie` et, si le mail est configuré, dans la boîte des modérateurs, avec le lien `…/espace-bureau/moderation/<id>`.
5. Rejeter la saisie de test depuis l'espace admin.

Tests automatiques (aucun appel réseau) : `npm run test:relecture`.

## Dépannage

- `HTTP 401` : `REVIEW_API_TOKEN` différent de celui du serveur.
- `injoignable` : `SUCCIEU_BASE_URL` erronée ou site arrêté ; le déclencheur réessaie 5 min plus tard.
- Discord `HTTP 404/401` : webhook supprimé ou mal copié.
- Tâche non créée mais saisie en attente : voir le message d'erreur de `timon task create` (agent `succieu.relecteur` ou projet `succieu` inexistants).
- Mail `SMTP : échec à l'étape AUTH (code 535)` : identifiants refusés (`SMTP_USER` doit être l'adresse complète, mot de passe de la boîte à vérifier, par exemple par une connexion au webmail OVH). Si l'adresse et le mot de passe sont bons, vérifier que le serveur correspond à l'offre : une boîte Email Pro s'authentifie sur `pro2.mail.ovh.net:587`, une boîte MX Plan sur `ssl0.ovh.net:465` ; un 535 sur `ssl0` pour une boîte Email Pro est le symptôme classique d'un mauvais serveur.
- Mail `délai dépassé` ou `connexion impossible` : port ou pare-feu (le Mac doit joindre `pro2.mail.ovh.net:587` en sortie, ou `ssl0.ovh.net:465` pour MX Plan) ; `SMTP_HOST`/`SMTP_PORT` erronés.
- Mail `n'annonce pas STARTTLS` : le serveur visé n'est pas le bon pour ce port (587 attend un serveur STARTTLS) ; corriger `SMTP_HOST`/`SMTP_PORT`.
- Mail `RCPT TO (code 5xx)` : une adresse de `MAIL_MODERATION_TO` est refusée par le serveur.
- Mail reçu en courrier indésirable : le dire à la modératrice, l'ajouter à ses expéditeurs sûrs.
- `notify` sort en erreur si un canal échoue (message « Échec du canal … Canal réussi : … ») : l'autre canal a bien été envoyé, ne pas relancer `notify` sans nécessité (il renverrait l'alerte déjà partie).
