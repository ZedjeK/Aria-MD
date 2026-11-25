import { describe, expect, it } from 'vitest';
import { analyserSortie, colorer, etiquetteDuBloc, texteDesNoeuds, type NoeudCode } from './coloration';

/** Les classes de highlight.js portées par le texte donné, où qu'il soit dans l'arbre. */
function classesDe(noeuds: NoeudCode[], texte: string): string[] {
  const trouvees: string[] = [];
  const parcourir = (liste: NoeudCode[], classes: string[]) => {
    for (const noeud of liste) {
      if ('texte' in noeud) {
        if (noeud.texte === texte) trouvees.push(...classes);
      } else {
        parcourir(noeud.enfants, [...classes, noeud.classe]);
      }
    }
  };
  parcourir(noeuds, []);
  return trouvees;
}

describe('lecture de la sortie de highlight.js', () => {
  it('range les groupes imbriqués', () => {
    expect(analyserSortie('<span class="hljs-string">"a <span class="hljs-subst">${b}</span>"</span>')).toEqual([
      {
        classe: 'hljs-string',
        enfants: [{ texte: '"a ' }, { classe: 'hljs-subst', enfants: [{ texte: '${b}' }] }, { texte: '"' }],
      },
    ]);
  });

  it('rend le texte tel qu’il était avant l’échappement', () => {
    expect(texteDesNoeuds(analyserSortie('a &lt; b &amp;&amp; c &gt; d &quot;e&quot; &#x27;f&#x27;'))).toBe(
      'a < b && c > d "e" \'f\'',
    );
  });

  it('ne décode pas deux fois : « &amp;lt; » reste « &lt; »', () => {
    expect(texteDesNoeuds(analyserSortie('&amp;lt;'))).toBe('&lt;');
  });

  it('supporte une fermeture de trop sans rien perdre', () => {
    expect(texteDesNoeuds(analyserSortie('a</span>b'))).toBe('ab');
  });
});

describe('coloration d’un bloc dont le langage est écrit', () => {
  it('colore les mots-clés et les chaînes de JavaScript', () => {
    const coloration = colorer('const a = "x";', 'js');
    expect(coloration).not.toBeNull();
    expect(coloration?.detecte).toBe(false);
    expect(classesDe(coloration?.noeuds ?? [], 'const')).toContain('hljs-keyword');
    expect(classesDe(coloration?.noeuds ?? [], '"x"')).toContain('hljs-string');
  });

  it('reconnaît les abréviations courantes et ignore la casse', () => {
    for (const langage of ['ts', 'py', 'rs', 'ps1', 'sh', 'yml', 'html', 'toml', 'cs', 'c++', 'md', 'JS', ' Python ']) {
      expect(colorer('x', langage), langage).not.toBeNull();
    }
  });

  it('colore le Svelte et le Vue comme du HTML', () => {
    expect(classesDe(colorer('<p>a</p>', 'svelte')?.noeuds ?? [], 'p')).toContain('hljs-name');
    expect(colorer('<p>a</p>', 'vue')).not.toBeNull();
  });

  it('ne perd ni ne change aucun caractère', () => {
    const exemples: [string, string][] = [
      ['js', 'if (a < b && c > d) { return "é<>&\'"; } // fin'],
      ['html', '<a href="x?a=1&b=2">&amp; texte</a>'],
      ['python', "def f(x):\n\treturn '\\n' + x  # <tab>\n"],
      ['powershell', 'Get-ChildItem | Where-Object { $_.Length -gt 1MB }'],
      ['diff', '--- a/x\n+++ b/x\n-a < b\n+a > b'],
      ['rust', 'fn main() { let s = "&str"; println!("{}", s); }'],
    ];
    for (const [langage, code] of exemples) {
      expect(texteDesNoeuds(colorer(code, langage)?.noeuds ?? []), langage).toBe(code);
    }
  });

  it('ne colore pas un langage inconnu de highlight.js', () => {
    expect(colorer('+++[>+++<-]', 'brainfuck')).toBeNull();
    expect(colorer('x', 'constructor')).toBeNull();
    expect(colorer('x', '__proto__')).toBeNull();
  });

  it('ne colore pas un code vide ou énorme', () => {
    expect(colorer('', 'js')).toBeNull();
    expect(colorer('   \n ', 'js')).toBeNull();
    expect(colorer('a'.repeat(60_001), 'js')).toBeNull();
  });
});

