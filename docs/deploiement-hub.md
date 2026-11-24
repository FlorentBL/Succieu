# Bascule vers le hub /espace-bureau — procédure de déploiement

Ce document prépare la bascule de `suivi.succieu.fr` (service `suivi-bureau`) et `sdf.succieu.fr` (service `mairie-reservations`) vers le hub de `succieu.fr` (service `succieu-next`). **Rien n'est déployé par le dépôt** : toutes les commandes ci-dessous sont à exécuter à la main sur le serveur Mairie, après accord explicite de Florent. Le contrat technique du hub est dans `docs/espace-bureau.md`.

Repères du serveur (à vérifier avant de commencer) : code `/var/www/succieu-web`, service `succieu-next`, environnement `/etc/succieu-web/succieu-next.env`, données du hub `/var/lib/succieu-web` (propriétaire `loic`), anciennes données `/var/lib/suivi-bureau` et `/root/mairie-reservations/data`, nginx en frontal.

> **Attention : depuis le 24/11/2026, pousser sur `main` ne déploie plus rien.** La mise en ligne passe uniquement par le workflow manuel « Deploy to OVH » (`gh workflow run deploy.yml -R FlorentBL/Succieu -f ref=<branche|SHA>`, voir `docs/deploiement.md`), qui lance `deploy/deploy-site.sh` (build à côté, échange de dossiers, contrôle de 3 pages, retour arrière automatique). Ce workflow ne sauvegarde ni ne migre les données : ne le lancer pour le hub qu'après l'étape 6 de cette procédure et avec l'accord explicite de Florent. Le build « à côté » ci-dessous ne passe pas par lui.

## À fournir avant la bascule (par Florent)

