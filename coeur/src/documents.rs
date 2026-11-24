//! Les documents Markdown de l'utilisateur : ouverts tels quels, enregistrés sans jamais les laisser à moitié écrits.
//!
//! Un document garde d'un enregistrement à l'autre son encodage (UTF-8, avec ou sans BOM) et ses fins de ligne (LF
//! ou CRLF) : un fichier propre se réécrit donc à l'octet près, hors de ce que l'utilisateur modifie. Un fichier qui
//! mélange LF et CRLF est signalé à l'ouverture, puis unifié à l'enregistrement. Un fichier qui n'est pas de l'UTF-8
//! est refusé : rien n'est converti en silence.
//!
//! Avant de remplacer un fichier existant, son ancien contenu est copié dans `sauvegardes\documents\<empreinte>\`
//! (un dossier par document, pour que deux fichiers du même nom ne se mélangent pas). Les dix copies les plus
//! récentes sont gardées : c'est la seule suppression de l'appli, et elle ne touche que ses propres copies datées.

use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};

use chrono::Local;
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::{Dossier, Erreur, sauvegardes};

/// La taille du plus gros document ouvert, en octets.
pub const TAILLE_MAX: u64 = 10 * 1024 * 1024;

/// Le nombre de copies gardées par document.
pub const COPIES_MAX: usize = 10;

/// L'octet d'ordre (BOM) d'un fichier UTF-8 qui en porte un.
const BOM: [u8; 3] = [0xEF, 0xBB, 0xBF];

/// Les fins de ligne d'un document.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FinsDeLigne {
    /// `\n`, comme sur Linux et dans Git.
    Lf,
    /// `\r\n`, comme sur Windows.
    Crlf,
}

/// Un document lu : son texte (fins de ligne ramenées à `\n`) et ce qu'il faut retenir pour le réécrire.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Lecture {
    /// Le texte, sans BOM, avec des `\n` seulement.
    pub contenu: String,
    /// Les fins de ligne du fichier (la majorité s'il en mélange).
    pub fins_de_ligne: FinsDeLigne,
    /// Le fichier commençait par un BOM.
    pub bom: bool,
    /// Le fichier mélange LF et CRLF, ou contient un `\r` isolé : il ne se réécrira pas à l'octet près.
    pub melange: bool,
    /// La taille du fichier lu, en octets.
    pub octets: u64,
}

/// Ce qu'un enregistrement a fait.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Enregistrement {
    /// La copie de l'ancien contenu, s'il y en avait un.
    pub copie: Option<PathBuf>,
    /// La taille du fichier écrit, en octets.
    pub octets: u64,
}

/// Lit un document.
///
/// # Errors
/// [`Erreur::Fichier`] si la lecture échoue, [`Erreur::DocumentTropGros`] au-delà de [`TAILLE_MAX`],
/// [`Erreur::DocumentPasUtf8`] si le fichier n'est pas de l'UTF-8.
pub fn lire(chemin: &Path) -> Result<Lecture, Erreur> {
    let taille = fs::metadata(chemin)
        .map_err(|e| Erreur::fichier("lecture de", chemin, e))?
        .len();
    if taille > TAILLE_MAX {
        return Err(Erreur::DocumentTropGros {
            chemin: chemin.to_path_buf(),
            taille,
            max: TAILLE_MAX,
        });
    }
    let octets = fs::read(chemin).map_err(|e| Erreur::fichier("lecture de", chemin, e))?;
    decoder(chemin, &octets, TAILLE_MAX)
}

/// Les octets d'un fichier en texte, sans rien perdre de ce qu'il faut pour le réécrire.
fn decoder(chemin: &Path, octets: &[u8], max: u64) -> Result<Lecture, Erreur> {
    let taille = u64::try_from(octets.len()).unwrap_or(u64::MAX);
    if taille > max {
        return Err(Erreur::DocumentTropGros {
            chemin: chemin.to_path_buf(),
            taille,
            max,
        });
    }
    let texte = std::str::from_utf8(octets).map_err(|_| Erreur::DocumentPasUtf8(chemin.to_path_buf()))?;
    let (sans_bom, bom) = match texte.strip_prefix('\u{feff}') {
        Some(reste) => (reste, true),
        None => (texte, false),
    };
    let (fins_de_ligne, melange) = analyser(sans_bom);
    Ok(Lecture {
        contenu: sans_bom.replace("\r\n", "\n"),
        fins_de_ligne,
        bom,
        melange,
        octets: taille,
    })
}

