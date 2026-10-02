# Migration & schéma Directus — Larchant Animation

Outils one-shot, idempotents, pour (1) créer le schéma Directus et (2) importer le contenu
markdown de l'ancien site Hugo (`../content`, `../static`).

## Prérequis
- Directus en marche : `docker compose up -d` à la racine du repo.
- `.env` rempli (cf `../.env.example`) — login admin lu par les scripts.
- `npm install` dans ce dossier.

## Étapes
```bash
npm install
npm run schema      # crée collections / champs / relations (idempotent)
npm run migrate     # importe médias + contenu (idempotent, upsert par slug/legacy_path)
```

Puis régénérer le snapshot de schéma versionné :
```bash
docker compose exec -T directus npx directus schema snapshot --yes /directus/uploads/snapshot.yml
mv directus/uploads/snapshot.yml directus/snapshot.yml   # depuis la racine
```

## Modèle évènements (le point clé)
- `evenements` = infos pérennes (description, lieu, règlement PDF, catégorie/couleur).
- `editions` = une instance par an (M2O → evenement). L'`index.md` de l'ancien site devient
  l'« Édition en cours » (sort = -9999, en tête) ; `index24.md`/`index25.md` → éditions
  archivées par année. Les dates bidon `2023-01-01` sont neutralisées.

## Idempotence
- Médias : `title` = chemin relatif au repo ; ré-upload évité si déjà présent.
- Contenus : upsert par `slug` (evenements, ateliers, activites, pages) ou `legacy_path`
  (editions, articles, newsletters). Slugs dédupliqués de façon déterministe.
- Maillage : jonctions `articles_evenements` créées sans doublon (heuristique par mots-clés,
  à affiner ensuite dans le Studio).

`report.json` résume la dernière exécution.

Attention : relancer `npm run migrate` écrase les modifications faites dans le Studio sur les éléments migrés (site_parameters, slides par position, éditions et leurs champs) ; à n'utiliser que pour l'import initial.
