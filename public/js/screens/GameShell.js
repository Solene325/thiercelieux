// ─────────────────────────────────────────────────────────────
//  Cadre de jeu : en-tête de phase, narration, scène, tiroirs
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ROLES } from '/shared/roles.js';
import { call, leaveRoom } from '../net.js';
import { isNarrating, onNarrationState, playUrlOnce, stopSpeech } from '../audio.js';
import { Countdown, Emblem, Icon, RoleCard, Sheet } from '../components/ui.js';
import { Chat } from '../components/Chat.js';
import { VoicePanel } from './Lobby.js';
import { Village } from './Village.js';
import { Reveal } from './Reveal.js';
import { Night } from './Night.js';
import { Council, Dawn, Hunter } from './Day.js';
import { Verdict, Vote } from './Vote.js';
import { GameOver } from './GameOver.js';
import { PhaseEffects } from '../components/PhaseEffects.js';

export function phaseMood(game) {
  if (!game) return 'night';
  switch (game.phase) {
    case 'reveal': case 'night': return 'night';
    case 'dawn': case 'hunter': return 'dawn';
    case 'day': return 'day';
    case 'vote': case 'verdict': return 'vote';
    case 'over': return game.winner?.camp === 'village' || game.winner?.camp === 'amoureux' ? 'day' : 'vote';
    default: return 'night';
  }
}

function phaseTitle(g) {
  switch (g.phase) {
    case 'reveal': return ['La distribution des cartes', 'Chacun découvre son destin', 'card'];
    case 'night': return [`Nuit ${g.nightNo}`, g.stepLabel?.title || 'Le village dort', 'moon'];
    case 'dawn': return ['L’aube', 'Le village se réveille', 'sun'];
    case 'day': return [`Jour ${g.dayNo}`, 'Le conseil des villageois', 'sun'];
    case 'vote': return [`Jour ${g.dayNo}`, 'Le bûcher', 'flame'];
    case 'verdict': return [`Jour ${g.dayNo}`, 'Le verdict', 'flame'];
    case 'hunter': return ['Un coup de feu', 'Le dernier souffle du Chasseur', 'skull'];
    case 'over': return ['Fin de la partie', g.winner?.title || '', 'crown'];
    default: return ['', '', 'moon'];
  }
}

function NarrationBanner({ narration }) {
  const [shown, setShown] = useState(null);
  const [playing, setPlaying] = useState(isNarrating);
  useEffect(() => { setPlaying(isNarrating()); return onNarrationState(setPlaying); }, []);
  useEffect(() => {
    if (!narration) return;
    setShown(narration);
    const t = setTimeout(() => setShown((s) => (s?.seq === narration.seq ? null : s)), Math.max(8000, (narration.duration || narration.text.length / 14) * 1000 + 2500));
    return () => clearTimeout(t);
  }, [narration?.seq]);
  if (!shown) return null;
  const audio = narration?.seq === shown.seq ? narration.audio : shown.audio;
  return html`<div class="narration" key=${shown.seq}><${Icon} name="voice" size=${16} /><p role="status" aria-live="polite">${shown.text}</p><button class="icon-btn narration-control" aria-label=${playing ? 'Arrêter la lecture' : 'Écouter la narration'} title=${playing ? 'Arrêter la lecture' : 'Écouter la narration'} onClick=${() => playing ? stopSpeech() : playUrlOnce(audio, shown.text, shown.scope)}><${Icon} name=${playing ? 'mute' : 'voice'} size=${16} /></button></div>`;
}

function Notebook({ game }) {
  const [tab, setTab] = useState('notes');
  const notes = [...(game.notes || [])].reverse();
  const chron = [...(game.chronicle || [])].reverse();
  const list = tab === 'notes' ? notes : chron;
  return html`<div class="notebook">
    <nav class="seg small"><button class=${tab === 'notes' ? 'active' : ''} onClick=${() => setTab('notes')}>Mes secrets</button><button class=${tab === 'chron' ? 'active' : ''} onClick=${() => setTab('chron')}>Chronique du village</button></nav>
    ${list.length === 0 && html`<p class="chat-empty">${tab === 'notes' ? 'Aucun secret pour l’instant.' : 'La chronique est vierge.'}</p>`}
    <ol class="entries">${list.map((n, i) => html`<li key=${i} class="tone-${n.tone}"><small>${n.label}</small><p>${n.text}</p></li>`)}</ol>
  </div>`;
}

function MyRole({ game }) {
  const [show, setShow] = useState(true);
  const me = game.me;
  if (!me) return html`<p class="hint center">Vous êtes le narrateur : vous ne possédez pas de carte, mais vous voyez tout.</p>`;
  const r = ROLES[me.role];
  const lover = game.players.find((p) => p.lover && p.id !== me.id);
  return html`<div class="my-role">
    ${show
      ? html`<${RoleCard} role=${me.role} size="md" />`
      : html`<${RoleCard} flipped=${false} size="md" />`}
    <button class="btn ghost small" onClick=${() => setShow((s) => !s)}><${Icon} name="eye" size=${16} />${show ? 'Masquer mon rôle' : 'Afficher mon rôle'}</button>
    <p class="hint center">${show ? 'Votre carte — gardez-la secrète.' : 'Votre carte est masquée.'}</p>
    ${show && html`<p>${r.desc}</p>`}
    ${me.role === 'chien_loup' && me.houndChoice && html`<p class="note-line">Vous avez choisi : <b>${me.houndChoice === 'loup' ? 'la meute' : 'le village'}</b>.</p>`}
    ${lover && me.role !== 'cupidon' && html`<p class="note-line love">♥ Vous êtes lié à <b>${lover.name}</b>.</p>`}
    ${!me.alive && html`<p class="note-line">† Vous avez quitté le monde des vivants.</p>`}
  </div>`;
}

