# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tout le monde, sans hiérarchie stricte (réponse de Florent, 02/11/2026) :

- les habitants, qui cherchent vite une information pratique (démarches, déchets, école, horaires de la mairie), souvent sur téléphone ;
- les nouveaux arrivants, qui découvrent la commune et s'installent ;
- les visiteurs et les associations (image du village, vie locale).

## Product Purpose

Site officiel de la commune de Succieu (Isère, 38300, Nord-Isère) : informations municipales, démarches, vie locale, école, associations et professionnels. Réussite : une information pratique trouvée en quelques secondes, et une commune qui paraît vivante. Le maire a jugé l'ancienne version « triste » (novembre 2026).

## Operating Context

- Hébergé sur le serveur de la mairie (Next.js, service `succieu-next`, dossier `/var/www/succieu-web`), dépôt GitHub `FlorentBL/Succieu`.
- Les alertes municipales sont publiées dans PanneauPocket et intégrées par widget (iframe).
- Prochain chantier prévu : une partie dynamique d'actualités à l'accueil. Les blocs d'actualité doivent pouvoir recevoir des entrées gérées (titre, date, texte, lien, image facultative).

## Capabilities and Constraints

- Pages : Accueil, Ma Mairie (conseil municipal, CCAS, identité et histoire), Mes démarches (administratif, urbanisme), Vivre à Succieu, Petite enfance et école, Associations et professionnels, Contact.
- Contenus repris de l'ancien site WordPress (`ancien.md`). Aucune information ne doit être inventée : horaires, contacts et liens viennent de `lib/site.ts`.
- Pas de photo fournie par la mairie pour l'instant : seule une vue aérienne du village (1024 px) est disponible ; les emplacements photo doivent fonctionner sans image.
- Accessibilité : public de tout âge, contrastes AA au minimum, usage au téléphone.

## Brand Commitments

- Logo à l'étourneau perché sur le « S » de SUCCIEU, avec une colline stylisée en arc, mention « commune nature ». Dessiné en 2020-2026 d'après le blason de 1987 (J. Zambardi). À conserver.
- Le module PanneauPocket reste présent sur le site, pas forcément à l'accueil.
- La devise « Porte des Terres Froides » n'est pas un engagement obligatoire.
