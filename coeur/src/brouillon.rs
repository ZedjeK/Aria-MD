//! Le brouillon : une copie de sûreté du document en cours, écrite pendant qu'on tape, pour retrouver son texte si l'appli
//! s'arrête avant l'enregistrement (plantage, coupure de courant, fermeture forcée).
//!
//! Il n'y en a qu'un, dans `sauvegardes\brouillon\brouillon.json`, et il se remplace à chaque écriture. Il n'est jamais le
//! document : l'enregistrement ne touche pas au fichier de l'utilisateur tant qu'il n'a pas choisi « Enregistrer ». Il est
//! effacé dès que le document est enregistré, abandonné ou remplacé. Écrit à côté puis remplacé comme le reste : un brouillon
//! n'est jamais à moitié écrit.

use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use chrono::Local;
use serde::{Deserialize, Serialize};

use crate::documents::TAILLE_MAX;
use crate::donnees::ecrire_entier;
use crate::{Dossier, Erreur};

/// Un brouillon : le texte, et d'où il vient.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Brouillon {
    /// Le texte du document, avec des `\n` seulement.
    pub contenu: String,
    /// Le nom du fichier dont il vient ; rien pour un document qui n'en avait pas encore.
    pub nom: Option<String>,
    /// Quand il a été écrit, `AAAA-MM-JJ HH:MM:SS`, à l'heure de l'utilisateur.
    pub date: String,
}

/// `sauvegardes\brouillon\brouillon.json`.
#[must_use]
pub fn fichier(dossier: &Dossier) -> PathBuf {
    dossier.sauvegardes().join("brouillon").join("brouillon.json")
}

/// Écrit le brouillon, à la place du précédent.
///
/// # Errors
/// [`Erreur::BrouillonTropGros`] au-delà de [`TAILLE_MAX`] (le précédent reste), [`Erreur::Fichier`] si l'écriture échoue.
pub fn ecrire(dossier: &Dossier, contenu: &str, nom: Option<&str>) -> Result<(), Erreur> {
    let taille = u64::try_from(contenu.len()).unwrap_or(u64::MAX);
    if taille > TAILLE_MAX {
        return Err(Erreur::BrouillonTropGros {
            taille,
            max: TAILLE_MAX,
        });
    }
    let brouillon = Brouillon {
        contenu: contenu.to_owned(),
        nom: nom.map(str::to_owned),
        date: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    };
    let chemin = fichier(dossier);
    let octets = serde_json::to_vec(&brouillon)
        .map_err(|e| Erreur::fichier("écriture de", &chemin, std::io::Error::other(e)))?;
    ecrire_entier(&chemin, &octets)
}

/// Lit le brouillon, s'il y en a un. Un fichier illisible (corrompu, ou trop gros pour avoir été écrit par l'appli) vaut
/// « pas de brouillon » : il sera remplacé à la prochaine écriture, et ne doit pas empêcher l'appli de démarrer.
///
/// # Errors
/// [`Erreur::Fichier`] si le fichier existe mais ne peut pas être lu.
pub fn lire(dossier: &Dossier) -> Result<Option<Brouillon>, Erreur> {
    let chemin = fichier(dossier);
    let taille = match fs::metadata(&chemin) {
        Ok(infos) => infos.len(),
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(Erreur::fichier("lecture de", chemin, e)),
    };
    // Le JSON fait au plus six fois le texte (un caractère de contrôle s'écrit sur six caractères) : au-delà, ce n'est pas le nôtre.
    if taille > TAILLE_MAX.saturating_mul(6) {
        return Ok(None);
    }
    let octets = fs::read(&chemin).map_err(|e| Erreur::fichier("lecture de", &chemin, e))?;
    Ok(serde_json::from_slice(&octets).ok())
}

/// Efface le brouillon ; sans brouillon, ne fait rien.
///
/// # Errors
/// [`Erreur::Fichier`] si le fichier existe et ne peut pas être supprimé.
pub fn effacer(dossier: &Dossier) -> Result<(), Erreur> {
    let chemin = fichier(dossier);
    match fs::remove_file(&chemin) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
        Err(e) => Err(Erreur::fichier("suppression de", chemin, e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn donnees(temp: &std::path::Path) -> Dossier {
        Dossier::a(temp.join("donnees"))
    }

    #[test]
    fn sans_brouillon_il_n_y_a_rien_a_lire() {
        let temp = tempfile::tempdir().unwrap();
        assert_eq!(lire(&donnees(temp.path())).unwrap(), None);
    }

    #[test]
    fn un_brouillon_ecrit_se_relit_tel_quel() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        ecrire(
            &dossier,
            "# Titre\n\n« é » \"guillemets\" \\ \t fin\n",
            Some("notes.md"),
        )
        .unwrap();
        let lu = lire(&dossier).unwrap().unwrap();
        assert_eq!(lu.contenu, "# Titre\n\n« é » \"guillemets\" \\ \t fin\n");
        assert_eq!(lu.nom.as_deref(), Some("notes.md"));
        assert_eq!(lu.date.len(), "2026-11-25 10:00:00".len());
    }

    #[test]
    fn un_document_sans_fichier_n_a_pas_de_nom() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        ecrire(&dossier, "texte", None).unwrap();
        assert_eq!(lire(&dossier).unwrap().unwrap().nom, None);
    }

    #[test]
    fn un_nouveau_brouillon_remplace_le_precedent() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        ecrire(&dossier, "un", Some("a.md")).unwrap();
        ecrire(&dossier, "deux", Some("b.md")).unwrap();
        let lu = lire(&dossier).unwrap().unwrap();
        assert_eq!((lu.contenu.as_str(), lu.nom.as_deref()), ("deux", Some("b.md")));
        // Rien d'autre que le brouillon dans son dossier : pas de provisoire oublié.
        let fichiers = fs::read_dir(fichier(&dossier).parent().unwrap()).unwrap().count();
        assert_eq!(fichiers, 1);
    }

    #[test]
    fn effacer_supprime_le_brouillon_et_peut_se_repeter() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        effacer(&dossier).unwrap();
        ecrire(&dossier, "texte", None).unwrap();
        effacer(&dossier).unwrap();
        assert_eq!(lire(&dossier).unwrap(), None);
        effacer(&dossier).unwrap();
    }

    #[test]
    fn un_brouillon_corrompu_vaut_pas_de_brouillon_et_se_remplace() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        ecrire(&dossier, "texte", None).unwrap();
        fs::write(fichier(&dossier), "{ pas du json").unwrap();
        assert_eq!(lire(&dossier).unwrap(), None);
        ecrire(&dossier, "neuf", None).unwrap();
        assert_eq!(lire(&dossier).unwrap().unwrap().contenu, "neuf");
    }

    #[test]
    fn un_texte_trop_gros_n_est_pas_garde_et_laisse_le_precedent() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        ecrire(&dossier, "ancien", None).unwrap();
        let enorme = "a".repeat(usize::try_from(TAILLE_MAX).unwrap() + 1);
        assert!(matches!(
            ecrire(&dossier, &enorme, None),
            Err(Erreur::BrouillonTropGros { .. })
        ));
        assert_eq!(lire(&dossier).unwrap().unwrap().contenu, "ancien");
    }

    #[test]
    fn un_texte_vide_est_un_brouillon_valide() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        ecrire(&dossier, "", Some("vide.md")).unwrap();
        assert_eq!(lire(&dossier).unwrap().unwrap().contenu, "");
    }
}
