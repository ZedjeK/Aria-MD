<p align="center">
  <img src="docs/logo.png" width="160" alt="Logo d'Aria MD : un A néon glitché avec un M↓ orange dans son creux">
</p>

<h1 align="center">Aria MD</h1>

<p align="center">
  Éditeur et lecteur Markdown simple : code et aperçu, plan cliquable, raccourcis de mise en forme, 100 % local
</p>

## Ce qu'il fait

Ce que l'appli permet, en clair, sans jargon.

## Avant de commencer

Windows 10 ou 11, 64 bits, avec WebView2 (déjà présent sur Windows 11 et sur un
Windows 10 à jour). Droits, ports et matériel nécessaires.

## Installation

1. Télécharge `Aria-MD-<version>.zip` depuis la page des versions.
2. Décompresse d'abord le zip en entier : clic droit, « Extraire tout ».
   Ne lance pas l'exe depuis l'aperçu du zip dans l'Explorateur : Windows n'en
   extrait que l'exe, sans les fichiers livrés à côté de lui.
3. Lance `Aria-MD.exe`.
4. L'appli propose « Installer » ou « Lancer sans installer ».
   - **Installer** range l'exe et ses fichiers dans
     `%USERPROFILE%\.Aria-MD\programme`, garde la version précédente, puis
     relance l'appli depuis là. La case « Créer un raccourci sur le Bureau »,
     décochée d'office, ajoute un raccourci sur ton Bureau seulement.
   - **Lancer sans installer** utilise l'exe là où il est.

   La case « Ne plus me proposer » coupe la question ; tu peux la réactiver dans
   les paramètres. `Aria-MD.exe --portable` lance l'appli sans rien
   proposer.

L'exe n'est pas signé : Windows peut afficher « Windows a protégé votre
ordinateur ». Clique sur « Informations complémentaires », puis sur « Exécuter
quand même ».

## Premiers pas

Le premier lancement, étape par étape.

## Au quotidien

Section optionnelle : supprime-la si elle reste vide.

## Où sont tes données

Tout est dans `%USERPROFILE%\.Aria-MD` :

- `reglages.json` : tes réglages ;
- `journal.json` : les 500 dernières opérations ;
- `sauvegardes\` : une copie datée avant chaque modification, et la version précédente de l'appli ;
- `secrets\` : ce que l'appli garde de secret, chiffré pour ton compte Windows (supprime la ligne si elle n'en garde pas) ;
- `cache\` : données de l'interface et fichiers de travail, recréés au besoin.
- `programme\` : l'appli installée.

Supprimer ce dossier efface tes réglages et tes données : l'appli repart à neuf.
Si tu as installé l'appli, il contient aussi `programme\` : le supprimer la
désinstalle. Quitte-la avant ; le raccourci du Bureau, s'il existe, se supprime
à la main.

## Mises à jour

Au lancement, l'appli regarde s'il existe une nouvelle version : une seule
requête, vers la page des versions de ce dépôt sur GitHub, sans rien qui
t'identifie. Une case des paramètres coupe cette recherche.

Quand une version plus récente existe, un bandeau « Mise à jour disponible »
s'affiche en haut de la fenêtre ; « Voir » ouvre le détail et les notes de
version. Rien ne se télécharge ni ne s'installe sans ton clic sur « Installer la
mise à jour ». L'appli télécharge alors le zip de la version, vérifie sa taille
et son empreinte, garde ta version actuelle dans `sauvegardes\versions\`, met
la nouvelle à sa place et se relance.

Pour revenir à la version précédente : quitte l'appli, puis copie les fichiers
de `sauvegardes\versions\<version>\` à la place de ceux de l'appli.

## Sécurité

- **Droits** : l'appli se lance sans droits administrateur.
- **Connexions sortantes** : `api.github.com` pour chercher une mise à jour (si
  la case est cochée), puis `github.com` et son serveur de fichiers pour la
  télécharger, sur ton clic. Ajoute ici celles propres à l'appli, destination
  par destination.
- **Secrets** : chiffrés avec la protection des données de Windows (DPAPI) pour
  ton compte, un fichier par secret dans `secrets\`. Une autre appli lancée sous
  ton compte Windows peut les déchiffrer : cette protection vise la copie du
  dossier sur un autre compte ou un autre PC. Dis ici ce que l'appli garde.

Pour signaler une faille : voir [SECURITY.md](SECURITY.md).

## Limites à connaître

Ce que l'appli ne fait pas.

Mises à jour : l'empreinte SHA-256 vérifie que le téléchargement est intact, pas
d'où il vient. La provenance repose sur le compte GitHub de l'auteur, sur les
releases immuables (une version publiée ne change plus) et sur l'attestation de
provenance que GitHub enregistre pour chaque zip (`gh attestation verify`, voir
les notes de version). Si le compte de l'auteur était compromis, une version
piégée pourrait quand même être proposée.

Projet personnel, sans audit de sécurité indépendant.

## Provenance des composants

Section à garder seulement si l'appli embarque un composant tiers. Le détail
est dans [LICENCES-TIERS.txt](LICENCES-TIERS.txt).

## Compiler soi-même

Il faut Rust, installé par [rustup](https://rustup.rs), et Node.js 24. Puis, dans
le dossier du dépôt :

```powershell
rustup toolchain install
.\tools\tester.ps1
.\build.ps1
```

`rustup toolchain install` prend la version de Rust écrite dans
`rust-toolchain.toml`.

`tester.ps1` lance les contrôles et les tests de l'interface et du Rust ;
`build.ps1` construit l'exe dans `.work\sortie\`. Comment vérifier que l'exe
obtenu est le bon.

## Structure

```text
coeur/        le contrat en Rust (données, réglages, journal, secrets, mises à jour), testable partout
appli/        l'exe Tauri : fenêtres, icône de notification, appels à Windows
  capabilities/   ce que chaque fenêtre a le droit d'appeler
interface/    l'interface en Svelte et TypeScript (pages, dialogues, composants)
tools/        contrôles, version, zip de release
docs/         logo, fiche du projet, notes de version
build.ps1     construction de l'exe
```

## Licence

MIT : voir [LICENSE](LICENSE). Les composants embarqués gardent leur propre
licence : voir [LICENCES-TIERS.txt](LICENCES-TIERS.txt).
