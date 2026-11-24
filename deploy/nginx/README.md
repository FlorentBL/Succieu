# Fichiers nginx de la bascule du hub

- `suivi.succieu.fr.conf` : 301 vers `https://succieu.fr/espace-bureau/bureau`.
- `sdf.succieu.fr.conf` : 301 vers `https://succieu.fr/espace-bureau/salle-des-fetes`.

Ces fichiers ne sont **pas** déployés par le dépôt. Ils sont installés à la main à l'étape 10 de
`docs/deploiement-hub.md`, après sauvegarde du fichier actuel et reprise de ses lignes de
certificat. Le vhost `succieu.fr` n'est pas modifié (`client_max_body_size 41m;` inchangé :
nécessaire aux envois d'images du module Actualités). Contrôle : `nginx -t` avant `systemctl reload nginx`.
