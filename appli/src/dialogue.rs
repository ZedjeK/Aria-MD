//! Les boîtes « Ouvrir » et « Enregistrer sous » de Windows. Hors de Windows (tests, outils), elles n'existent pas.

use std::io;
use std::path::{Path, PathBuf};

/// Quelle boîte montrer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Boite {
    Ouvrir,
    EnregistrerSous,
}

/// Les types de fichiers proposés : un nom puis son motif, deux à deux, et un zéro de plus pour finir la liste.
#[cfg(windows)]
const FILTRE: &str =
    "Markdown (*.md, *.markdown)\0*.md;*.markdown\0Texte (*.txt)\0*.txt\0Tous les fichiers (*.*)\0*.*\0\0";

/// Montre la boîte et renvoie le chemin choisi, ou rien si l'utilisateur annule. `nom_propose` et `dossier_initial`
/// préremplissent la boîte.
///
/// # Errors
/// L'erreur de Windows si la boîte n'a pas pu s'ouvrir.
#[cfg(windows)]
#[allow(unsafe_code)]
pub fn choisir(boite: Boite, nom_propose: &str, dossier_initial: Option<&Path>) -> io::Result<Option<PathBuf>> {
    use std::ffi::OsString;
    use std::os::windows::ffi::{OsStrExt, OsStringExt};

    use windows::Win32::UI::Controls::Dialogs::{
        CommDlgExtendedError, GetOpenFileNameW, GetSaveFileNameW, OFN_EXPLORER, OFN_FILEMUSTEXIST,
        OFN_HIDEREADONLY, OFN_NOCHANGEDIR, OFN_OVERWRITEPROMPT, OFN_PATHMUSTEXIST, OPENFILENAMEW,
    };
    use windows::core::{PCWSTR, PWSTR};

    let filtre: Vec<u16> = FILTRE.encode_utf16().collect();
    let extension: Vec<u16> = "md\0".encode_utf16().collect();
    let titre: Vec<u16> = match boite {
        Boite::Ouvrir => "Ouvrir un document\0",
        Boite::EnregistrerSous => "Enregistrer sous\0",
    }
    .encode_utf16()
    .collect();
    let dossier: Vec<u16> = dossier_initial
        .map(|d| d.as_os_str().encode_wide().chain(Some(0)).collect())
        .unwrap_or_default();
    // Le tampon reçoit le chemin choisi ; il part avec le nom proposé.
    let mut tampon = vec![0u16; 32_768];
    for (case, caractere) in tampon.iter_mut().zip(nom_propose.encode_utf16().take(259)) {
        *case = caractere;
    }
    let drapeaux = match boite {
        Boite::Ouvrir => OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_HIDEREADONLY | OFN_NOCHANGEDIR,
        Boite::EnregistrerSous => {
            OFN_EXPLORER | OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST | OFN_HIDEREADONLY | OFN_NOCHANGEDIR
        }
    };

    // SAFETY : OPENFILENAMEW n'a que des entiers, des pointeurs et des fonctions facultatives : tout à zéro est un
    // état valide, que les champs ci-dessous complètent.
    let mut demande: OPENFILENAMEW = unsafe { std::mem::zeroed() };
    demande.lStructSize = u32::try_from(size_of::<OPENFILENAMEW>()).unwrap_or_default();
    demande.lpstrFilter = PCWSTR(filtre.as_ptr());
    demande.nFilterIndex = 1;
    demande.lpstrFile = PWSTR(tampon.as_mut_ptr());
    demande.nMaxFile = u32::try_from(tampon.len()).unwrap_or_default();
    if !dossier.is_empty() {
        demande.lpstrInitialDir = PCWSTR(dossier.as_ptr());
    }
    demande.lpstrTitle = PCWSTR(titre.as_ptr());
    demande.lpstrDefExt = PCWSTR(extension.as_ptr());
    demande.Flags = drapeaux;

    // SAFETY : `demande` est complète ; le filtre, le titre, l'extension, le dossier et le tampon (terminés par un
    // zéro, le tampon de 32 768 caractères) vivent jusqu'à la fin de la fonction, après l'appel ; la boîte ne garde
    // aucun pointeur une fois fermée.
    let accepte = unsafe {
        match boite {
            Boite::Ouvrir => GetOpenFileNameW(&raw mut demande),
            Boite::EnregistrerSous => GetSaveFileNameW(&raw mut demande),
        }
    }
    .as_bool();
    if !accepte {
        // SAFETY : fonction sans paramètre, qui lit le code d'erreur de la dernière boîte de ce fil. Zéro : annulé.
        let code = unsafe { CommDlgExtendedError() };
        if code.0 == 0 {
            return Ok(None);
        }
        return Err(io::Error::other(format!("la boîte de dialogue a échoué (code {})", code.0)));
    }
    let fin = tampon.iter().position(|&c| c == 0).unwrap_or(tampon.len());
    let texte = tampon.get(..fin).unwrap_or_default();
    Ok(Some(PathBuf::from(OsString::from_wide(texte))))
}

/// Hors de Windows (tests, outils), il n'y a pas de boîte.
///
/// # Errors
/// Toujours : Windows seulement.
#[cfg(not(windows))]
pub fn choisir(_boite: Boite, _nom_propose: &str, _dossier_initial: Option<&Path>) -> io::Result<Option<PathBuf>> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "boîtes de dialogue : Windows seulement",
    ))
}