describe('reconnaissance du langage', () => {
  const python =
    'import os\n\ndef lire(chemin):\n    with open(chemin) as f:\n        return [l.strip() for l in f if l]\n\nclass Compteur:\n    def __init__(self):\n        self.n = 0\n';
  const bash = '#!/bin/bash\nfor f in *.txt; do\n  echo "$f"\ndone\n';
  const php = "<?php echo 'x'; $a = 1; ?>";
  const sql =
    'SELECT u.id, u.nom\nFROM users u\nJOIN commandes c ON c.user_id = u.id\nWHERE c.total > 100\nGROUP BY u.id;\n';

  it('reconnaît un bloc sans langage assez typé, et le dit', () => {
    for (const [code, nom] of [
      [bash, 'Shell'],
      [php, 'PHP'],
    ] as const) {
      const coloration = colorer(code, '');
      expect(coloration?.detecte, nom).toBe(true);
      expect(coloration?.nom, nom).toBe(nom);
      expect(texteDesNoeuds(coloration?.noeuds ?? [])).toBe(code);
    }
  });

  it('reconnaît d’autres langages courants sans langage écrit', () => {
    expect(colorer(python, '')?.nom).toBe('Python');
    expect(colorer(sql, '')?.nom).toBe('SQL');
  });

  it('préfère l’absence de couleur à une mauvaise reconnaissance', () => {
    // Quatre lignes de Python que highlight.js hésite à donner à Python ou à CSS : jamais « CSS (détecté) ».
    const court = 'def somme(a, b):\n    return a + b\n\nprint(somme(1, 2))\n';
    expect(colorer(court, '')?.nom ?? null).not.toBe('CSS');
  });

  it('ne départage pas JavaScript et TypeScript : un code qui va aux deux est coloré', () => {
    const js = "async function charger(url) {\n  const r = await fetch(url);\n  if (!r.ok) throw new Error('x');\n  return r.json();\n}\n";
    expect(colorer(js, '')?.detecte).toBe(true);
    // Un court extrait n'est pas assez sûr : sans couleur plutôt que deviné.
    expect(colorer('const a = [1, 2, 3].map((x) => x * 2);\nconsole.log(a);', '')).toBeNull();
  });

  it('laisse sans couleur ce qui n’a pas l’air d’un code', () => {
    for (const texte of ['Ceci est une phrase normale en français.', 'npm run build', 'foo', 'C:\\Users\\zeman\\Desktop', 'Ctrl+B']) {
      expect(colorer(texte, ''), texte).toBeNull();
    }
  });

  it('n’essaie pas le Markdown ni l’INI sans qu’on les nomme', () => {
    expect(colorer('# Titre\n\n- un\n- deux\n\n**gras**', '')?.nom ?? null).not.toBe('Markdown');
    expect(colorer('# Titre\n\n- un\n- deux\n\n**gras**', 'md')).not.toBeNull();
  });

  it('est plus exigeant pour un code en ligne', () => {
    // Trop court pour qu'on le devine : aucune couleur, même si le même texte en aurait dans un bloc.
    for (const texte of ['const x = 1;', 'console.log(a)', 'SELECT * FROM t', 'git commit -m "x"', '$env:PATH']) {
      expect(colorer(texte, '', true), texte).toBeNull();
    }
    expect(colorer(php, '', true)?.nom).toBe('PHP');
  });

  it('rend la même chose deux fois de suite', () => {
    expect(colorer(python, '')).toBe(colorer(python, ''));
  });
});

describe('étiquette d’un bloc', () => {
  it('écrit le langage en toutes lettres quand il est écrit', () => {
    expect(etiquetteDuBloc('js', colorer('a', 'js'))).toBe('JavaScript');
    expect(etiquetteDuBloc('', null)).toBe('Code');
    expect(etiquetteDuBloc('brainfuck', null)).toBe('brainfuck');
  });

  it('marque le langage reconnu', () => {
    expect(etiquetteDuBloc('', colorer("<?php echo 'x'; $a = 1; ?>", ''))).toBe('PHP (détecté)');
  });
});
