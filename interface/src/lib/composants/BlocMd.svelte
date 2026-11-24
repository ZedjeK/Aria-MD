<!--
  Un bloc de l'aperçu Markdown : titre, paragraphe, citation, liste, code, séparateur ou tableau, dessiné à partir de
  l'arbre du moteur (markdown.ts). Chaque bloc porte la ligne du texte où il commence (data-ligne) : c'est ce qui permet
  d'amener l'aperçu sur un titre du plan. Citations et listes contiennent d'autres blocs, dessinés par ce même composant.
-->
<script lang="ts">
  import { nomDuLangage } from '../langages';
  import type { Alignement, Bloc } from '../markdown';
  import BlocMd from './BlocMd.svelte';
  import BoutonCopier from './BoutonCopier.svelte';
  import EnLigneMd from './EnLigneMd.svelte';

  interface Props {
    bloc: Bloc;
  }

  let { bloc }: Props = $props();

  /** L'alignement d'une cellule, tel que CSS l'écrit ; rien pour l'alignement par défaut. */
  function alignement(valeur: Alignement | undefined): string | undefined {
    if (valeur === 'gauche') return 'left';
    if (valeur === 'centre') return 'center';
    return valeur === 'droite' ? 'right' : undefined;
  }
</script>

{#if bloc.type === 'titre'}
  <svelte:element this={`h${bloc.niveau}`} data-ligne={bloc.ligne}><EnLigneMd noeuds={bloc.enfants} /></svelte:element>
{:else if bloc.type === 'paragraphe'}
  <p data-ligne={bloc.ligne}><EnLigneMd noeuds={bloc.enfants} /></p>
{:else if bloc.type === 'citation'}
  <blockquote data-ligne={bloc.ligne}>
    {#each bloc.enfants as enfant, i (i)}<BlocMd bloc={enfant} />{/each}
  </blockquote>
{:else if bloc.type === 'liste'}
  <svelte:element
    this={bloc.ordonnee ? 'ol' : 'ul'}
    start={bloc.ordonnee ? bloc.debut : undefined}
    class:serree={bloc.serree}
    data-ligne={bloc.ligne}
  >
    {#each bloc.items as item, i (i)}
      <li class:tache={item.tache !== null}>
        {#if item.tache !== null}
          <input type="checkbox" checked={item.tache} disabled aria-label={item.tache ? 'Fait' : 'À faire'} />
        {/if}
        <div>
          {#each item.enfants as enfant, k (k)}<BlocMd bloc={enfant} />{/each}
        </div>
      </li>
    {/each}
  </svelte:element>
{:else if bloc.type === 'code'}
  <div class="bloc-code" data-ligne={bloc.ligne}>
    <div class="entete-code">
      <span class="langage">{nomDuLangage(bloc.langage)}</span>
      <BoutonCopier texte={bloc.texte} />
    </div>
    <pre><code>{bloc.texte}</code></pre>
  </div>
{:else if bloc.type === 'separateur'}
  <hr data-ligne={bloc.ligne} />
{:else}
  <div class="tableau" data-ligne={bloc.ligne}>
    <table>
      <thead>
        <tr>
          {#each bloc.entete as cellule, k (k)}
            <th style:text-align={alignement(bloc.alignements[k])}><EnLigneMd noeuds={cellule} /></th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each bloc.lignes as rangee, r (r)}
          <tr>
            {#each rangee as cellule, k (k)}
              <td style:text-align={alignement(bloc.alignements[k])}><EnLigneMd noeuds={cellule} /></td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