1. **La liste des personnes** : nom affiché, identifiant (par défaut le prénom sans accent), rôle (`admin` ou `membre`) et droits par module (`actus-agenda`, `espace-bureau`, `salle-des-fetes`, `documents` ; niveaux `read` / `write`, absent = aucun accès). Fichier JSON **hors dépôt** (format à l'étape 2), jamais versionné.
2. **`BUREAU_DRIVE_URL`** : adresse https du drive du module Documents (à défaut : `https://drive.succieu.fr/`).
3. Le prénom et le nom du **premier administrateur** (étape 7) et un mot de passe choisi par lui, saisi au clavier sur le serveur.
4. Une table `correspondances.json` pour les élus ambigus du suivi (facultatif : voir `docs/espace-bureau.md`, import du suivi).
5. L'accord sur la **fenêtre d'arrêt** (≈ 15 à 30 minutes ; les écritures des trois applications sont suspendues).
6. Un endroit **hors serveur** pour archiver les anciens journaux (étape 5).

## Étape 0 — Contrôles préalables (aucune écriture)

```bash
systemctl is-active succieu-next suivi-bureau mairie-reservations
df -h /var/lib /var/www /root                       # place pour 2 copies du site et des sauvegardes
node --version                                      # identique à celui du service
ls /etc/nginx/sites-enabled/ ; nginx -t
```

Retour arrière : sans objet (lecture seule).

## Étape 1 — Sauvegarde préalable

```bash
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p /root/sauvegardes-bascule-$STAMP && cd /root/sauvegardes-bascule-$STAMP
tar -czpf succieu-web-data.tgz     -C /var/lib succieu-web
tar -czpf suivi-bureau-data.tgz    -C /var/lib suivi-bureau
tar -czpf mairie-reservations.tgz  -C /root/mairie-reservations data
tar -czpf succieu-web-code.tgz     -C /var/www succieu-web --exclude=node_modules --exclude=.next
cp -p /etc/succieu-web/succieu-next.env succieu-next.env.avant   # contient des secrets : 0600, jamais hors serveur
cp -a /etc/nginx/sites-available nginx-sites-available.avant
chmod -R go-rwx . ; sha256sum *.tgz > SHA256SUMS
```

Faire **une seconde sauvegarde dans la fenêtre d'arrêt** (étape 4), pour qu'elle ne manque aucune écriture. Retour arrière : supprimer le dossier de sauvegarde (rien d'autre n'a changé).

## Étape 2 — Répétition à blanc sur une copie (sans arrêt, sans effet)

Sur une **copie** des données, pour valider la liste de comptes et le rapport d'import :

```bash
REPET=$(mktemp -d /root/repetition-hub.XXXXXX) && chmod 700 $REPET
cp -a /var/lib/suivi-bureau/bureau.json $REPET/ ; cp -a /root/mairie-reservations/data $REPET/sdf
cd /var/www/succieu-web-new      # le build de l'étape 3, ou un poste local avec le dépôt
DATA_DIR=$REPET/hub node scripts/hub-migrate.mjs --users /chemin/hors-depot/comptes.json \
  --suivi $REPET/bureau.json [--map /chemin/correspondances.json] --sdf $REPET/sdf          # --dry-run par défaut
```

`comptes.json` : `[{ "displayName": "Prénom Nom", "identifier": "prenom", "role": "membre", "rights": { "espace-bureau": "write", "documents": "read" } }]` (`identifier`, `role`, `rights` facultatifs ; absent = identifiant tiré du prénom, `membre`, aucun droit). Le script valide toute la liste avant d'écrire quoi que ce soit.

La simulation n'écrit **rien** (ni compte, ni fiche, ni import) ; relire le rapport : comptes à créer, élus rapprochés ou non, réservations lues/ajoutées/ignorées, chevauchements. Corriger la liste ou la table, recommencer. Nettoyage : `rm -rf $REPET`. Retour arrière : sans objet.

## Étape 3 — Build à côté (site en service, non touché)

```bash
cd /var/www
git clone --branch <branche-du-hub> /chemin/ou/URL/du/depot succieu-web-new   # ou rsync du dépôt validé
cd succieu-web-new
npm ci && env -u NODE_ENV npx next build        # le service continue de tourner sur l'ancien dossier
```

Contrôler l'environnement (étape suivante) avant de basculer. Retour arrière : `rm -rf /var/www/succieu-web-new`.

## Étape 4 — Environnement et arrêt des écritures (début de la fenêtre)

Éditer `/etc/succieu-web/succieu-next.env` (garder la sauvegarde `.avant`) :

| Action | Variable | Remarque |
|---|---|---|
| **Retirer** | `BUREAU_PASSWORD_HASH` | Supprimée : connexion par comptes individuels. |
| **Retirer** | `ADMIN_PASSWORD_HASH` | Idem. |
| Conserver | `DATA_DIR=/var/lib/succieu-web`, `SESSION_SECRET` (≥ 32 caractères), `REVIEW_API_TOKEN` (≥ 24), `SITE_ORIGINS` si présent | Inchangées. |
| **Ajouter** (facultatif) | `HUB_SESSION_HOURS` | Durée de session en heures, défaut 2160 (90 jours). |
| **Ajouter** (synchro drive) | `DRIVE_URL=https://drive.succieu.fr`, `DRIVE_ADMIN_USER=admin`, `DRIVE_ADMIN_PASSWORD` | Secret **repris de `/opt/ocis/.env.secret`** (`OCIS_ADMIN_PASSWORD`) côté serveur **sans l'afficher** (copie par un éditeur ou une redirection de fichier, jamais en argument de commande ni dans l'historique). Sans ces trois variables, la synchro est désactivée et le hub fonctionne seul. Facultatif : `DRIVE_MAIL_DOMAIN`. Le fichier `/etc/succieu-web/succieu-next.env` doit être en **640 root:loic**. **Risque assumé** : le hub détient alors un accès administrateur au drive. |
| **Ajouter** (si Florent le fournit) | `BUREAU_DRIVE_URL` | https uniquement, lu côté serveur ; défaut `https://drive.succieu.fr/`. |

Garder `SESSION_SECRET` inchangé n'est pas nécessaire : les anciennes sessions du site ne sont de toute façon pas reprises (tout le monde se reconnecte avec son compte).

Puis **suspendre les écritures** (début de la fenêtre) et refaire la sauvegarde :

```bash
systemctl stop suivi-bureau mairie-reservations succieu-next
# refaire ici la sauvegarde de l'étape 1 (nouveau STAMP) : les trois dossiers de données sont maintenant figés
```

Retour arrière : restaurer `succieu-next.env.avant` ; `systemctl start succieu-next suivi-bureau mairie-reservations`.

## Étape 5 — Archivage des anciens journaux d'audit (hors site)

