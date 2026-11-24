<!--
  Le bouton « Copier » d'un bloc de code de l'aperçu : il copie le texte dans le presse-papiers, puis dit « Copié » (ou
  « Échec » si Windows a refusé) pendant un instant. Même forme que les outils de la barre latérale.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { copier } from '../presse-papiers';
  import Outil from './Outil.svelte';

  interface Props {
    /** Le texte à copier. */
    texte: string;
  }

  let { texte }: Props = $props();

  let etat = $state<'repos' | 'copie' | 'echec'>('repos');
  let minuterie: ReturnType<typeof setTimeout> | undefined;

  async function copierLeTexte() {
    etat = (await copier(texte)) ? 'copie' : 'echec';
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      etat = 'repos';
    }, 1500);
  }

  onDestroy(() => clearTimeout(minuterie));

  const libelle = $derived(etat === 'copie' ? 'Copié' : etat === 'echec' ? 'Échec' : 'Copier');
</script>

<Outil titre="Copier le code" onclick={() => void copierLeTexte()}>{libelle}</Outil>
