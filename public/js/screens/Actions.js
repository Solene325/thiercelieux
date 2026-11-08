// ─────────────────────────────────────────────────────────────
//  Panneaux d'action des rôles (nuit + chasseur)
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect, useState } from 'preact/hooks';
import { ROLES } from '/shared/roles.js';
import { act } from '../net.js';
import { sfx } from '../audio.js';
import { Icon, PlayerGrid, RoleCard, Seal } from '../components/ui.js';

const byId = (players) => Object.fromEntries(players.map((p) => [p.id, p]));

export function PickAction({ action, game, you, accent }) {
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSel([]), [action.kind, game.nightNo, game.phase]);
  const targets = new Set(action.targets);
  const players = game.players.filter((p) => p.alive);
  const toggle = (id) => {
    sfx.tick();
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : action.count === 1 ? [id] : [...s, id].slice(-action.count)));
  };
  const submit = async (skip = false) => {
    setBusy(true);
    const payload = skip ? { target: null } : action.count === 2 ? { targets: sel } : { target: sel[0] };
    const r = await act(payload);
    setBusy(false);
    if (!r.error && action.kind === 'hunter' && !skip) sfx.shot();
  };
  const verb = { cupidon: 'Décocher les flèches', salvateur: 'Protéger', voyante: 'Sonder cette âme', loup_blanc: 'Dévorer', grand_mechant_loup: 'Dévorer', corbeau: 'Désigner', hunter: 'Faire feu', enfant_sauvage: 'Choisir ce modèle', renard: 'Flairer', pretre: 'Asperger d’eau bénite', joueur_flute: 'Jouer la mélodie' }[action.kind] || 'Valider';
  return html`<section class="action-panel accent-${accent || 'gold'}">
    <header class="ap-head"><h2>${action.title}</h2><p>${action.sub}</p></header>
    <${PlayerGrid} players=${players} you=${you} selectable=${targets} selected=${sel} onSelect=${toggle} />
    <div class="ap-actions">
      ${action.allowSkip && html`<button class="btn ghost" disabled=${busy} onClick=${() => submit(true)}>${action.kind === 'hunter' ? 'Ne pas tirer' : 'Passer'}</button>`}
      <button class="btn ${accent === 'blood' ? 'blood' : 'gold'}" disabled=${busy || sel.length !== action.count || action.count === 0} onClick=${() => submit(false)}>${verb}</button>
    </div>
  </section>`;
}

export function HoundAction() {
  const choose = (choice) => { sfx.flip(); act({ choice }); };
  return html`<section class="action-panel">
    <header class="ap-head"><h2>Quelle est votre nature ?</h2><p>Ce choix est définitif.</p></header>
    <div class="choice-cards">
      <button class="choice" onClick=${() => choose('village')}>
        <${RoleCard} role="villageois" size="sm" showText=${false} />
        <b>Fidèle compagnon</b><small>Vous défendez le village</small>
      </button>
      <button class="choice blood" onClick=${() => choose('loup')}>
        <${RoleCard} role="loup" size="sm" showText=${false} />
        <b>Loup sauvage</b><small>Vous rejoignez la meute</small>
      </button>
    </div>
  </section>`;
}

export function WolvesAction({ action, game, you }) {
  const players = game.players.filter((p) => p.alive);
  const names = byId(game.players);
  const votes = game.wolfVotes || {};
  const tally = {};
  const voters = {};
  for (const [w, t] of Object.entries(votes)) {
    tally[t] = (tally[t] || 0) + 1;
    (voters[t] ||= []).push(names[w]?.name || '?');
  }
  const pack = players.filter((p) => p.wolf);
  const vote = (id) => { sfx.tick(); act({ type: 'wolf', target: action.current === id ? null : id }); };
  const agreed = pack.length > 0 && pack.every((w) => votes[w.id]) && new Set(pack.map((w) => votes[w.id])).size === 1;
  return html`<section class="action-panel accent-blood">
    <header class="ap-head">
      <h2>La meute choisit sa victime</h2>
      <p>${agreed ? 'La meute est unanime… la sentence tombe.' : 'Accordez-vous : la majorité l’emportera au terme du temps imparti.'}</p>
    </header>
    <div class="pack">${pack.map((w) => html`<span class="pack-member"><${Seal} name=${w.name} size=${26} glow="blood" />${w.name}${w.id === you ? ' (vous)' : ''}</span>`)}</div>
    <${PlayerGrid} players=${players} you=${you} selectable=${new Set(action.targets)} selected=${action.current ? [action.current] : []} onSelect=${vote} votes=${tally} voters=${voters} />
    <p class="hint center">Ouvrez les <b>Murmures</b> pour converser dans la tanière.</p>
  </section>`;
}