/// Les fins de ligne d'un texte (la majorité ; LF s'il n'a aucun saut de ligne) et s'il les mélange.
fn analyser(texte: &str) -> (FinsDeLigne, bool) {
    let (mut crlf, mut lf, mut cr_isole) = (0usize, 0usize, 0usize);
    let mut precedent = 0u8;
    for &octet in texte.as_bytes() {
        if precedent == b'\r' && octet != b'\n' {
            cr_isole += 1;
        }
        if octet == b'\n' {
            if precedent == b'\r' {
                crlf += 1;
            } else {
                lf += 1;
            }
        }
        precedent = octet;
    }
    if precedent == b'\r' {
        cr_isole += 1;
    }
    let fins = if crlf > lf {
        FinsDeLigne::Crlf
    } else {
        FinsDeLigne::Lf
    };
    (fins, (crlf > 0 && lf > 0) || cr_isole > 0)
}

/// Le texte de l'interface (des `\n`) en octets de fichier : fins de ligne et BOM du document d'origine.
#[must_use]
pub fn encoder(contenu: &str, fins_de_ligne: FinsDeLigne, bom: bool) -> Vec<u8> {
    let uniforme = contenu.replace("\r\n", "\n");
    let corps = match fins_de_ligne {
        FinsDeLigne::Lf => uniforme,
        FinsDeLigne::Crlf => uniforme.replace('\n', "\r\n"),
    };
    let mut octets = Vec::with_capacity(corps.len() + BOM.len());
    if bom {
        octets.extend_from_slice(&BOM);
    }
    octets.extend_from_slice(corps.as_bytes());
    octets
}

/// Le dossier des copies d'un document : un par fichier, nommé d'après son chemin (sans tenir compte de la casse,
/// comme Windows).
#[must_use]
pub fn dossier_des_copies(dossier: &Dossier, document: &Path) -> PathBuf {
    let cle = document.to_string_lossy().to_lowercase();
    let empreinte: String = Sha256::digest(cle.as_bytes())
        .iter()
        .take(6)
        .map(|o| format!("{o:02x}"))
        .collect();
    dossier.sauvegardes().join("documents").join(empreinte)
}

/// Enregistre un document : copie de l'ancien contenu s'il existe, puis écriture à côté et remplacement.
///
/// # Errors
/// Une erreur si la copie échoue (le fichier n'est alors pas touché) ou si l'écriture ou le remplacement échoue
/// (l'ancien contenu reste en place).
pub fn enregistrer(
    dossier: &Dossier,
    chemin: &Path,
    contenu: &str,
    fins_de_ligne: FinsDeLigne,
    bom: bool,
) -> Result<Enregistrement, Erreur> {
    let octets = encoder(contenu, fins_de_ligne, bom);
    let dossier_copies = dossier_des_copies(dossier, chemin);
    let copie = if chemin.is_file() {
        Some(sauvegardes::sauvegarder_a(&dossier_copies, chemin, Local::now())?)
    } else {
        None
    };
    ecrire_sans_risque(chemin, &octets)?;
    if copie.is_some() {
        elaguer(&dossier_copies, COPIES_MAX);
    }
    Ok(Enregistrement {
        copie,
        octets: u64::try_from(octets.len()).unwrap_or(u64::MAX),
    })
}

