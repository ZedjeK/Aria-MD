**Aria MD** {VERSION} : Éditeur et lecteur Markdown simple : code et aperçu, plan cliquable, raccourcis de mise en forme, 100 % local

<!-- Modèle des notes de version. À chaque version : copie ce fichier vers docs/releases/v{VERSION}.md dans la PR
     de version, remplace {VERSION} et {REPO_URL}, remplis les sections, supprime ce commentaire. Le workflow de
     release publie ce fichier tel quel. -->

## Nouveautés

- Ce qui change pour toi, une ligne par nouveauté.

## À savoir

- Ruptures, migrations, changements de licence. Supprime la section si elle est vide.

## Installation

1. Télécharge `Aria-MD-{VERSION}.zip` ci-dessous.
2. Décompresse d'abord le zip en entier (clic droit, « Extraire tout »).
   Lancé depuis l'aperçu du zip dans l'Explorateur, l'exe démarre sans les fichiers livrés à côté de lui.
3. Lance `Aria-MD.exe`.
   Choisis « Installer » pour le ranger dans `%USERPROFILE%\.Aria-MD\programme`, ou « Lancer sans installer ».
4. L'exe n'est pas signé : si Windows affiche « Windows a protégé votre ordinateur », clique sur « Informations
   complémentaires », puis sur « Exécuter quand même ».

## Mise à jour depuis une version précédente

L'appli te propose elle-même la nouvelle version : elle remplace l'exe là où il est et garde la précédente.

Pour le faire à la main : ferme l'appli, décompresse le nouveau zip en entier, puis
lance son exe et choisis « Installer » : la version installée est remplacée, la précédente est gardée.

Tes réglages sont dans `%USERPROFILE%\.Aria-MD` et sont repris tels quels.

## Contenu

| Composant | Version | Source |
| --- | --- | --- |
| Aria MD | {VERSION} | [ce dépôt]({REPO_URL}) |

Le détail des composants embarqués est dans `LICENCES-TIERS.txt`, joint au zip.

## Comment vérifier ce que tu as téléchargé

L'empreinte du zip est dans `Aria-MD-{VERSION}.zip.sha256`. Dans PowerShell :

```powershell
(Get-FileHash .\Aria-MD-{VERSION}.zip -Algorithm SHA256).Hash
```

L'empreinte seule ne prouve pas d'où vient le fichier. Pour vérifier qu'il a bien été construit par ce dépôt :

```powershell
gh attestation verify .\Aria-MD-{VERSION}.zip --repo ZedjeK/Aria-MD
```
