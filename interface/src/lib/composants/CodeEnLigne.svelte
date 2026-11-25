<!--
  Un code en ligne de l'aperçu (le petit code entouré dans une phrase) : un clic le copie dans le presse-papiers, et
  « Copié » s'affiche un instant au-dessus. Au clavier, Entrée ou Espace font la même chose. Un code en ligne n'a pas de
  langage : il n'a donc pas d'étiquette. Glisser pour sélectionner du texte ne copie rien.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { colorer } from '../coloration';
  import { copier } from '../presse-papiers';
  import CodeColore from './CodeColore.svelte';

  interface Props {
    texte: string;
  }

  let { texte }: Props = $props();

  /** Un code en ligne n'a pas de langage : il n'est coloré que si highlight.js le reconnaît très sûrement. */
  const coloration = $derived(colorer(texte, '', true));

  let etat = $state<'repos' | 'copie' | 'echec'>('repos');
  let minuterie: ReturnType<typeof setTimeout> | undefined;

  async function copierLeTexte() {
    etat = (await copier(texte)) ? 'copie' : 'echec';
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      etat = 'repos';
    }, 1500);
  }

  function touche(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    void copierLeTexte();
  }

  onDestroy(() => clearTimeout(minuterie));
</script>

<span
  class="copiable"
  class:copie={etat === 'copie'}
  class:echec={etat === 'echec'}
  role="button"
  tabindex="0"
  title="Cliquer pour copier"
  aria-label={`Copier : ${texte}`}
  onclick={() => void copierLeTexte()}
  onkeydown={touche}><code>{#if coloration}<CodeColore noeuds={coloration.noeuds} />{:else}{texte}{/if}</code>{#if etat !== 'repos'}<span class="retour" role="status">{etat === 'copie' ? 'Copié' : 'Échec'}</span>{/if}</span
>

<style>
  .copiable {
    position: relative;
    cursor: copy;
  }

  .copiable:hover :global(code),
  .copiable:focus-visible :global(code) {
    border-color: var(--cyan);
  }

  .copie :global(code) {
    border-color: var(--cyan);
  }

  .echec :global(code) {
    border-color: var(--rouge);
  }

  /* L'annonce, juste au-dessus du code : elle ne décale pas la phrase. */
  .retour {
    position: absolute;
    bottom: 100%;
    left: 50%;
    padding: 1px 8px;
    background: var(--cyan);
    color: var(--fond);
    font: 700 11px var(--police);
    pointer-events: none;
    transform: translateX(-50%);
    white-space: nowrap;
  }

  .echec .retour {
    background: var(--rouge);
  }
</style>