Les journaux d'audit des anciennes applications ne sont **pas repris** dans le journal du hub (`hub-audit.jsonl`) tels quels :

- `audit.jsonl` de suivi.succieu.fr (`/var/lib/suivi-bureau`) : **non importé** ;
- `audit-log.json` de la salle des fêtes (`/root/mairie-reservations/data`) : l'import de la salle le lit et reprend ses événements dans `salle-des-fetes/audit.jsonl`, mais les entrées invalides sont ignorées et les comptes (`web-users.json`) ne sont jamais lus.

Dans les deux cas, **conserver une copie hors site** (hors serveur Mairie) avant de désactiver les anciens services, au titre de la traçabilité :

```bash
cd /root/sauvegardes-bascule-$STAMP
cp -p /var/lib/suivi-bureau/audit.jsonl ancien-suivi-audit.jsonl
cp -p /root/mairie-reservations/data/audit-log.json ancien-sdf-audit-log.json
# puis copier ces deux fichiers (et SHA256SUMS) vers le stockage hors serveur choisi
```

Retour arrière : sans objet (copies).

## Étape 6 — Échange des dossiers

```bash
cd /var/www
mv succieu-web succieu-web.avant-hub
mv succieu-web-new succieu-web
chown -R <propriétaire habituel du site> succieu-web     # même propriétaire que succieu-web.avant-hub
```

`/var/lib/succieu-web` reste en place (données hors build). Retour arrière : `mv succieu-web succieu-web.hub-echec && mv succieu-web.avant-hub succieu-web` (puis, si l'ancien environnement est restauré, redémarrer les trois services).

## Étape 7 — Premier administrateur, AVANT l'ouverture

Toujours avec les trois services arrêtés (personne ne peut se connecter) :

```bash
cd /var/www/succieu-web
set -a; . /etc/succieu-web/succieu-next.env; set +a
sudo -u loic env DATA_DIR=$DATA_DIR node scripts/hub-create-admin.mjs <prenom> "Prénom Nom"   # mot de passe saisi masqué
```

Le mot de passe n'apparaît ni à l'écran ni dans le journal. Les fichiers créés doivent appartenir à `loic` (`ls -l /var/lib/succieu-web`). Retour arrière : restaurer `succieu-web-data.tgz` de la seconde sauvegarde.

## Étape 8 — Migration à blanc, puis réelle (sur les vraies données, services arrêtés)

```bash
cd /var/www/succieu-web ; set -a; . /etc/succieu-web/succieu-next.env; set +a
ARGS="--users /chemin/hors-depot/comptes.json --suivi /var/lib/suivi-bureau/bureau.json --sdf /root/mairie-reservations/data"
sudo -u loic env DATA_DIR=$DATA_DIR node scripts/hub-migrate.mjs $ARGS                # 1) à blanc : rien n'est écrit
# relire le rapport ; ajouter --map correspondances.json si des élus sont « non rapprochés »
sudo -u loic env DATA_DIR=$DATA_DIR node scripts/hub-migrate.mjs $ARGS --apply \
    --sheet /root/fiche-comptes-hub.txt                                               # 2) réelle
chmod 600 /root/fiche-comptes-hub.txt
```

- **Avant d'appliquer, avec la synchro active** : `sudo -u loic env DATA_DIR=$DATA_DIR node scripts/drive-accounts.mjs` (variables `DRIVE_*` chargées ; lecture seule) liste les comptes du drive et l'écart avec `users.json`. Dans `comptes.json`, `"driveLogin"` indique le compte drive quand il diffère de l'identifiant (ex. la secrétaire : `"driveLogin": "secretariat"`).
- **Étape de bascule — mots de passe communs hub + drive pour tous** : avec les variables `DRIVE_*` chargées, la migration crée ou rattache le compte drive de chaque personne et pose **le même mot de passe sur les deux** (le drive d'abord ; refus du drive ⇒ la personne n'est pas créée, signalée dans « ÉCHECS », relance sans danger). `--reset-all` repose aussi un nouveau mot de passe commun aux comptes déjà présents (nécessaire pour remplacer les mots de passe drive actuels des élus). Une fiche par personne : un identifiant et un mot de passe valables sur le site et le drive. Les espaces du drive (ex. « Bureau ») ne sont pas touchés : les accès se règlent dans le drive.
- Comptes : créés avec un mot de passe attribué (`xxxx-xxxx-xxxx`) écrit **uniquement** dans la fiche imprimable (0600, un bloc par personne, saut de page entre chaque) ; jamais dans la sortie, le rapport ni `hub-audit.jsonl`. La fiche est refusée si elle est dans le dépôt, et n'écrase jamais un fichier existant.
- Idempotent : relancer ne recrée pas un compte existant (son mot de passe n'est pas modifié) ni ne réimporte un dossier ou une réservation déjà présents. Un compte dont la fiche est perdue se réinitialise dans `/espace-bureau/administration` (mot de passe attribué par l'administrateur, aussi sur le drive). Les personnes ne peuvent pas changer elles-mêmes leur mot de passe.
- Si une étape d'import échoue, le script le dit (« ÉCHEC PARTIEL ») et peut être relancé tel quel.
- **Imprimer la fiche, la remettre en main propre, puis l'effacer** (`shred -u /root/fiche-comptes-hub.txt` ou équivalent) ; ne pas l'envoyer par messagerie.

Retour arrière : restaurer `succieu-web-data.tgz` (seconde sauvegarde) : `systemctl stop succieu-next; mv /var/lib/succieu-web /var/lib/succieu-web.migration-echec; tar -xzpf succieu-web-data.tgz -C /var/lib`. Les anciennes applications n'ont pas été modifiées.

## Étape 9 — Démarrage et contrôles après (fin de la fenêtre d'arrêt pour le hub)

```bash
systemctl start succieu-next ; sleep 3 ; systemctl is-active succieu-next ; journalctl -u succieu-next -n 30 --no-pager
curl -s -o /dev/null -w '%{http_code}\n' https://succieu.fr/                       # 200
for p in /actualites /agenda /espace-bureau/connexion; do curl -s -o /dev/null -w "$p %{http_code}\n" https://succieu.fr$p; done   # 200
curl -s -o /dev/null -w '%{http_code}\n' https://succieu.fr/api/hub/session         # 401 sans cookie
curl -s -o /dev/null -w '%{http_code}\n' https://succieu.fr/api/bureau/submissions  # 401 sans cookie
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://succieu.fr/espace-bureau/administration   # 307, vers /espace-bureau/connexion
curl -s https://succieu.fr/robots.txt | grep -E 'Disallow: /(espace-bureau|api)/?'  # présent
```

Les anciennes routes `/api/bureau/{login,identity,logout,names,session}` et `/api/admin/{login,logout,session}` n'existent plus (404 attendu ; l'ancien contrôle « `/api/bureau/names` 401 » est périmé).

