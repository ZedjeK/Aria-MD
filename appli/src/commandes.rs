//! Les commandes que l'interface peut appeler. Chacune doit aussi figurer dans build.rs et dans
//! capabilities\principale.json, sinon l'interface ne peut pas l'appeler.
//!
//! Les erreurs remontent en texte français : l'interface les montre telles quelles. Jamais de secret dedans.

use aria_coeur::journal::Operation;
use aria_coeur::{Reglages, identite, journal};
use serde::Serialize;
use tauri::{AppHandle, State};

use crate::Etat;

/// Ce que l'interface affiche de l'appli.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Identite {
    nom: &'static str,
    version: &'static str,
    promesse: &'static str,
    en_fond: bool,
    installable: bool,
    dossier: String,
}

#[tauri::command]
pub fn identite(etat: State<'_, Etat>) -> Identite {
    Identite {
        nom: identite::NOM,
        version: identite::VERSION,
        promesse: identite::PROMESSE,
        en_fond: identite::EN_FOND,
        installable: identite::INSTALLABLE,
        dossier: etat.dossier.racine().display().to_string(),
    }
}

#[tauri::command]
pub fn lire_reglages(etat: State<'_, Etat>) -> Reglages {
    Reglages::charger(&etat.dossier)
}

/// Enregistre les réglages et renvoie ceux qui ont vraiment été écrits (bornes ramenées).
#[tauri::command]
pub fn enregistrer_reglages(etat: State<'_, Etat>, reglages: Reglages) -> Result<Reglages, String> {
    let reglages = reglages.assaini();
    reglages
        .enregistrer(&etat.dossier)
        .map_err(|e| format!("réglages non enregistrés : {e}"))?;
    journal::consigner(&etat.dossier, "réglages", "réglages enregistrés");
    Ok(reglages)
}

/// Les dernières opérations du journal, la plus récente d'abord.
#[tauri::command]
pub fn lire_journal(etat: State<'_, Etat>) -> Vec<Operation> {
    let mut operations = journal::lire(&etat.dossier);
    operations.reverse();
    operations
}

/// Quitte l'appli, icône de notification comprise.
#[tauri::command]
pub fn quitter(app: AppHandle) {
    app.exit(0);
}
