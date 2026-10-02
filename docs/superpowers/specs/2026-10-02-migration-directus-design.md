# Migration larchantanimation.fr vers Directus + Nuxt (spec)

**Objectif.** Remplacer le site Hugo + Decap (Netlify) par la refonte `site/` + `studio/` + Directus, pour que 2 à 3 bénévoles sans compétences techniques éditent tout le site, et que chaque édition passée d'un évènement reste archivée et consultable.

**Décisions validées (2026-10-02)**
- Backend Directus 11 + **Postgres 16** (`docker-compose.yml` actuel conservé). Sauvegarde : cron quotidien `pg_dump` + tarball `directus/uploads/`, 14 jours.
- Hébergement : VPS Hostinger (`ssh hostinger-KVM`), même pattern qu'IMAP : site PM2 `:13010`, Studio PM2 `:13011`, Directus Docker `127.0.0.1:18056`, Postgres `127.0.0.1:54322`, nginx + Let's Encrypt. Domaines : le nouveau site est publié sur **`beta.larchantanimation.fr`** (l'actuel reste sur `larchantanimation.fr` / Netlify), plus `studio.` et `api.` ; la bascule du domaine principal se fera plus tard, sur décision explicite. DNS OVH via `ovhcloud` (A vers le VPS 109.176.199.51), chaque commande confirmée.
- Le site lit Directus en direct (cache SWR ~60 s), pas de rebuild.
- Rôles : Public (lecture du publié), **Éditeur unique** (CRUD contenu + fichiers, aucun réglage), Admin.
- Formulaires (contact, newsletter) : composants Vue postant vers les URL **Google Apps Script** actuelles, même jeton anti-spam.

**Modèle de données** (évolutions de `migration/schema.mjs`)
- `editions` : `annee` obligatoire, unique par (évènement, année) ; `edition_label` auto (« Édition 2027 ») ; `sort` abandonné ; `resultats` libellé « Bilan / résultats ».
- Règle d'affichage (`site/app/utils/editions.ts`) : est « en cours » l'édition publiée à venir la plus proche ; sinon la plus récente (affichée « terminée, prochaine édition bientôt annoncée »). Toutes les autres sont des archives, triées par année décroissante, chacune avec sa page `/evenements/<slug>/<annee>`.
- Ajouts : pages `inscriptions` et `merci` ; textes d'accueil (`data/settings.yml`) dans `site_parameters` ; collection `accueil_slides` (image, titre, lien, ordre) depuis `data/carousel.yml`.
- Médias dans le markdown en chemin relatif `/assets/<id>`. Fichiers `.gpx` acceptés.
- Ateliers/activités sans `index.md` (théâtre, pétanque, VTT) non importés (parité avec le site en ligne).

**Studio**
- `MarkdownEditor` (CodeMirror 6) partout : barre d'outils, aperçu live identique au site (même `markdown-it` + CSS), upload d'image par coller/glisser, plein écran, onglets sur mobile.
- Fiche évènement = hub : infos + liste des éditions (badges En cours / Passée / Annulée) + bouton **« Préparer l'édition N+1 »** (duplique la dernière en brouillon).
- Champs techniques masqués (`sort`, `legacy_path`, IDs), libellés en français clair, bouton « Voir sur le site ».
- Tableau de bord (prochaines éditions, brouillons, derniers articles), page « Accueil du site » (textes + carrousel réordonnable), gestion des comptes réservée à l'admin.
- Garde-fous : confirmation avant suppression ; une édition passée se dépublie, elle ne se supprime pas.

**Site public** : pages inscriptions/merci, accueil dynamique, formulaires, bandeau « Archive » + navigation précédente/suivante sur les éditions, classement triathlon 2024 (`/classement`, `/classement_general`) porté en statique, redirections 301 générées depuis les `legacy_path` (`/posts/*`, `/news/*` vers `/blog/*`, etc.), sitemap, meta/OG, 404.

**Migration**
1. `migrate.mjs` corrigé (liens relatifs, gpx, pages, slides) + `migration/editions-overrides.json` pour les dates et années réelles 2024/2025 et le rattachement des comptes rendus aux éditions.
2. Génération de `migration/editions-review.md`, **validé par Quentin avant l'import final**.
3. Import sur le contenu à jour du dépôt.

**Tests** : Vitest sur `currentEdition`/`pastEditions` (future, passée, annulée, sans date) et sur la duplication d'édition ; script post-migration (comptes, liens médias, toutes les anciennes URL en 200/301) ; recette manuelle avec un compte Éditeur.

**Bascule** : déploiement VPS sur `beta.` / `studio.` / `api.`, recette, puis (sur décision) bascule DNS du domaine principal, Netlify gardé en secours jusqu'à stabilité, puis suppression de `content/`, `layouts/`, `static/admin`, `nuxt/`, `netlify.toml`, `vercel.toml`.

**Hors périmètre** : droits par activité, stockage des formulaires dans Directus, SMTP, nouvelle identité visuelle.