Contrôles à la main (navigateur) : connexion de l'administrateur → `/espace-bureau` ; création d'un compte test depuis `/espace-bureau/administration` (mot de passe affiché une fois), connexion avec ce mot de passe (aucun changement imposé), puis désactivation du compte test ; ouvrir chacun des modules (Actualités & agenda, Espace Bureau, Salle des fêtes, Documents) avec un compte de droits adaptés : lecture sans boutons d'écriture, écriture complète ; vérifier une réservation et un dossier importés ; ajouter et modifier une saisie de test puis la retirer ; ouvrir le lien Documents.

Ajouter dans le vhost `succieu.fr`, **s'il n'y est pas déjà**, `proxy_set_header X-Forwarded-For $remote_addr;` (et conserver `client_max_body_size 41m;`) : l'application prend la première valeur de `X-Forwarded-For` pour limiter les tentatives de connexion par IP ; si nginx la complète au lieu de l'écraser, un client peut la forger. Vérifier avec `nginx -t`.

**Ne pas continuer si un contrôle échoue.** Retour arrière complet : `systemctl stop succieu-next`, retour de l'étape 6 (dossier), de l'étape 4 (`succieu-next.env.avant`) et de l'étape 8 (données), puis `systemctl start succieu-next suivi-bureau mairie-reservations`. Les anciennes applications et leurs données n'ont jamais été modifiées : elles reprennent là où elles s'étaient arrêtées. Les écritures faites dans le hub après l'ouverture seraient perdues à la restauration : en cas de retour arrière tardif, exporter d'abord les nouveautés.

