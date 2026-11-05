# Mesure d'audience

Umami auto-hébergé (sans cookie ni localStorage, donc sans bandeau CNIL) : tableau de bord https://stats.succieu.fr, ID du site `de04bd5d-b426-4e32-a81e-0f464758356b`.
Le traceur (`components/layout/Analytics.tsx`, chargé dans `app/layout.tsx`) ne compte que `succieu.fr` / `www.succieu.fr` (rien en dev ni en local) et est désactivé sur l'espace bureau (`/espace-bureau`), la modération et l'administration.
