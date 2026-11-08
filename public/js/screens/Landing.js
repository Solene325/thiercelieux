// ─────────────────────────────────────────────────────────────
//  Accueil : fonder ou rejoindre un village
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useRef, useState } from 'preact/hooks';
import { createRoom, joinRoom, session } from '../net.js';
import { unlockAudio } from '../audio.js';
import { Icon, Sheet } from '../components/ui.js';
import { ROLES } from '/shared/roles.js';
import { Grimoire } from '../components/Grimoire.js';

function CodeInput({ value, onChange }) {
  const ref = useRef(null);
  const cells = Array.from({ length: 6 }, (_, i) => value[i] || '');
  return html`<div class="code-input" onClick=${() => ref.current?.focus()}>
    <input ref=${ref} value=${value} inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="6" pattern="[A-Z0-9]{6}" autocorrect="off" enterkeyhint="next" required aria-label="Code du village"
      onPaste=${(e) => { e.preventDefault(); onChange(e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); }}
      onInput=${(e) => onChange(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} />
    ${cells.map((c, i) => html`<span aria-hidden="true" class="cell ${c ? 'filled' : ''} ${i === Math.min(value.length, 5) ? 'caret' : ''}">${c}</span>`)}
  </div>`;
}

export function Landing() {
  const params = new URLSearchParams(location.search);
  const urlCode = (params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const [mode, setMode] = useState('join');
  const [code, setCode] = useState(urlCode);
  const [name, setName] = useState(session.load()?.name || '');
  const [busy, setBusy] = useState(false);
  const [grim, setGrim] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    unlockAudio();
    if (busy) return;
    if (!name.trim()) {
      const input = e.currentTarget.querySelector('[autocomplete="nickname"]');
      input.setCustomValidity('Indiquez votre nom au village.');
      input.reportValidity();
      return;
    }
    setBusy(true);
    const r = mode === 'create' ? await createRoom(name.trim()) : await joinRoom(code, name.trim());
    setBusy(false);
    if (r.ok && urlCode) history.replaceState(null, '', location.pathname);
  };

  const featured = ['loup', 'voyante', 'sorciere', 'chasseur'];

  return html`<main class="landing screen-enter" id="main">
    <a class="skip-link" href="#village-access">Accéder au village</a>
    <nav class="site-nav" aria-label="Navigation principale">
      <a class="brand" href="/"><img class="brand-mark" src="/img/brand/thiercelieux-emblem-transparent.webp" alt="" width="48" height="48" /><span>THIERCELIEUX<small>LES LOUPS-GAROUS</small></span></a>
      <a class="nav-rules" href="#how-to-play">Comment jouer</a><button class="nav-grimoire" onClick=${() => setGrim(true)}><${Icon} name="book" size=${17} />Le grimoire <span>↗</span></button>
    </nav>
    <div class="landing-layout">
    <header class="hero">
      <p class="edition"><span></span> LE VILLAGE VOUS ATTEND</p>
      <h1 class="title">Vos amis ont<br />un côté <em>sombre.</em></h1>
      <p class="lede">Un village endormi. Des regards qui mentent.<br class="desktop-break" /> Retrouvez le jeu culte des nuits entre amis, sur vos téléphones.</p>
      <div class="hero-art brand-art" aria-hidden="true">
        <img class="hero-logo" src="/img/brand/thiercelieux-logo-transparent.webp" alt="" width="768" height="768" fetchpriority="high" />
      </div>
      <div class="hero-facts"><span><${Icon} name="users" size=${17} />4 à 50 joueurs</span><span><${Icon} name="moon" size=${17} />24 rôles à incarner</span></div>
    </header>
    <div class="gate-column" id="village-access">
    <div class="gate-intro"><span class="eyebrow">VOTRE PROCHAINE PARTIE</span><h2>Entrez dans la légende.</h2><p>Rejoignez vos amis ou devenez le meneur de la soirée.</p></div>
    <section class="gate panel">
      <nav class="seg" aria-label="Accès au village">
        <button type="button" aria-pressed=${mode === 'join'} class=${mode === 'join' ? 'active' : ''} onClick=${() => setMode('join')}><${Icon} name="door" size=${18} />Rejoindre</button>
        <button type="button" aria-pressed=${mode === 'create'} class=${mode === 'create' ? 'active' : ''} onClick=${() => setMode('create')}><${Icon} name="crown" size=${18} />Fonder un village</button>
      </nav>
      <form onSubmit=${submit} class="gate-form" aria-busy=${busy}>
        ${mode === 'join' && html`<label class="field"><span>Code du village</span><${CodeInput} value=${code} onChange=${setCode} /></label>`}
        <label class="field">
          <span>${mode === 'create' ? 'Votre nom de meneur' : 'Votre nom au village'}</span>
          <input class="text" value=${name} maxlength="18" enterkeyhint="go" autocomplete="nickname" placeholder="Comment vous appelle-t-on ?" required onInput=${(e) => { e.currentTarget.setCustomValidity(''); setName(e.currentTarget.value); }} />
        </label>
        <button class="btn gold big" disabled=${busy}>
          ${busy ? 'Les portes s’ouvrent…' : mode === 'create' ? 'Créer mon village' : 'Entrer dans le village'}
        </button>
        <p class="hint">${mode === 'create'
          ? 'Vous recevrez un code à six caractères à partager avec vos amis. Jusqu’à 50 âmes par village.'
          : 'Demandez le code au meneur de la partie.'}</p>
      </form>
    </section>
    <p class="gate-reassurance"><${Icon} name="check" size=${15} />Sans inscription · Un téléphone par joueur</p>
    <button class="discover-roles" onClick=${() => setGrim(true)}><span class="role-previews"><img src="/img/roles/sorciere.webp" alt="" /><img src="/img/roles/chasseur.webp" alt="" /><img src="/img/roles/villageois.webp" alt="" /></span><span><b>24 rôles. Autant de secrets.</b><small>Explorez le grimoire des personnages</small></span><span class="discover-arrow">↗</span></button>
    </div>
    </div>
    <section id="how-to-play" class="how-it-works" aria-label="Comment jouer">
      <article><span>01</span><div><h3>Rassemblez le village</h3><p>Créez une partie et partagez votre code.</p></div></article>
      <article><span>02</span><div><h3>Gardez votre secret</h3><p>Découvrez votre rôle à l’abri des regards.</p></div></article>
      <article><span>03</span><div><h3>Faites parler les soupçons</h3><p>Débattez, votez… et survivez à la nuit.</p></div></article>
    </section>
    <section class="roles-showcase">
      <header class="section-heading"><div><p class="eyebrow">SOUS LES APPARENCES</p><h2>Un rôle. Mille façons de mentir.</h2></div><button class="btn ghost" onClick=${() => setGrim(true)}>Les 24 personnages <${Icon} name="book" size=${17} /></button></header>
      <div class="featured-grid">${featured.map((id) => html`<button class="featured-role" onClick=${() => setGrim(true)} key=${id}><img src=${`/img/roles/${id}.webp`} alt="" loading="lazy" width="400" height="500" /><span class="featured-copy"><small>${ROLES[id].camp === 'loups' ? 'LA MEUTE' : 'LE VILLAGE'}</small><b>${ROLES[id].name}</b><span>${ROLES[id].tagline}</span></span><span class="featured-plus" aria-hidden="true">↗</span></button>`)}</div>
    </section>
    <section class="landing-faq"><div><p class="eyebrow">AVANT LA PREMIÈRE NUIT</p><h2>Tout commence<br />par quelques secrets.</h2></div><div>
      <details><summary>Comment lancer une partie ?</summary><p>Créez un village et partagez son code à six caractères. Chaque joueur le saisit sur son téléphone. Dès que vous êtes au moins quatre, le meneur peut lancer la partie.</p></details>
      <details><summary>Faut-il un maître du jeu ?</summary><p>L’application distribue les rôles et guide les étapes. Le meneur peut participer ou choisir de rester narrateur dans les réglages du village.</p></details>
      <details><summary>Et si mon téléphone se déconnecte ?</summary><p>Rouvrez le jeu dans le même navigateur : votre place et votre rôle sont retrouvés automatiquement tant que la partie est active sur le serveur.</p></details>
    </div></section>
    <${Sheet} open=${grim} onClose=${() => setGrim(false)} title="Le grimoire" icon="book" wide><${Grimoire} /></${Sheet}>
    <footer class="foot"><span>THIERCELIEUX <i>·</i> Les amis d’aujourd’hui. Les suspects de ce soir.</span><span>Narration par la voix du meneur</span></footer>
  </main>`;
}
