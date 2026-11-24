#!/usr/bin/env bash
# Déploiement de succieu.fr : build à côté, échange de dossiers, contrôle, retour arrière automatique.
# Lancé en root par .github/workflows/deploy.yml (voir docs/deploiement.md) ; le travail
# applicatif (git, npm) se fait en `loic`. Aucun secret n'est affiché.
#
# Usage : deploy-site.sh [--ref <branche|SHA>] [--dry-run]
set -euo pipefail

# --- Paramètres (surchargeables pour les essais ; en production, ne rien définir) ---
WWW_DIR="${DEPLOY_WWW_DIR:-/var/www}"
APP_NAME="${DEPLOY_APP_NAME:-succieu-web}"
ENV_FILE="${DEPLOY_ENV_FILE:-/etc/succieu-web/succieu-next.env}"
REPO_URL="${DEPLOY_REPO_URL:-https://github.com/FlorentBL/Succieu.git}"
RUN_AS="${DEPLOY_RUN_AS-loic}"            # vide = pas de sudo (essais uniquement)
SERVICE="${DEPLOY_SERVICE:-succieu-next}"
BASE_URL="${DEPLOY_BASE_URL:-http://127.0.0.1:3000}"
EXPECTED_HOST="${DEPLOY_EXPECTED_HOST:-ns3112889}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/var/lock/succieu-deploy.lock}"
HEALTH_TIMEOUT="${DEPLOY_HEALTH_TIMEOUT:-60}"
KEEP_PREV=2
TEST_MODE="${DEPLOY_TEST_MODE:-0}"         # 1 = autorise un WWW_DIR hors /var/www, saute le contrôle d'hôte

