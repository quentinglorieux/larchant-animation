<p align="center" style="padding-top:20px">
 <h1 align="center">Larchant Animation</h1>
 <p align="center">Un nouveau site pour Larchant Animation. Simple et efficace</p>
</p>
 
# Mise à jour
## Modification de la page d'accueil

### Carousel 
Pour modifier le carousel, editer le fichier data/carousel.yaml pour ajouter des images.
Les images doivent se trouver dans assets/images/

### Texte
La plupart du texte de la page d'accueil est modifiable dans le fichier de configuration : data/settings.yaml

## Activités/Ateliers 
Pour ajouter une activité/atelier il faut :
- ajouter l'activité dans le fichier config : data/settings.yaml
- créer un dossier dans content avec le nom de l'atelier (minuscule), puis un fichier index.md et une image. (le plus simple est de copier un dossier existant)
- Les logos des activités et des ateliers sont dans static/images/logos/. Il s'agit de fichier svg qui peuvent etre copié depuis https://icon-sets.iconify.design/.

## Menu
Le menu s'édite à partir du fichier de configuration config/menu.yaml

## Contenu des pages
Pour éditer les pages il faut ouvrir le fichier .md correspondant.
Les pages sont dans content puis ...
Il est important de bien remplir l'en-tete du fichier .md qui servira pour afficher correctement la page.

