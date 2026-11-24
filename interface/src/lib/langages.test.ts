import { describe, expect, it } from 'vitest';
import { nomDuLangage } from './langages';

describe('noms de langages', () => {
  it('donne le nom en toutes lettres des abréviations courantes', () => {
    expect(nomDuLangage('js')).toBe('JavaScript');
    expect(nomDuLangage('ts')).toBe('TypeScript');
    expect(nomDuLangage('py')).toBe('Python');
    expect(nomDuLangage('ps1')).toBe('PowerShell');
    expect(nomDuLangage('rs')).toBe('Rust');
    expect(nomDuLangage('sh')).toBe('Shell');
    expect(nomDuLangage('cs')).toBe('C#');
    expect(nomDuLangage('cpp')).toBe('C++');
  });

  it('donne le même nom à l’abréviation et au nom complet', () => {
    expect(nomDuLangage('yml')).toBe(nomDuLangage('yaml'));
    expect(nomDuLangage('powershell')).toBe(nomDuLangage('ps1'));
    expect(nomDuLangage('javascript')).toBe(nomDuLangage('js'));
    expect(nomDuLangage('bash')).toBe(nomDuLangage('sh'));
  });

  it('ne tient compte ni de la casse ni des espaces autour', () => {
    expect(nomDuLangage('JS')).toBe('JavaScript');
    expect(nomDuLangage('PowerShell')).toBe('PowerShell');
    expect(nomDuLangage('  rs ')).toBe('Rust');
  });

  it('écrit « Code » quand le bloc n’a pas de langage', () => {
    expect(nomDuLangage('')).toBe('Code');
    expect(nomDuLangage('   ')).toBe('Code');
  });

  it('garde tel quel un langage qu’il ne connaît pas', () => {
    expect(nomDuLangage('brainfuck')).toBe('brainfuck');
    expect(nomDuLangage('MonLangage')).toBe('MonLangage');
  });

  it('ne prend pas un nom de l’objet JavaScript pour un langage connu', () => {
    expect(nomDuLangage('constructor')).toBe('constructor');
    expect(nomDuLangage('toString')).toBe('toString');
    expect(nomDuLangage('__proto__')).toBe('__proto__');
  });
});
