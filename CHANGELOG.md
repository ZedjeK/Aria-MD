# Journal des versions

Un bloc par version, le plus récent en haut. Les notes complètes d'une version
sont dans `docs/releases/`.

## Non publié

### Ajouté

- Première version d'Aria MD.
- Éditeur : ouvrir, modifier et enregistrer un fichier Markdown (UTF-8, fins de ligne conservées), avec copie datée de l'ancien contenu avant chaque remplacement et confirmation avant de fermer avec des modifications non enregistrées.
- Barre latérale de l'éditeur : onglet Raccourcis (titres, gras, italique, barré, surligné, souligné, code, listes, citation, bloc de code, lien, image, tableau, séparateur, avec leurs raccourcis clavier) et onglet Plan (les titres du document, cliquables).
- Aperçu Markdown et double vue : trois vues (Code, Aperçu, Double), aperçu mis à jour pendant la frappe, défilement lié, clic dans le Plan qui amène le code et l'aperçu sur le titre, barre latérale repliable. L'aperçu ne charge ni image ni adresse et n'affiche pas de HTML.
- Aperçu : chaque bloc de code porte une étiquette avec son langage (« Code » s'il n'en a pas) et un bouton Copier ; un clic sur un code en ligne le copie.
- Barre latérale : une liste de langages (JavaScript, Python, Rust, PowerShell, Bash, HTML…, ou « sans langage ») pour poser un bloc de code dans le langage choisi ; dans un bloc, un clic change son langage sans toucher au code.
- Aperçu : coloration du code par highlight.js (32 langages : JavaScript, TypeScript, Python, Rust, PowerShell, Bash, HTML, CSS, JSON, YAML, SQL, C#, C++, Java, Go, PHP…), aux couleurs du thème GitHub sombre. Un bloc sans langage est reconnu quand highlight.js en est assez sûr (étiquette « (détecté) »), sinon il reste sans couleur ; un code en ligne n'est coloré que s'il est très sûr.