function ConfirmButton({ onConfirm, label, confirm }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  return html`<button class="btn ghost danger ${armed ? 'armed' : ''}" onClick=${() => (armed ? onConfirm() : setArmed(true))}>${armed ? confirm : label}</button>`;
}

export function GameShell({ view, chats, writable, unread, narration }) {
  const { game, room, you } = view;
  const [sheet, setSheet] = useState(null);
  const [title, sub, icon] = phaseTitle(game);
  const prev = useRef({});

  // Effets sonores aux transitions
  useEffect(() => {
    const p = prev.current;
    prev.current = { phase: game.phase, night: game.nightNo };
    // Ferme les tiroirs quand une action est requise
    if (game.action && ['pick', 'wolves', 'witch', 'hound', 'vote'].includes(game.action.type)) setSheet((s) => (s === 'chat' && game.action.type === 'wolves' ? s : null));
  }, [game.phase, game.step]);

  let stage;
  const props = { game, you, room };
  switch (game.phase) {
    case 'reveal': stage = html`<${Reveal} ...${props} />`; break;
    case 'night': stage = html`<${Night} ...${props} />`; break;
    case 'dawn': stage = html`<${Dawn} ...${props} />`; break;
    case 'day': stage = html`<${Council} ...${props} />`; break;
    case 'vote': stage = html`<${Vote} ...${props} />`; break;
    case 'verdict': stage = html`<${Verdict} ...${props} />`; break;
    case 'hunter': stage = html`<${Hunter} ...${props} />`; break;
    case 'over': stage = html`<${GameOver} ...${props} />`; break;
    default: stage = null;
  }
  const stageKey = `${game.phase}-${game.phase === 'night' ? game.step : ''}-${game.nightNo}-${game.dayNo}`;
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [stageKey]);

  return html`<div class="game phase-${game.phase}">
    <header class="game-head">
      <div class="gh-title" key=${`${game.phase}-${game.nightNo}`} aria-live="polite" aria-atomic="true">
        <span class="gh-icon"><${Icon} name=${icon} size=${22} /></span>
        <div><small>${title}</small><h1>${sub}</h1></div>
      </div>
      <div class="gh-right">
        ${game.phase !== 'over' && html`<${Countdown} deadline=${game.deadline} tense=${game.phase === 'vote'} />`}
        ${room.isHost && game.phase !== 'over' && html`<button class="icon-btn" title="Passer à la suite" aria-label="Passer à la suite" onClick=${() => call('game:skip')}><${Icon} name="skip" /></button>`}
      </div>
    </header>
    <div class="game-context"><span><${Icon} name="users" size=${15} />${game.players.filter((p) => p.alive).length} survivants / ${game.players.length}</span><span>Village <b>${room.code}</b></span></div>
    <${NarrationBanner} narration=${narration} />
    <${PhaseEffects} game=${game} />
    <main class="stage-wrap" key=${stageKey}>${stage}</main>

    <nav class="dock" aria-label="Navigation de jeu">
      <button onClick=${() => setSheet('role')} class=${sheet === 'role' ? 'active' : ''}>
        ${game.me ? html`<${Emblem} role=${game.me.role} size=${22} />` : html`<${Icon} name="eye" />`}<span>Mon rôle</span></button>
      <button onClick=${() => setSheet('village')} class=${sheet === 'village' ? 'active' : ''}><${Icon} name="users" /><span>Village</span></button>
      <button onClick=${() => setSheet('chat')} class=${sheet === 'chat' ? 'active' : ''}><${Icon} name="chat" /><span>Murmures</span>${unread ? html`<span class="badge">${unread}</span>` : null}</button>
      <button onClick=${() => setSheet('notes')} class=${sheet === 'notes' ? 'active' : ''}><${Icon} name="book" /><span>Carnet</span>${game.notes?.length ? html`<span class="badge subtle">${game.notes.length}</span>` : null}</button>
      <button onClick=${() => setSheet('menu')} class=${sheet === 'menu' ? 'active' : ''}><${Icon} name="gear" /><span>Réglages</span></button>
    </nav>

    <${Sheet} open=${sheet === 'role'} onClose=${() => setSheet(null)} title="Votre carte" icon="card"><${MyRole} game=${game} /></${Sheet}>
    <${Sheet} open=${sheet === 'village'} onClose=${() => setSheet(null)} title="Les habitants de Thiercelieux" icon="users" wide><${Village} game=${game} you=${you} room=${room} /></${Sheet}>
    <${Sheet} open=${sheet === 'chat'} onClose=${() => setSheet(null)} title="Murmures" icon="chat"><${Chat} chats=${chats} writable=${writable} you=${you} /></${Sheet}>
    <${Sheet} open=${sheet === 'notes'} onClose=${() => setSheet(null)} title="Carnet" icon="book"><${Notebook} game=${game} /></${Sheet}>
    <${Sheet} open=${sheet === 'menu'} onClose=${() => setSheet(null)} title="Réglages" icon="gear">
      <${VoicePanel} room=${room} />
      <div class="menu-actions">
        ${room.isHost && game.phase !== 'over' && html`<button class="btn ghost" onClick=${() => call('game:skip')}><${Icon} name="skip" />Passer l’étape en cours</button>`}
        ${room.isHost && html`<${ConfirmButton} onConfirm=${() => { call('game:end'); setSheet(null); }} label="Mettre fin à la partie" confirm="Toucher à nouveau pour confirmer" />`}
        <button class="btn ghost" onClick=${() => leaveRoom()}><${Icon} name="door" />Quitter le village</button>
      </div>
    </${Sheet}>
  </div>`;
}
