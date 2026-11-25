<!--
  L'onglet « Plan » de la barre latérale de l'éditeur : les titres du document, le glossaire du texte. Ils sont indentés selon
  leur niveau, avec ou sans numéros (1, 1.1, 1.2…), et un titre qui a des sous-titres se replie. Une recherche filtre les titres
  (sans tenir compte des majuscules ni des accents). Un clic sur un titre place le curseur dessus ; celui sous lequel se
  trouve le curseur est marqué. Ce qui est recherché, replié et numéroté reste quand on change d'onglet : l'état vit dans
  l'éditeur.
-->
<script lang="ts">
  import { aDesSousTitres, cleDeTitre, clesRepliables, indicesVisibles, numeros as numerosDe, type Titre } from '../plan';
  import Bouton from './Bouton.svelte';

  interface Props {
    titres: Titre[];
    /** L'indice du titre sous le curseur dans `titres` ; -1 avant le premier titre. */
    courant: number;
    aller: (titre: Titre) => void;
    recherche: string;
    /** Les clés (`cleDeTitre`) des titres repliés. */
    replies: ReadonlySet<string>;
    numerote: boolean;
  }

  let {
    titres,
    courant,
    aller,
    recherche = $bindable(),
    replies = $bindable(),
    numerote = $bindable(),
  }: Props = $props();

  const enRecherche = $derived(recherche.trim() !== '');
  const visibles = $derived(indicesVisibles(titres, replies, recherche));
  const numeros = $derived(numerote ? numerosDe(titres) : []);
  /** Le titre du plan qui contient le curseur : lui-même s'il est visible, sinon le plus proche titre visible au-dessus. */
  const marque = $derived(visibles.filter((i) => i <= courant).pop() ?? -1);

  function basculer(indice: number) {
    const cle = cleDeTitre(titres, indice);
    const suite = new Set(replies);
    if (!suite.delete(cle)) suite.add(cle);
    replies = suite;
  }
</script>

{#if titres.length === 0}
  <p class="vide">Aucun titre pour l'instant. Écris « # Titre », ou utilise les boutons H1 à H6 de l'onglet Raccourcis.</p>
{:else}
  <div class="outils">
    <input type="search" placeholder="Chercher un titre" aria-label="Chercher un titre" bind:value={recherche} />
    <div class="options">
      <label class="numeros"><input type="checkbox" bind:checked={numerote} /> Numéros</label>
      <span class="gestes">
        <Bouton genre="discret" petit desactive={enRecherche} onclick={() => (replies = new Set(clesRepliables(titres)))}>
          Tout replier
        </Bouton>
        <Bouton genre="discret" petit desactive={enRecherche} onclick={() => (replies = new Set())}>Tout déplier</Bouton>
      </span>
    </div>
  </div>

  {#if enRecherche}
    <p class="compte" role="status">
      {visibles.length === 0
        ? 'Aucun titre ne contient ces lettres.'
        : `${visibles.length} titre${visibles.length > 1 ? 's' : ''} sur ${titres.length}`}
    </p>
  {/if}

  <nav aria-label="Plan du document">
    <ul>
      {#each visibles as i (titres[i]?.debut)}
        {@const titre = titres[i]}
        {#if titre}
          {@const repliable = !enRecherche && aDesSousTitres(titres, i)}
          {@const replie = repliable && replies.has(cleDeTitre(titres, i))}
          <li style:padding-left={enRecherche ? undefined : `${(titre.niveau - 1) * 14}px`}>
            {#if repliable}
              <button
                type="button"
                class="pli"
                class:ouvert={!replie}
                aria-expanded={!replie}
                aria-label={`${replie ? 'Déplier' : 'Replier'} ${titre.texte}`}
                onmousedown={(e) => e.preventDefault()}
                onclick={() => basculer(i)}
              ></button>
            {:else}
              <span class="pli" aria-hidden="true"></span>
            {/if}
            <button
              type="button"
              class="titre"
              class:courant={i === courant}
              class:dedans={i === marque && i !== courant}
              aria-current={i === courant ? 'location' : undefined}
              onmousedown={(e) => e.preventDefault()}
              onclick={() => aller(titre)}
            >
              <span class="puce" aria-hidden="true"></span>
              {#if numerote}<span class="numero">{numeros[i]}</span>{/if}
              <span class="texte">{titre.texte}</span>
            </button>
          </li>
        {/if}
      {/each}
    </ul>
  </nav>
{/if}

<style>
  .vide {
    margin: 14px 0 0;
    color: var(--texte-2);
  }

  .outils {
    display: grid;
    gap: 8px;
    margin-top: 12px;
  }

  input[type='search'] {
    width: 100%;
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .numeros {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--texte-2);
    font-size: 12px;
    cursor: pointer;
  }

  .gestes {
    display: inline-flex;
    gap: 6px;
  }

  .compte {
    margin: 8px 0 0;
    color: var(--texte-2);
    font-size: 12px;
  }

  ul {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: stretch;
  }

  /* Le triangle qui replie : dessiné en CSS, tourné quand le titre est ouvert. */
  .pli {
    position: relative;
    flex: none;
    width: 18px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--texte-2);
  }

  button.pli {
    cursor: pointer;
  }

  button.pli::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    border: 4px solid transparent;
    border-left: 6px solid currentcolor;
    transform: translate(-30%, -50%);
  }

  button.pli.ouvert::before {
    transform: translate(-50%, -30%) rotate(90deg);
  }

  button.pli:hover,
  button.pli:focus-visible {
    color: var(--cyan);
  }

  .titre {
    display: flex;
    flex: 1;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    padding: 5px 8px 5px 2px;
    border: 0;
    border-left: 2px solid transparent;
    background: none;
    color: var(--texte);
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  .titre:hover,
  .titre:focus-visible {
    background: color-mix(in srgb, var(--cyan) 10%, transparent);
  }

  .texte {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .numero {
    flex: none;
    color: var(--texte-2);
    font-family: var(--police-code);
    font-size: 12px;
  }

  .puce {
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--bleu);
  }

  .courant {
    border-left-color: var(--cyan);
    color: var(--cyan);
  }

  .courant .puce {
    background: var(--cyan);
  }

  /* Le curseur est dans un titre replié : son plus proche titre visible est marqué, plus discrètement. */
  .dedans {
    border-left-color: var(--bleu);
  }

  .dedans .puce {
    background: var(--cyan);
  }
</style>