/// Écrit à côté, puis remplace : le fichier n'est jamais à moitié écrit. Un provisoire déjà présent n'est jamais
/// écrasé (ce n'est pas le nôtre) : l'enregistrement échoue et le dit.
fn ecrire_sans_risque(chemin: &Path, octets: &[u8]) -> Result<(), Erreur> {
    let nom = chemin
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let provisoire = chemin.with_file_name(format!(".{nom}.aria-md.tmp"));
    let ecriture = (|| {
        let mut fichier = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&provisoire)?;
        fichier.write_all(octets)?;
        fichier.sync_all()
    })();
    if let Err(e) = ecriture {
        if e.kind() != ErrorKind::AlreadyExists {
            // Le provisoire qu'on vient de créer s'efface ; s'il reste, le prochain enregistrement le dira.
            let _ = fs::remove_file(&provisoire);
        }
        return Err(Erreur::fichier("écriture de", provisoire, e));
    }
    // Sous Windows, rename remplace la cible existante (MoveFileEx avec MOVEFILE_REPLACE_EXISTING).
    if let Err(e) = fs::rename(&provisoire, chemin) {
        let _ = fs::remove_file(&provisoire);
        return Err(Erreur::fichier("remplacement de", chemin, e));
    }
    Ok(())
}

/// Ne garde que les `garder` copies datées les plus récentes d'un dossier de copies ; supprime les autres. Ne touche
/// qu'aux fichiers dont le nom commence par une date (`2026-11-21_19-05-00_`). Un échec n'est pas une erreur
/// d'enregistrement : la copie qui reste sera reprise au prochain enregistrement.
pub fn elaguer(dossier_copies: &Path, garder: usize) {
    let Ok(entrees) = fs::read_dir(dossier_copies) else {
        return;
    };
    let mut copies: Vec<PathBuf> = entrees
        .filter_map(Result::ok)
        .filter(|e| e.file_type().is_ok_and(|t| t.is_file()))
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .is_some_and(|n| est_copie_datee(&n.to_string_lossy()))
        })
        .collect();
    // Les noms commencent par la date : l'ordre des noms est l'ordre du temps.
    copies.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
    let en_trop = copies.len().saturating_sub(garder);
    for ancienne in copies.into_iter().take(en_trop) {
        let _ = fs::remove_file(ancienne);
    }
}

