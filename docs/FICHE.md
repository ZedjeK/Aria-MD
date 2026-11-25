# Fiche projet : Aria MD

Ce que cette appli a de propre. À relire avant toute modification, et à tenir à
jour quand l'appli change. « Prévu » marque ce qui est décidé mais pas encore dans le code (rien pour l'instant).

| | |
| --- | --- |
| Nom | Aria MD (dépôt et exe : `Aria-MD`) |
| Promesse | Éditeur et lecteur Markdown simple : code et aperçu, plan cliquable, raccourcis de mise en forme, 100 % local |
| Élément orange du logo | un M↓ (la marque Markdown), dessiné dans le creux du A |
| Fond animé | « Markdown qui se rend » : des lignes de Markdown fantômes (`# Titre`, `**gras**`, `==surligné==`) s'écrivent, se « rendent » (le `#` devient un titre, les astérisques disparaissent, le surligné passe à l'orange), restent, puis s'effacent ; aléatoires : le moment, la durée, le contenu de chaque ligne et ce qui se rend ; douze sortes de lignes (titres, gras, italique, barré, surligné, code, lien, citation, listes, case cochée) posées sur douze rangées ; par défaut 3 à 8 lignes en même temps ; réglages `fond.actif`, `fond.vitesse`, `fond.minimum`, `fond.maximum` dans `reglages.json` ; zone principale seulement, en pause fenêtre cachée, image fixe si Windows demande moins d'animations |
| Stack | Rust, Tauri 2, Svelte 5 (TypeScript) |
| Droits administrateur | non |
| Démarrage automatique | non |
| Installation par l'exe | oui : l'exe propose de se ranger dans le dossier `programme\` du dossier de données |
| Port local (interface web) | aucun |
| Données de l'utilisateur | `%USERPROFILE%\.Aria-MD` : réglages (`reglages.json`), journal des 500 dernières opérations (`journal.json`, avec le nom des fichiers ouverts ou enregistrés, sans leur chemin), sauvegardes (`sauvegardes\` : `documents\<empreinte>\`, un dossier par document avec une copie datée avant chaque enregistrement qui l'écrase, dix au plus ; `brouillon\`, le texte non enregistré du document en cours, un seul, effacé dès qu'il est enregistré ou abandonné ; et la version précédente de l'appli), application installée (`programme\`), données internes de l'interface (`cache\`) ; secrètes : aucune |
| Écritures hors du dossier de données | les fichiers `.md` que l'utilisateur enregistre, à l'endroit qu'il choisit, avec une copie préalable dans `sauvegardes\` ; raccourci sur le Bureau de l'utilisateur, si la case est cochée à l'installation ; ni démarrage automatique, ni association de fichier `.md`, ni écriture au registre en v0.1 |
| Connexions sortantes | `api.github.com`, `repos/ZedjeK/Aria-MD/releases/latest` : vérification des mises à jour, au lancement, désactivable ; sur clic de l'utilisateur : téléchargement du zip et de son empreinte depuis `github.com` et son hôte de téléchargement, SHA-256 vérifié avant installation. Aucune autre : l'aperçu ne charge ni image ni ressource distante |
| Composants tiers embarqués | Tauri 2, Svelte 5, highlight.js 11 (coloration du code de l'aperçu, BSD-3-Clause), polices Space Grotesk et IBM Plex Mono ; le moteur Markdown de l'aperçu est écrit pour l'appli (ni CodeMirror ni markdown-it) ; détail dans `LICENCES-TIERS.txt` |
| Réussite de la v0.1 | un `.md` de 2 000 lignes s'ouvre et se réenregistre sans différence d'octet hors des modifications de l'utilisateur ; un clic sur n'importe quel titre du plan amène l'éditeur et l'aperçu dessus |

Les lignes « à renseigner » se complètent avant la première ligne de code.