REF="main"
DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --ref) [ $# -ge 2 ] || { echo "--ref demande une valeur" >&2; exit 2; }; REF="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $1" >&2; exit 2 ;;
  esac
done

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { log "ERREUR : $*"; exit 1; }

[[ "$REF" =~ ^[A-Za-z0-9._/-]+$ ]] || die "référence invalide (caractères autorisés : lettres, chiffres, . _ / -)"
[[ "$REF" != -* ]] || die "référence invalide"

LIVE="$WWW_DIR/$APP_NAME"
NEW="$WWW_DIR/$APP_NAME-new"
STAMP="$(date +%Y%m%d-%H%M)"
PREV="$WWW_DIR/$APP_NAME-prev-$STAMP"

# Garde-fou : on ne touche qu'à /var/www/succieu-web*
if [ "$TEST_MODE" != "1" ]; then
  [ "$WWW_DIR" = "/var/www" ] && [ "$APP_NAME" = "succieu-web" ] || die "chemins hors /var/www/succieu-web* refusés"
fi

as_app() { if [ -n "$RUN_AS" ]; then sudo -u "$RUN_AS" -H "$@"; else "$@"; fi; }
run() { # exécute, ou affiche en --dry-run
  if [ "$DRY_RUN" = 1 ]; then log "[dry-run] $*"; else "$@"; fi
}

check_url() { # code HTTP attendu 200
  local code
  code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$BASE_URL$1" || true)"
  [ "$code" = "200" ]
}

wait_healthy() { # attend / puis contrôle les pages clés
  local waited=0
  until check_url "/"; do
    waited=$((waited + 2))
    [ "$waited" -lt "$HEALTH_TIMEOUT" ] || return 1
    sleep 2
  done
  local p
  for p in /ma-mairie /petite-enfance-ecole; do
    check_url "$p" || { log "contrôle KO : $p"; return 1; }
    log "contrôle OK : $p"
  done
  return 0
}

restart_service() { if [ "$TEST_MODE" = 1 ] && [ -z "${DEPLOY_REAL_SYSTEMCTL:-}" ]; then log "(essai) redémarrage de $SERVICE simulé"; else systemctl restart "$SERVICE"; fi; }

cd "$WWW_DIR" || die "$WWW_DIR inaccessible"

rollback() { # remet l'ancienne version en ligne ; ne dépend d'aucun état supposé
  set +e
  log "RETOUR ARRIÈRE"
  local failed="$WWW_DIR/$APP_NAME-failed-$STAMP"
  if [ -d "$PREV" ]; then
    [ ! -e "$LIVE" ] || mv "$LIVE" "$failed"
    mv "$PREV" "$LIVE" || { log "ATTENTION : impossible de remettre $PREV en place, intervention manuelle"; return 1; }
  fi
  restart_service
  if wait_healthy; then log "ancienne version rétablie (version refusée gardée dans $failed)"; else log "ATTENTION : ancienne version rétablie mais le contrôle échoue encore, intervention manuelle"; fi
}

log "Déploiement de succieu.fr — réf. « $REF »$([ "$DRY_RUN" = 1 ] && echo ' (dry-run)')"

# 1. Hôte et verrou
if [ "$TEST_MODE" != "1" ]; then
  [ "$(hostname)" = "$EXPECTED_HOST" ] || die "hôte inattendu ($(hostname)), attendu $EXPECTED_HOST"
fi
log "1/7 hôte vérifié"
if [ "$DRY_RUN" = 1 ]; then
  log "[dry-run] verrou flock sur $LOCK_FILE"
else
  if [ "$TEST_MODE" = 1 ] && ! command -v flock >/dev/null 2>&1; then
    log "(essai) flock absent, verrou ignoré"
  else
    exec 9>"$LOCK_FILE"
    flock -n 9 || die "un autre déploiement est en cours"
    log "verrou pris"
  fi
fi
[ -d "$LIVE" ] || die "$LIVE introuvable"
[ ! -e "$PREV" ] || die "$PREV existe déjà (deux déploiements dans la même minute ?)"

# 2. Clone propre
log "2/7 clone de la révision demandée dans $NEW"
if [ -e "$NEW" ]; then run rm -rf "$NEW"; fi
run install -d -o "${RUN_AS:-$(id -un)}" -g "${RUN_AS:-$(id -gn)}" "$NEW"
run as_app git clone -q "$REPO_URL" "$NEW"
run as_app git -C "$NEW" checkout -q --detach "$REF"
if [ "$DRY_RUN" = 1 ]; then
  log "[dry-run] écriture de $NEW/REVISION"
else
  REV="$(as_app git -C "$NEW" rev-parse HEAD)"
  printf '%s\n' "$REV" | as_app tee "$NEW/REVISION" >/dev/null
  log "révision : $REV"
fi

# 3. Dépendances
log "3/7 npm ci"
if [ "$DRY_RUN" = 1 ]; then
  log "[dry-run] (cd $NEW && env -u NODE_ENV npm ci --no-audit --no-fund)"
else
  ( cd "$NEW" && as_app env -u NODE_ENV npm ci --no-audit --no-fund )
fi

# 4. Build avec l'environnement du service (sans l'afficher)
log "4/7 build (variables de $ENV_FILE chargées)"
if [ "$DRY_RUN" = 1 ]; then
  log "[dry-run] (cd $NEW && set -a; . $ENV_FILE; npm run build) puis vérification de .next/BUILD_ID"
else
  [ -r "$ENV_FILE" ] || [ -n "$RUN_AS" ] || die "$ENV_FILE illisible"
  ( cd "$NEW" && as_app env -u NODE_ENV bash -c 'set -a; . "$1"; set +a; npm run build' _ "$ENV_FILE" )
  [ -s "$NEW/.next/BUILD_ID" ] || die "build incomplet : .next/BUILD_ID absent"
  log "build OK"
fi

# 5. Échange
log "5/7 échange : $LIVE → $PREV, $NEW → $LIVE"
if [ "$DRY_RUN" = 1 ]; then
  log "[dry-run] mv $LIVE $PREV ; mv $NEW $LIVE ; restart $SERVICE (échec → retour arrière)"
else
  mv "$LIVE" "$PREV"
  if ! { mv "$NEW" "$LIVE" && restart_service; }; then
    log "échange ou redémarrage échoué"
    rollback
    exit 1
  fi
fi

# 6. Contrôle et retour arrière
log "6/7 contrôle de $BASE_URL (délai max ${HEALTH_TIMEOUT}s)"
if [ "$DRY_RUN" = 1 ]; then
  log "[dry-run] attente 200 sur /, puis /ma-mairie et /petite-enfance-ecole ; sinon retour arrière automatique"
else
  if wait_healthy; then
    log "site en ligne sur la nouvelle version"
  else
    log "contrôle échoué"
    rollback
    exit 1
  fi
fi

# 7. Nettoyage : ne garder que les 2 derniers -prev-
log "7/7 nettoyage des anciennes versions (on garde $KEEP_PREV dossiers -prev-)"
while IFS= read -r d; do
  [ -n "$d" ] || continue
  case "$d" in "$WWW_DIR/$APP_NAME-prev-"*) run rm -rf "$d"; log "supprimé : $d" ;; esac
done < <(find "$WWW_DIR" -maxdepth 1 -type d -name "$APP_NAME-prev-*" | sort -r | tail -n +$((KEEP_PREV + 1)))
log "Terminé."
