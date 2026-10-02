# Larchant Animation: refonte Nuxt 4 + Directus

Monorepo de la refonte 2026 : backend **Directus** (Docker), site public **Nuxt 4 (SSR)**,
**Studio** d'administration (Nuxt SPA). Remplace l'ancien site Hugo (`content/`, `static/`,
`config/`, `layouts/`, `netlify.toml`…) une fois la mise en production validée.

```
docker-compose.yml      Directus 11 + Postgres 16
directus/snapshot.yml   schéma versionné (directus schema apply)
migration/              scripts one-shot : schéma, migration contenu, permissions publiques
site/                   site public Nuxt 4 (port 13000), lit Directus à runtime
studio/                 admin Nuxt SPA (port 13001), proxy Directus, auth JWT
ecosystem.config.cjs    PM2 (prod)
```

## Démarrage local
```bash
cp .env.example .env           # remplir POSTGRES_PASSWORD, DIRECTUS_SECRET, DIRECTUS_ADMIN_PASSWORD
docker compose up -d           # Directus → http://localhost:18056

cd migration && npm install
npm run schema                 # crée le schéma (ou : directus schema apply directus/snapshot.yml)
npm run migrate                # importe le contenu de ../content
npm run permissions            # lecture publique (rôle Public)

cd ../site   && npm install && npm run dev    # http://localhost:13000
cd ../studio && npm install && npm run dev    # http://localhost:13001
```

Le Studio se connecte avec le compte admin Directus (`DIRECTUS_ADMIN_EMAIL` / `…_PASSWORD`).

## Modèle de données (résout les évènements récurrents)
- **evenements** : infos pérennes (description, lieu, règlement PDF, catégorie, couleur).
- **editions** : une par an, rattachée (M2O) à un évènement. Le site affiche
  automatiquement l'édition courante en avant + les éditions passées en archive
  (`site/app/utils/editions.ts`).
- **articles ↔ evenements/editions** : maillage M2M (jonctions `articles_evenements`,
  `articles_editions`) : bloc « Articles liés » sur la page évènement, « Évènement lié »
  sur l'article.
- **ateliers, activites, newsletters, pages**, **categories** (thématisation couleur),
  singletons **site_parameters** (logo baleine) et **infos_generales**.

## Production (VPS, type IMAP)
1. `docker compose up -d` (Directus + Postgres derrière un reverse proxy → `api.larchantanimation.fr`).
2. `directus schema apply ./directus/snapshot.yml` puis migration si première mise en route.
3. `cd site && npm ci && npm run build` ; idem `studio/`.
4. `pm2 start ecosystem.config.cjs` (adapter `ROOT` et `DIRECTUS_PROD_URL`).
5. Reverse proxy : `larchantanimation.fr` → :13000, `studio.larchantanimation.fr` → :13001.
6. Mettre à jour `CORS_ORIGIN` dans `docker-compose.yml` avec les domaines de prod.

Le contenu est mis à jour instantanément via le Studio (pas de rebuild du site).