## Étape 10 — Redirections nginx (suivi.succieu.fr, sdf.succieu.fr)

Après validation de l'étape 9 et remise des fiches. Fichiers : `deploy/nginx/suivi.succieu.fr.conf` et `deploy/nginx/sdf.succieu.fr.conf` (voir `deploy/nginx/README.md`).

```bash
cd /etc/nginx/sites-available
cp suivi.succieu.fr suivi.succieu.fr.avant-hub ; cp sdf.succieu.fr sdf.succieu.fr.avant-hub      # noms réels à vérifier
# reprendre les lignes ssl_certificate / ssl_certificate_key des fichiers actuels (certificats conservés),
# puis remplacer le contenu par celui de deploy/nginx/*.conf adapté
nginx -t && systemctl reload nginx
curl -sI https://suivi.succieu.fr/anything | grep -iE '^(HTTP|location)'   # 301 → https://succieu.fr/espace-bureau/bureau
curl -sI https://sdf.succieu.fr/anything   | grep -iE '^(HTTP|location)'   # 301 → https://succieu.fr/espace-bureau/salle-des-fetes
```

Un 301 est mis en cache par les navigateurs : pour garder une marge de manœuvre, installer d'abord `return 302` pendant la période de validation (étape 11), puis passer à `301`. Le vhost `succieu.fr` et son `client_max_body_size` ne changent pas. Retour arrière : remettre les fichiers `.avant-hub`, `nginx -t && systemctl reload nginx` (les navigateurs qui avaient mis un 301 en cache doivent vider leur cache).

## Étape 11 — Validation, puis arrêt et désactivation des anciens services

Seulement **après quelques jours d'usage validé** par le bureau (pas pendant la fenêtre). Les anciens services doivent pouvoir redémarrer pendant cette période : c'est le retour arrière.

```bash
systemctl stop suivi-bureau mairie-reservations         # 1) arrêt : annulable avec systemctl start
# observer quelques jours : plus d'appel, aucune plainte
systemctl disable suivi-bureau mairie-reservations      # 2) désactivation (ne démarrent plus au boot)
```

Conserver les dossiers de données et les sauvegardes (au moins un trimestre). Retour arrière : `systemctl enable --now suivi-bureau mairie-reservations` et remettre les vhosts `.avant-hub` (étape 10) ; les données qu'ils reprendront sont celles de l'arrêt : les saisies faites dans le hub depuis ne s'y retrouvent pas.

## Contrôles infra-snapshot à adapter (signalés, non modifiés)

Le dépôt ne contient pas les scripts d'infra-snapshot : à vérifier sur le serveur et à adapter par leur propriétaire. Points probables :

- les vérifications d'état des services `suivi-bureau` et `mairie-reservations` (attendus actifs → inactifs/désactivés à l'étape 11) ;
- les sondes HTTP de `suivi.succieu.fr` et `sdf.succieu.fr` (attendues 200 → désormais 301 vers succieu.fr) ;
- toute sonde de `/api/bureau/names` ou `/api/admin/session` sur succieu.fr (routes supprimées → 404) ; remplacer par `/api/hub/session` (401 sans cookie) ;
- les surveillances d'espace disque ou de sauvegarde portant sur `/var/lib/suivi-bureau` et `/root/mairie-reservations/data` (désormais statiques) et sur `/var/lib/succieu-web` (nouveaux fichiers : `users.json`, `espace-bureau.json`, `salle-des-fetes/`, `hub-audit.jsonl`) à **inclure dans les sauvegardes régulières** ;
- le renouvellement des certificats `suivi.succieu.fr` et `sdf.succieu.fr` : conservé tant que les vhosts de redirection existent.

## Contrôles automatisés disponibles dans le dépôt

- `npm test` : logique du hub, parcours complet (`lib/hub/parcours.test.ts`), migration des comptes (`lib/hub/migrate.ts`, script `scripts/hub-migrate.mjs`), imports, salle des fêtes, suivi.
- `node scripts/e2e-hub.mjs` (après `next build`) : mêmes parcours sur les vraies routes HTTP, serveur éphémère et données fictives, sans navigateur ni dépendance.
- `scripts/e2e-moderation.mjs` : parcours navigateur (Playwright) ; exige un `playwright-core` complet (`PLAYWRIGHT_CORE`).
