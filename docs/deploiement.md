# Déploiement de succieu.fr

**Pousser sur `main` ne publie plus rien** (décision du 24/11/2026). Le déploiement se lance à la main, quand on le décide.

## Lancer un déploiement

- Sur GitHub : onglet **Actions** → « Deploy to OVH » → **Run workflow**, champ `ref` (branche ou SHA, `main` par défaut).
- Ou en ligne de commande : `gh workflow run deploy.yml -R FlorentBL/Succieu -f ref=main`.

Un seul déploiement à la fois (`concurrency`) ; le script prend en plus un verrou `flock` sur le serveur.

Le workflow récupère `deploy/deploy-site.sh` **à la révision demandée**, l'envoie au serveur Mairie (SSH, secret `SSH_PRIVATE_KEY` inchangé) et l'exécute en root ; tout le travail applicatif (git, npm) est fait en `loic`.

> Le commit qui introduit ce workflow ne déclenche aucun déploiement au push : le workflow exécuté est celui de ce commit (`workflow_dispatch` seul).

## Ce que fait `deploy/deploy-site.sh [--ref <réf>] [--dry-run]`

1. Vérifie l'hôte (`ns3112889`) et prend le verrou (refus si un autre déploiement tourne).
2. Clone proprement la révision dans `/var/www/succieu-web-new` (un résidu est supprimé), écrit `REVISION`.
3. `env -u NODE_ENV npm ci` (sinon les devDependencies manquent).
4. Build avec les variables de `/etc/succieu-web/succieu-next.env` (jamais affichées) ; vérifie `.next/BUILD_ID`.
5. Échange : `succieu-web` → `succieu-web-prev-AAAAMMJJ-HHMM`, `-new` → `succieu-web`, `systemctl restart succieu-next`. Le site n'est interrompu que le temps du redémarrage.
6. Contrôle : `http://127.0.0.1:3000/` en 200 (60 s max), puis `/ma-mairie` et `/petite-enfance-ecole`. En cas d'échec : retour arrière automatique (la version refusée est gardée en `succieu-web-failed-AAAAMMJJ-HHMM`), redémarrage, nouveau contrôle, sortie en erreur.
7. Ne garde que les 2 derniers dossiers `-prev-`. `/var/lib/succieu-web` (données) et `/etc` ne sont jamais touchés ; le script refuse tout chemin hors `/var/www/succieu-web*`.

`--dry-run` affiche les étapes sans rien modifier (ni verrou, ni clone, ni redémarrage).

Un échec avant l'étape 5 laisse le site en ligne intact (il reste seulement un `succieu-web-new` à supprimer, ce que le prochain déploiement fait seul).

## Retour arrière à la main

```bash
cd /var/www
mv succieu-web succieu-web-bad
mv succieu-web-prev-<date> succieu-web
systemctl restart succieu-next
```

Puis supprimer `succieu-web-bad` (et les éventuels `-failed-`) une fois la situation comprise.

Détail de l'environnement serveur : `docs/succieu-web.md` du dépôt Serveur Mairie.