export function SpyAction({ action }) {
  return html`<section class="action-panel spy">
    <header class="ap-head">
      <h2>${action.active ? 'Vous espionnez…' : 'Les loups rôdent tout près'}</h2>
      <p>${action.active ? 'Leurs grognements vous parviennent dans les Murmures. Restez immobile…' : 'Oserez-vous entrouvrir les yeux ? Vous pourriez apercevoir un visage… ou être surprise.'}</p>
    </header>
    ${!action.active && html`<button class="btn blood" onClick=${() => act({ type: 'spy' })}><${Icon} name="eye" />Entrouvrir les yeux</button>`}
  </section>`;
}

export function WitchAction({ action, game, you }) {
  const [save, setSave] = useState(false);
  const [kill, setKill] = useState(null);
  const [aiming, setAiming] = useState(false);
  const names = byId(game.players);
  const victim = action.victim ? names[action.victim] : null;
  const submit = () => act({ save, kill });
  return html`<section class="action-panel witch">
    <header class="ap-head"><h2>L’heure des potions</h2>
      <p>${victim ? html`Cette nuit, <b class="blood-text">${victim.name}</b> est la victime de la meute.` : 'La meute n’a fait aucune victime cette nuit.'}</p>
    </header>
    <div class="potions">
      <button class="potion life ${save ? 'chosen' : ''}" disabled=${!action.life || !victim} onClick=${() => setSave((s) => !s)}>
        <span class="flask"></span>
        <b>Potion de résurrection</b>
        <small>${!action.life ? 'Déjà utilisée' : !victim ? 'Personne à sauver' : save ? `${victim.name} sera sauvé` : `Sauver ${victim.name}`}</small>
      </button>
      <button class="potion death ${kill ? 'chosen' : ''}" disabled=${!action.death} onClick=${() => { if (kill) { setKill(null); setAiming(false); } else setAiming((a) => !a); }}>
        <span class="flask"></span>
        <b>Potion de mort</b>
        <small>${!action.death ? 'Déjà utilisée' : kill ? `Pour ${names[kill]?.name} — annuler` : 'Empoisonner un joueur'}</small>
      </button>
    </div>
    ${aiming && !kill && html`<div class="aim">
      <p class="hint center">Dans quel gobelet verser le poison ?</p>
      <${PlayerGrid} players=${game.players.filter((p) => p.alive)} you=${you} selectable=${new Set(action.targets)} selected=${kill ? [kill] : []} onSelect=${(id) => { setKill(id); setAiming(false); }} dense />
    </div>`}
    <div class="ap-actions">
      <button class="btn gold" onClick=${submit}>${save || kill ? 'Sceller mon choix' : 'Ne rien faire cette nuit'}</button>
    </div>
  </section>`;
}

export function InfectAction({ action, game }) {
  const victim = game.players.find((p) => p.id === action.victim);
  return html`<section class="action-panel accent-blood">
    <header class="ap-head"><h2>Tuer… ou transformer ?</h2>
      <p>La meute a choisi <b class="blood-text">${victim?.name}</b>. Une seule fois dans la partie, votre morsure peut l’infecter : il rejoindra secrètement la meute.</p></header>
    <div class="ap-actions">
      <button class="btn ghost" onClick=${() => act({ infect: false })}>Laisser la meute tuer</button>
      <button class="btn blood" onClick=${() => act({ infect: true })}>Infecter ${victim?.name}</button>
    </div>
  </section>`;
}

export function DoneAction({ action, game }) {
  const v = action.vision;
  const fox = action.fox;
  if (fox) {
    const names = fox.group.map((id) => game.players.find((p) => p.id === id)?.name).join(', ');
    return html`<section class="action-panel done"><div class="sealed">
      <${Icon} name=${fox.found ? 'wolf' : 'close'} size=${36} />
      <h2>${fox.found ? 'Votre flair s’affole !' : 'Aucune odeur de loup'}</h2>
      <p>${fox.found ? `Au moins un loup se cache parmi ${names}.` : `${names} sentent l’honnête homme… Votre flair vous abandonne.`}</p>
    </div></section>`;
  }
  const target = v && game.players.find((p) => p.id === v.target);
  return html`<section class="action-panel done">
    ${v && target
      ? html`<div class="vision">
          <p class="eyebrow">Votre boule de cristal révèle</p>
          <${RoleCard} role=${v.role} size="md" />
          <h3>${target.name}</h3>
        </div>`
      : html`<div class="sealed"><${Icon} name="check" size=${36} /><h2>Votre choix est scellé</h2><p>Refermez les yeux… et attendez l’aube.</p></div>`}
  </section>`;
}

export function roleAccent(role) {
  return ROLES[role]?.camp === 'loups' ? 'blood' : 'gold';
}
