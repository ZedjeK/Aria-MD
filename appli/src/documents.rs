//! Les commandes de l'éditeur : ouvrir, enregistrer et fermer un document.
//!
//! Le chemin d'un fichier ne passe jamais par l'interface : ce module montre lui-même les boîtes « Ouvrir » et
//! « Enregistrer sous », garde le chemin choisi, et n'accepte de l'interface que le texte à enregistrer. Une interface
//! compromise ne peut donc ni lire ni écrire un autre fichier que ceux que l'utilisateur a choisis.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard, PoisonError};

use aria_coeur::documents::{self, FinsDeLigne};
use aria_coeur::{Dossier, journal};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::dialogue::{self, Boite};
use crate::{Etat, FENETRE};

/// Le nom proposé pour un document qui n'a pas encore de fichier.
const NOM_PAR_DEFAUT: &str = "Sans titre.md";

/// Le document ouvert : où il est, et comment il s'écrit.
struct Ouvert {
    chemin: PathBuf,
    fins_de_ligne: FinsDeLigne,
    bom: bool,
}

/// Ce que les commandes de l'éditeur partagent.
#[derive(Default)]
pub struct Courant {
    ouvert: Mutex<Option<Ouvert>>,
    /// L'interface a des modifications non enregistrées : la fermeture de la fenêtre est retenue.
    modifie: AtomicBool,
}

impl Courant {
    fn ouvert(&self) -> MutexGuard<'_, Option<Ouvert>> {
        self.ouvert.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

/// Un document ouvert, tel que l'interface l'affiche.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentOuvert {
    chemin: String,
    nom: String,
    contenu: String,
    fins_de_ligne: FinsDeLigne,
    bom: bool,
    melange: bool,
    octets: u64,
}

/// Ce qu'un enregistrement a fait, tel que l'interface l'affiche.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Enregistre {
    chemin: String,
    nom: String,
    octets: u64,
    /// L'ancien contenu a été copié dans `sauvegardes\` avant d'être remplacé.
    copie: bool,
}

/// Le nom d'un fichier, sans son dossier : c'est tout ce que le journal garde d'un document.
fn nom_de(chemin: &Path) -> String {
    chemin.file_name().map_or_else(
        || chemin.display().to_string(),
        |n| n.to_string_lossy().into_owned(),
    )
}

/// La boîte de Windows, sur un fil à part : elle peut rester ouverte longtemps.
async fn choisir(boite: Boite, nom: String, dossier: Option<PathBuf>) -> Result<Option<PathBuf>, String> {
    tauri::async_runtime::spawn_blocking(move || dialogue::choisir(boite, &nom, dossier.as_deref()))
        .await
        .map_err(|e| format!("boîte de dialogue interrompue : {e}"))?
        .map_err(|e| format!("boîte de dialogue impossible : {e}"))
}

/// Écrit le document sur un fil à part, copie de l'ancien contenu comprise, et le consigne au journal.
async fn ecrire(
    dossier: &Dossier,
    chemin: PathBuf,
    contenu: String,
    fins_de_ligne: FinsDeLigne,
    bom: bool,
) -> Result<Enregistre, String> {
    let dossier = dossier.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let bilan = documents::enregistrer(&dossier, &chemin, &contenu, fins_de_ligne, bom)
            .map_err(|e| e.to_string())?;
        let nom = nom_de(&chemin);
        let copie = bilan.copie.is_some();
        let precision = if copie { ", copie gardée" } else { "" };
        journal::consigner(
            &dossier,
            "document",
            &format!("enregistré : {nom} ({} octets{precision})", bilan.octets),
        );
        Ok::<_, String>(Enregistre {
            chemin: chemin.display().to_string(),
            nom,
            octets: bilan.octets,
            copie,
        })
    })
    .await
    .map_err(|e| format!("enregistrement interrompu : {e}"))?
}

