# Capitalia (Cap sur les capitales)

Quiz pour apprendre les capitales et les drapeaux du monde (184 pays), en application web installable (PWA) qui fonctionne hors ligne.

**Jouer :** https://amineboujrada-jpg.github.io/cap-sur-les-capitales/

## Fonctionnalités

- 3 modes : Pays → capitale, Capitale → pays, Drapeaux
- 3 niveaux : Facile, Moyen, Difficile (avec chrono)
- Par continent ou monde entier, parties de 10, 20 ou 30 questions
- Séries, records et statistiques (points faibles, réussite par continent)
- 4 langues : français, anglais, espagnol, arabe (détection automatique, anglais par défaut)
- Réglages : langue, thème clair/sombre, sons, vibrations, durée du chrono

## Installer sur Android

Ouvrir le lien dans Chrome, puis menu ⋮ → « Installer l'application ».

## Structure

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page de l'app |
| `app.js` | Logique du jeu, stats, réglages |
| `countries.js` | Pays, capitales et villes-pièges (français) |
| `names.js` | Noms en anglais, espagnol, arabe (généré depuis `names-src/`) |
| `i18n.js` | Textes de l'interface dans chaque langue |
| `flags.js` | Drapeaux en SVG |
| `sw.js`, `manifest.webmanifest` | Mode hors ligne et installation |

À chaque mise à jour, changer `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

Drapeaux : [Twemoji](https://github.com/twitter/twemoji), © Twitter, Inc. et contributeurs, licence CC-BY 4.0.
