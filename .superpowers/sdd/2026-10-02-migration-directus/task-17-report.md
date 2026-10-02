# Task 17 : rapport

## Paires fusionnées (6), migration/articles-duplicates.json

| Garde (keep) | Supprimé (drop) | Justification |
|---|---|---|
| news 2026-05-16 Sister Rosetta Tharpe | posts 2026-05 Sister Rosetta Tharpe | Même titre, même date (16/05/2026 20h30), même image `rosetta.jpg`, phrases communes « entre concert et théâtre », « pionnière du rock’n’roll ». News garde la date, le lieu (Sablonnière), l’entrée libre, la durée, le contact. |
| news 2026-06-27 Pique-nique d’été | posts 2026-06 Pique-nique d’été | Même titre, date, image, « samedi 27 juin de 19h à 23h30, place des Tilleuls ». News plus complet (groupe Essentielle, buvette). |
| posts 2026-07 Exposition de l’Atelier d’Art | news 2026-07-04 Exposition de l’Atelier d’Art | Même titre, date, affiche. Le corps de la news n’est qu’un lien vers le post et l’image : on garde le post (horaires, vernissage, lieu). |
| news 2026-09-01 Lyrican’Trail 11 octobre | posts 2026-10 Lyrican’Trail « rendez-vous le dimanche 11 octobre » | Même date (2026-10-11), même affiche, même programme (25 km D+999, Kids 9h15, 14 km D+499) et « 11e édition ». News plus complet (liens Chronoteam et inscription Kids). |
| posts 2025-12 L’Hivernale est de retour | news 2026-01-06 L’Hivernale, c’est parti pour les inscriptions ! (« copy ») | Même annonce (Hivernale 2026, 8 mars, même lien Yapla event-101886, même image). Le corps de la news n’est qu’un bouton. On garde le post complet. |
| news 2026-05-04 Foire aux plantes 2026 | posts 2026-02 FOIRE AUX PLANTES | Même évènement et date (5 avril 2026), même image `FAP2026.jpg`, même bulletin `/pdf/FAP2026.pdf`. News plus complet (lieu, présentation). |

Non fusionnés (étapes distinctes) : Lyrican’Trail « inscriptions restent en attente » (août) vs « aura lieu le 11 octobre » ; Foire aux plantes 2025 vs 2026 ; Hivernale 2025 vs 2026 ; Téléthon 2024 vs 2025.
Règle de choix : corps le plus complet (informations pratiques), égalité vers posts. `featured` du keep = vrai si l’un des deux était dans news/.

## migrate.mjs, report.json (1re passe)
{"merged":6,"files":0,"categories":5,"evenements":8,"editions":15,"articles":33,"ateliers":9,"activites":4,"newsletters":12,"pages":7,"links":0,"skipped":[]}

## 2e passe
{"merged":0,"files":0,"categories":5,"evenements":8,"editions":15,"articles":33,"ateliers":9,"activites":4,"newsletters":12,"pages":7,"links":0,"skipped":[]}

Directus : 39 -> 33 articles, 17 à la une. Les slugs des keep perdent leur suffixe d’année (plus de collision), les redirections sont régénérées en conséquence.

## Redirections
`npm run redirects` : 79 redirections, 0 URL sans correspondance, code 0. Les six drop pointent vers :
- /posts/2026-10-lyricantrail-2026/ -> /blog/lyricantrail-2026-dimanche-11-octobre
- /news/2026-07-04-exposition-de-latelier-dart-de-larchant/ -> /blog/exposition-de-l-atelier-d-art-de-larchant
- /news/2026-06-27-pique-nique-dété-à-larchant/ -> /blog/pique-nique-d-ete-a-larchant
- /news/2026-05-16-lincroyable-sister-rosetta-tharpe--spectacle-musical/ -> /blog/l-incroyable-sister-rosetta-tharpe-spectacle-musical
- /posts/2026-02-foire-aux-plantes/ -> /blog/fap2026
- /news/2026-01-06-lhivernale-cest-parti-pour-les-inscriptions-copy/ -> /blog/lhivernale-est-de-retour

## Tests
- migration npm test : 0 échec ; site npm test : 14 ok ; studio npm test : 24 ok ; studio build : OK.
- Dev (13010) : /blog 200, « À la une » et « Toutes les actualités » présents, « Pique-nique d’été » et « L’incroyable Sister Rosetta » 2 fois chacun ; accueil contient le bloc « À la une » ; /posts/2026-10-lyricantrail-2026/ 301 vers /blog/lyricantrail-2026-dimanche-11-octobre (200) ; ancienne URL Hivernale copy 301 vers /blog/lhivernale-est-de-retour. Serveur arrêté.