/// Le nom commence-t-il par `AAAA-MM-JJ_HH-MM-SS_`, comme les copies de [`sauvegardes`] ?
fn est_copie_datee(nom: &str) -> bool {
    const MODELE: &[u8; 20] = b"dddd-dd-dd_dd-dd-dd_";
    let octets = nom.as_bytes();
    octets.len() > MODELE.len()
        && octets
            .iter()
            .zip(MODELE)
            .all(|(o, m)| if *m == b'd' { o.is_ascii_digit() } else { o == m })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn donnees(temp: &Path) -> Dossier {
        Dossier::a(temp.join("donnees"))
    }

    #[test]
    fn un_fichier_propre_se_reecrit_a_l_octet_pres() {
        let cas: [&[u8]; 7] = [
            b"# Titre\n\ntexte\n",
            b"a\r\nb\r\n",
            b"\xEF\xBB\xBFa\nb\n",
            b"\xEF\xBB\xBFa\r\nb",
            b"sans fin de ligne",
            b"",
            "caf\u{e9} \u{2014} \u{1f600}\n".as_bytes(),
        ];
        for (n, octets) in cas.iter().enumerate() {
            let temp = tempfile::tempdir().unwrap();
            let chemin = temp.path().join(format!("doc{n}.md"));
            fs::write(&chemin, octets).unwrap();
            let lecture = lire(&chemin).unwrap();
            assert!(!lecture.melange, "cas {n}");
            enregistrer(
                &donnees(temp.path()),
                &chemin,
                &lecture.contenu,
                lecture.fins_de_ligne,
                lecture.bom,
            )
            .unwrap();
            assert_eq!(fs::read(&chemin).unwrap(), *octets, "cas {n}");
        }
    }

    #[test]
    fn la_lecture_ramene_les_fins_de_ligne_a_des_sauts_simples() {
        let lecture = decoder(Path::new("a.md"), b"a\r\nb\r\n", TAILLE_MAX).unwrap();
        assert_eq!(lecture.contenu, "a\nb\n");
        assert_eq!(lecture.fins_de_ligne, FinsDeLigne::Crlf);
        assert_eq!(lecture.octets, 6);
    }

    #[test]
    fn le_bom_est_retenu_puis_remis() {
        let lecture = decoder(Path::new("a.md"), b"\xEF\xBB\xBFtexte", TAILLE_MAX).unwrap();
        assert!(lecture.bom);
        assert_eq!(lecture.contenu, "texte");
        assert!(encoder(&lecture.contenu, lecture.fins_de_ligne, true).starts_with(&BOM));
        assert!(!encoder("texte", FinsDeLigne::Lf, false).starts_with(&BOM));
    }

    #[test]
    fn des_fins_de_ligne_melangees_sont_signalees_et_la_majorite_gagne() {
        let lecture = decoder(Path::new("a.md"), b"a\r\nb\nc\r\n", TAILLE_MAX).unwrap();
        assert!(lecture.melange);
        assert_eq!(lecture.fins_de_ligne, FinsDeLigne::Crlf);
        let lecture = decoder(Path::new("a.md"), b"a\nb\r\nc\n", TAILLE_MAX).unwrap();
        assert!(lecture.melange);
        assert_eq!(lecture.fins_de_ligne, FinsDeLigne::Lf);
    }

    #[test]
    fn un_cr_isole_est_signale() {
        assert!(decoder(Path::new("a.md"), b"a\rb\n", TAILLE_MAX).unwrap().melange);
        assert!(decoder(Path::new("a.md"), b"a\r", TAILLE_MAX).unwrap().melange);
    }

    #[test]
    fn un_texte_sans_saut_de_ligne_est_en_lf_et_sans_melange() {
        let lecture = decoder(Path::new("a.md"), b"rien", TAILLE_MAX).unwrap();
        assert_eq!(lecture.fins_de_ligne, FinsDeLigne::Lf);
        assert!(!lecture.melange);
    }

    #[test]
    fn un_texte_qui_n_est_pas_de_l_utf8_est_refuse() {
        // Latin-1 (« é » = E9) et UTF-16 (BOM FF FE) : refusés, jamais convertis en silence.
        for octets in [&b"caf\xE9"[..], &b"\xFF\xFEa\x00"[..]] {
            let erreur = decoder(Path::new("a.md"), octets, TAILLE_MAX).unwrap_err();
            assert!(matches!(erreur, Erreur::DocumentPasUtf8(_)), "{erreur}");
        }
    }

    #[test]
    fn un_fichier_trop_gros_est_refuse() {
        let erreur = decoder(Path::new("a.md"), &[b'a'; 11], 10).unwrap_err();
        assert!(
            matches!(
                erreur,
                Erreur::DocumentTropGros {
                    taille: 11,
                    max: 10,
                    ..
                }
            ),
            "{erreur}"
        );
        assert!(decoder(Path::new("a.md"), &[b'a'; 10], 10).is_ok());
    }

    #[test]
    fn un_fichier_absent_est_une_erreur_de_fichier() {
        let temp = tempfile::tempdir().unwrap();
        let erreur = lire(&temp.path().join("absent.md")).unwrap_err();
        assert!(matches!(erreur, Erreur::Fichier { .. }), "{erreur}");
    }

    #[test]
    fn l_encodage_ne_double_pas_un_retour_chariot() {
        assert_eq!(encoder("a\r\nb", FinsDeLigne::Crlf, false), b"a\r\nb");
        assert_eq!(encoder("a\nb", FinsDeLigne::Crlf, false), b"a\r\nb");
        assert_eq!(encoder("a\r\nb", FinsDeLigne::Lf, false), b"a\nb");
    }

    #[test]
    fn enregistrer_garde_l_ancien_contenu_avant_de_remplacer() {
        let temp = tempfile::tempdir().unwrap();
        let dossier = donnees(temp.path());
        let chemin = temp.path().join("notes.md");
        fs::write(&chemin, "ancien").unwrap();
        let bilan = enregistrer(&dossier, &chemin, "nouveau", FinsDeLigne::Lf, false).unwrap();
        assert_eq!(fs::read_to_string(&chemin).unwrap(), "nouveau");
        let copie = bilan.copie.unwrap();
        assert_eq!(fs::read_to_string(&copie).unwrap(), "ancien");
        assert!(copie.starts_with(dossier_des_copies(&dossier, &chemin)));
        assert_eq!(bilan.octets, 7);
        assert!(!temp.path().join(".notes.md.aria-md.tmp").exists());
    }

    #[test]
    fn un_nouveau_fichier_n_a_pas_de_copie() {
        let temp = tempfile::tempdir().unwrap();
        let chemin = temp.path().join("neuf.md");
        let bilan = enregistrer(&donnees(temp.path()), &chemin, "texte", FinsDeLigne::Lf, false).unwrap();
        assert!(bilan.copie.is_none());
        assert_eq!(fs::read_to_string(&chemin).unwrap(), "texte");
    }

    #[test]
    fn un_echec_d_ecriture_laisse_l_original_et_le_provisoire_d_autrui_intacts() {
        let temp = tempfile::tempdir().unwrap();
        let chemin = temp.path().join("a.md");
        let provisoire = temp.path().join(".a.md.aria-md.tmp");
        fs::write(&chemin, "ancien").unwrap();
        fs::write(&provisoire, "à quelqu'un d'autre").unwrap();
        let erreur =
            enregistrer(&donnees(temp.path()), &chemin, "nouveau", FinsDeLigne::Lf, false).unwrap_err();
        assert!(matches!(erreur, Erreur::Fichier { .. }), "{erreur}");
        assert_eq!(fs::read_to_string(&chemin).unwrap(), "ancien");
        assert_eq!(fs::read_to_string(&provisoire).unwrap(), "à quelqu'un d'autre");
    }

    #[test]
    fn deux_fichiers_du_meme_nom_ont_chacun_leur_dossier_de_copies() {
        let dossier = Dossier::a("/x/.Aria-Essai");
        let a = dossier_des_copies(&dossier, Path::new("/a/README.md"));
        let b = dossier_des_copies(&dossier, Path::new("/b/README.md"));
        assert_ne!(a, b);
        assert_eq!(
            dossier_des_copies(&dossier, Path::new("C:\\Docs\\Notes.md")),
            dossier_des_copies(&dossier, Path::new("c:\\docs\\notes.MD"))
        );
        assert!(a.starts_with(dossier.sauvegardes()));
    }

    #[test]
    fn elaguer_garde_les_plus_recentes_et_ne_touche_qu_aux_copies_datees() {
        let temp = tempfile::tempdir().unwrap();
        for jour in 1..=12 {
            fs::write(temp.path().join(format!("2026-11-{jour:02}_10-00-00_a.md")), "x").unwrap();
        }
        fs::write(temp.path().join("notes.txt"), "à moi").unwrap();
        fs::create_dir(temp.path().join("2026-11-00_10-00-00_dossier")).unwrap();
        elaguer(temp.path(), 10);
        for jour in 1..=2 {
            assert!(
                !temp
                    .path()
                    .join(format!("2026-11-{jour:02}_10-00-00_a.md"))
                    .exists()
            );
        }
        for jour in 3..=12 {
            assert!(
                temp.path()
                    .join(format!("2026-11-{jour:02}_10-00-00_a.md"))
                    .exists()
            );
        }
        assert!(temp.path().join("notes.txt").exists());
        assert!(temp.path().join("2026-11-00_10-00-00_dossier").is_dir());
    }

    #[test]
    fn elaguer_sans_dossier_ne_fait_rien() {
        let temp = tempfile::tempdir().unwrap();
        elaguer(&temp.path().join("absent"), 10);
    }

    #[test]
    fn seuls_les_noms_dates_sont_des_copies() {
        assert!(est_copie_datee("2026-11-21_19-05-00_a.md"));
        assert!(!est_copie_datee("2026-11-21_19-05-00_"));
        assert!(!est_copie_datee("notes.txt"));
        assert!(!est_copie_datee("2026-11-21 19-05-00_a.md"));
    }
}
