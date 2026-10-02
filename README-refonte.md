# Larchant Animation: refonte Nuxt 4 + Directus

Monorepo de la refonte 2026 : backend **Directus** (Docker), site public **Nuxt 4 (SSR)**,
**Studio** d'administration (Nuxt SPA). Remplace l'ancien site Hugo (`content/`, `static/`,
`config/`, `layouts/`, `netlify.toml`…) une fois la mise en production validée.

```
docker-compose.yml      Directus 11 + Postgres 16
directus/snapshot.yml   schéma versionné (directus schema apply)
migration/              scripts one-shot : schéma, migration contenu, permissions publiques
site/                   site public Nuxt 4 (port 13010), lit Directus à runtime
studio/                 admin Nuxt SPA (port 13011), proxy Directus, auth JWT
ecosystem.config.cjs    PM2 (prod)
deploy/                 vhosts nginx et script de sauvegarde quotidienne
```

## Démarrage local
```bash
cp .env.example .env           # remplir POSTGRES_PASSWORD, DIRECTUS_SECRET, DIRECTUS_ADMIN_PASSWORD
docker compose up -d           # Directus → http://localhost:18056

cd migration && npm install
npm run schema                 # crée le schéma (ou : directus schema apply directus/snapshot.yml)
npm run migrate                # importe le contenu de ../content
npm run permissions            # lecture publique (rôle Public)

cd ../site   && npm install && npm run dev    # http://localhost:13010
cd ../studio && npm install && npm run dev    # http://localhost:13011
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

## Production (beta) : runbook

> **Ne jamais relancer `npm run migrate` une fois que les bénévoles ont commencé à modifier le contenu dans le Studio : la migration réécrit les contenus importés et écrase leur travail.**

**Machine** : VPS `hostinger-KVM`, dépôt dans `/root/larchant-animation` (branche `refonte-directus`), Node 22.
Ports, tous en écoute locale uniquement : site `13010`, Studio `13011`, Directus `18056`, Postgres `54322`
(IMAP occupe déjà 13000, 13001, 18055 et 54321 : ne pas y toucher).
Domaines : `beta.larchantanimation.fr` (site), `studio.larchantanimation.fr`, `api.larchantanimation.fr` (Directus).
`larchantanimation.fr` reste sur Netlify jusqu'à la bascule.

### 1. Installation
```bash
git clone -b refonte-directus https://github.com/quentinglorieux/larchant-animation.git /root/larchant-animation
cd /root/larchant-animation && cp .env.example .env && chmod 600 .env
# .env : mots de passe et secret aléatoires (openssl rand -hex …),
# DIRECTUS_PUBLIC_URL=https://api.larchantanimation.fr, NUXT_PUBLIC_DIRECTUS_URL=https://api.larchantanimation.fr,
# NUXT_PUBLIC_SITE_URL=https://beta.larchantanimation.fr
docker compose up -d
cp deploy/nginx/larchant.conf /etc/nginx/sites-available/larchant
ln -s /etc/nginx/sites-available/larchant /etc/nginx/sites-enabled/larchant
nginx -t && systemctl reload nginx
certbot --nginx -d beta.larchantanimation.fr -d studio.larchantanimation.fr -d api.larchantanimation.fr
```

### 2. Import initial du contenu (une seule fois)
```bash
cd /root/larchant-animation/migration && npm ci
npm run schema && npm run permissions && npm run migrate && npm run review
git diff --stat editions-review.md   # doit être vide (identique à la version validée)
```

### 3. Build et PM2 (à chaque mise à jour du code)
```bash
cd /root/larchant-animation
git fetch origin main && git merge origin/main   # récupère les derniers contenus Decap (content/)
(cd migration && npm run redirects)             # régénère site/redirects.json ; committer s'il a changé
export NUXT_PUBLIC_DIRECTUS_URL=https://api.larchantanimation.fr NUXT_PUBLIC_SITE_URL=https://beta.larchantanimation.fr
(cd site && npm ci && npm run build) && (cd studio && npm ci && npm run build)
pm2 start ecosystem.config.cjs && pm2 save      # ensuite : pm2 restart larchant-site larchant-studio
(cd migration && npm run verify -- https://beta.larchantanimation.fr)
```
PM2 lance les deux serveurs Nitro sur `127.0.0.1` (variable `HOST`) : seul nginx est exposé.

### 4. Sauvegarde quotidienne
```bash
(crontab -l 2>/dev/null; echo "30 3 * * * /root/larchant-animation/deploy/backup.sh >> /var/log/larchant-backup.log 2>&1") | crontab -
```
`deploy/backup.sh` dépose un dump Postgres et une archive des médias dans `/root/backups/larchant`, conservés 14 jours.

### 5. Indexation
Pendant la beta, `site/public/robots.txt` contient `Disallow: /` (et le Studio est en `noindex`).
**À la bascule de `larchantanimation.fr`**, remplacer ce fichier par un `robots.txt` qui autorise l'indexation
(`Allow: /`, sitemap sur le domaine définitif) et mettre à jour `NUXT_PUBLIC_SITE_URL`, `CORS_ORIGIN` et les vhosts nginx.

Le contenu est mis à jour instantanément via le Studio (pas de rebuild du site).