/// Montre la boîte « Ouvrir » et ouvre le document choisi ; rien si l'utilisateur annule. L'interface a déjà
/// demandé quoi faire des modifications en cours.
#[tauri::command]
pub async fn ouvrir_document(
    etat: State<'_, Etat>,
    courant: State<'_, Courant>,
) -> Result<Option<DocumentOuvert>, String> {
    let Some(chemin) = choisir(Boite::Ouvrir, String::new(), None).await? else {
        return Ok(None);
    };
    let a_lire = chemin.clone();
    let lecture =
        tauri::async_runtime::spawn_blocking(move || documents::lire(&a_lire).map_err(|e| e.to_string()))
            .await
            .map_err(|e| format!("lecture interrompue : {e}"))??;
    let nom = nom_de(&chemin);
    journal::consigner(
        &etat.dossier,
        "document",
        &format!("ouvert : {nom} ({} octets)", lecture.octets),
    );
    *courant.ouvert() = Some(Ouvert {
        chemin: chemin.clone(),
        fins_de_ligne: lecture.fins_de_ligne,
        bom: lecture.bom,
    });
    courant.modifie.store(false, Ordering::SeqCst);
    Ok(Some(DocumentOuvert {
        chemin: chemin.display().to_string(),
        nom,
        contenu: lecture.contenu,
        fins_de_ligne: lecture.fins_de_ligne,
        bom: lecture.bom,
        melange: lecture.melange,
        octets: lecture.octets,
    }))
}

/// Enregistre le texte dans le document ouvert, après en avoir copié l'ancien contenu dans `sauvegardes\`.
#[tauri::command]
pub async fn enregistrer_document(
    etat: State<'_, Etat>,
    courant: State<'_, Courant>,
    contenu: String,
) -> Result<Enregistre, String> {
    let (chemin, fins_de_ligne, bom) = match courant.ouvert().as_ref() {
        Some(ouvert) => (ouvert.chemin.clone(), ouvert.fins_de_ligne, ouvert.bom),
        None => return Err("aucun document ouvert : utilise « Enregistrer sous »".to_owned()),
    };
    ecrire(&etat.dossier, chemin, contenu, fins_de_ligne, bom).await
}

/// Montre la boîte « Enregistrer sous », enregistre le texte à l'endroit choisi et en fait le document ouvert ; rien
/// si l'utilisateur annule.
#[tauri::command]
pub async fn enregistrer_document_sous(
    etat: State<'_, Etat>,
    courant: State<'_, Courant>,
    contenu: String,
) -> Result<Option<Enregistre>, String> {
    let (propose, dossier_initial, fins_de_ligne, bom) = {
        let ouvert = courant.ouvert();
        match ouvert.as_ref() {
            Some(o) => (
                nom_de(&o.chemin),
                o.chemin.parent().map(Path::to_path_buf),
                o.fins_de_ligne,
                o.bom,
            ),
            None => (NOM_PAR_DEFAUT.to_owned(), None, FinsDeLigne::Lf, false),
        }
    };
    let Some(chemin) = choisir(Boite::EnregistrerSous, propose, dossier_initial).await? else {
        return Ok(None);
    };
    let enregistre = ecrire(&etat.dossier, chemin.clone(), contenu, fins_de_ligne, bom).await?;
    *courant.ouvert() = Some(Ouvert {
        chemin,
        fins_de_ligne,
        bom,
    });
    Ok(Some(enregistre))
}

/// Repart d'un document vide, sans fichier. L'interface a déjà demandé quoi faire des modifications en cours.
#[tauri::command]
pub fn nouveau_document(courant: State<'_, Courant>) {
    *courant.ouvert() = None;
    courant.modifie.store(false, Ordering::SeqCst);
}

/// L'interface dit si le document a des modifications non enregistrées : c'est ce qui retient la fermeture.
#[tauri::command]
pub fn signaler_modification(courant: State<'_, Courant>, modifie: bool) {
    courant.modifie.store(modifie, Ordering::SeqCst);
}

/// Faut-il retenir la fermeture de la fenêtre ? Oui si le document a des modifications : l'interface propose alors
/// de les enregistrer (événement « fermeture-demandee »), puis quitte elle-même.
pub fn retenir_fermeture(app: &AppHandle) -> bool {
    let modifie = app
        .try_state::<Courant>()
        .is_some_and(|courant| courant.modifie.load(Ordering::SeqCst));
    // Si l'événement ne peut pas partir, personne ne répondrait : mieux vaut fermer que rester coincé.
    modifie && app.emit_to(FENETRE, "fermeture-demandee", ()).is_ok()
}
