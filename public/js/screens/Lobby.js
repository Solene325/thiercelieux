// ─────────────────────────────────────────────────────────────
//  La taverne : salle d'attente, composition, réglages, voix
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect, useState } from 'preact/hooks';
import { ROLES, SPECIAL_ROLES, compositionBalance, compositionCount, finalizeComposition, MIN_PLAYERS } from '/shared/roles.js';
import { call, leaveRoom, toast } from '../net.js';
import { audioPrefs, playUrlOnce, unlockAudio } from '../audio.js';
import { Emblem, Icon, Ornament, RoleCard, Seal, Sheet, Stepper, Toggle } from '../components/ui.js';
import { Chat } from '../components/Chat.js';
import { Grimoire } from '../components/Grimoire.js';

const KEY_STORE = 'lg_elevenlabs';
const loadKey = () => { try { return JSON.parse(localStorage.getItem(KEY_STORE)) || {}; } catch { return {}; } };
const saveKey = (v) => { try { localStorage.setItem(KEY_STORE, JSON.stringify(v)); } catch { /* ignore */ } };

const settings = (patch) => call('room:settings', patch);

function CodeBanner({ code }) {
  const [invitation, setInvitation] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  useEffect(() => {
    let active = true;
    call('room:invite', { origin: location.origin }).then((r) => { if (active) setInvitation(r); });
    return () => { active = false; };
  }, [code]);
  const link = invitation?.link || `${location.origin}/?code=${code}`;
  const qrImage = invitation?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(invitation.svg)}` : null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast('Lien du village copié', 'ok'); }
    catch { toast(`Code : ${code}`); }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Loups-Garous de Thiercelieux', text: `Rejoins le village ! Code : ${code}`, url: link }); } catch { /* annulé */ }
    } else copy();
  };
  return html`<section class="code-banner panel">
    <span class="eyebrow">Code du village</span>
    <div class="big-code" aria-label=${code.split('').join(' ')}>${code.split('').map((c, i) => html`<span style=${{ animationDelay: `${i * 70}ms` }}>${c}</span>`)}</div>
    <div class="row gap">
      <button class="btn ghost small" onClick=${copy}><${Icon} name="copy" size=${16} />Copier le lien</button>
      <button class="btn ghost small" onClick=${share}><${Icon} name="share" size=${16} />Inviter</button>
    </div>
    ${qrImage ? html`<div class="invite-qr"><button class="qr-preview" onClick=${() => setQrOpen(true)} aria-label="Agrandir le QR code du village"><img src=${qrImage} width="112" height="112" alt="QR code pour rejoindre le village" /></button><div><b>Scannez, vous y êtes.</b><p>Ouvrez l’appareil photo pour rejoindre ce village.</p><button class="qr-expand" onClick=${() => setQrOpen(true)}>Agrandir le QR code ↗</button></div></div>`
      : html`<p class="hint invite-qr-status" role="status">${invitation?.error ? 'Le QR code est indisponible. Le code et le lien restent utilisables.' : 'Préparation du QR code…'}</p>`}
    <${Sheet} open=${qrOpen} onClose=${() => setQrOpen(false)} title="Rejoindre le village" icon="users">
      <div class="qr-share"><p class="eyebrow">VILLAGE ${code}</p><h2>Votre place vous attend.</h2>${qrImage && html`<img class="qr-large" src=${qrImage} width="264" height="264" alt="QR code du village ${code}" />`}<p>Scannez avec l’appareil photo de votre téléphone.<br />Le code du village sera déjà renseigné.</p><label class="field"><span>Lien d’invitation</span><input class="text" value=${link} readonly onFocus=${(e) => e.currentTarget.select()} /></label><div class="row gap"><button class="btn gold" onClick=${copy}><${Icon} name="copy" size=${16} />Copier le lien</button><a class="btn ghost" href=${qrImage} download=${`village-${code}.svg`}>Télécharger le QR code</a></div></div>
    </${Sheet}>
  </section>`;
}

function Roster({ room, you }) {
  const { players, isHost, hostId, settings: s, capacity } = room;
  const kick = (id) => call('room:kick', { id });
  return html`<section class="panel roster">
    <header class="panel-head">
      <h2><${Icon} name="users" />Les villageois</h2>
      <span class="count">${players.length}<small> / ${capacity}</small></span>
    </header>
    <ul class="roster-list">
      ${players.map((p, i) => html`<li key=${p.id} class="roster-item ${p.connected ? '' : 'offline'}" style=${{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
        <${Seal} name=${p.name} size=${40} />
        <span class="rname">${p.name}${p.id === you ? html`<em> · vous</em>` : ''}</span>
        ${p.bot && html`<span class="bot-tag" title="Bot de test">bot</span>`}
        ${p.id === hostId && html`<span class="host-tag" title="Meneur"><${Icon} name="crown" size=${14} />${s.hostPlays ? 'Meneur' : 'Narrateur'}</span>`}
        ${isHost && p.id !== you && html`<button class="icon-btn kick" onClick=${() => kick(p.id)} aria-label="Chasser ${p.name}"><${Icon} name="close" size=${16} /></button>`}
      </li>`)}
    </ul>
    ${players.length < MIN_PLAYERS && html`<p class="hint center">Il faut au moins ${MIN_PLAYERS} âmes pour réveiller la meute.</p>`}
    ${isHost && html`<div class="bot-bar">
      <span class="bot-label"><${Icon} name="users" size=${16} />Bots de test</span>
      <div class="row gap">
        ${[1, 5, 10].map((n) => html`<button class="btn ghost small" onClick=${() => call('room:bots', { add: n })}>+${n}</button>`)}
        ${players.some((p) => p.bot) && html`<button class="btn ghost small danger" onClick=${() => call('room:bots', { remove: true })}>Retirer</button>`}
      </div>
    </div>`}
  </section>`;
}

function BalanceGauge({ comp }) {
  const b = compositionBalance(comp);
  const n = Math.max(1, compositionCount(comp));
  const score = Math.max(-1, Math.min(1, b / (n * 1.6)));
  const label = score < -0.35 ? 'La meute est favorisée' : score > 0.35 ? 'Le village est favorisé' : 'Équilibre subtil';
  return html`<div class="gauge">
    <div class="gauge-bar"><span class="gauge-needle" style=${{ left: `${50 + score * 50}%` }}></span></div>
    <div class="gauge-legend"><span>Meute</span><b>${label}</b><span>Village</span></div>
  </div>`;
}

export function CompositionView({ comp }) {
  const entries = Object.entries(comp).sort((a, b) => {
    const o = (r) => (ROLES[r].camp === 'loups' ? 0 : ROLES[r].camp === 'solo' ? 1 : r === 'villageois' ? 3 : 2);
    return o(a[0]) - o(b[0]);
  });
  return html`<div class="comp-cards">
    ${entries.map(([r, c], i) => html`<div class="comp-card camp-${ROLES[r].camp}" key=${r} title=${ROLES[r].desc} style=${{ animationDelay: `${i * 40}ms` }}>
      <${RoleCard} role=${r} size="xs" showText=${false} />
      ${c > 1 && html`<span class="ccount">×${c}</span>`}
      <span class="cname">${ROLES[r].name}</span>
    </div>`)}
  </div>`;
}

function RoleEditor({ room }) {
  const { settings: s, preview } = room;
  const custom = s.custom || {};
  const set = (r, v) => settings({ custom: { ...custom, [r]: v } });
  const [info, setInfo] = useState(null);
  const villagers = custom.villageois ?? preview.comp.villageois ?? 0;
  const total = compositionCount(preview.comp);
  const remaining = preview.n - total;
  return html`<div class="role-editor">
    <div class="composition-total ${remaining === 0 ? 'complete' : ''}" role="status"><b>${total} / ${preview.n} cartes</b><span>${remaining === 0 ? 'Une carte pour chaque joueur.' : remaining > 0 ? `${remaining} carte${remaining > 1 ? 's' : ''} à attribuer.` : `${-remaining} carte${remaining < -1 ? 's' : ''} de trop.`}</span></div>
    <div class="re-item camp-loups">
      <button class="re-info" onClick=${() => setInfo('loup')}><${Emblem} role="loup" size=${40} /></button>
      <div class="re-text"><b>Loups-Garous</b><small>${ROLES.loup.tagline}</small></div>
      <${Stepper} label="loups-garous" value=${custom.loup || 0} max=${25} onChange=${(v) => set('loup', v)} />
    </div>
    <div class="re-item camp-village ${villagers ? 'on' : ''}">
      <button class="re-info" onClick=${() => setInfo('villageois')} aria-label="Détails Simple Villageois"><${Emblem} role="villageois" size=${40} /></button>
      <div class="re-text"><b>Simples Villageois</b><small>Choisissez le nombre de villageois sans pouvoir.</small></div>
      <${Stepper} label="villageois" value=${villagers} max=${50} onChange=${(v) => set('villageois', v)} />
    </div>
    ${SPECIAL_ROLES.map((r) => html`<div class="re-item camp-${ROLES[r].camp} ${custom[r] ? 'on' : ''}" key=${r}>
      <button class="re-info" onClick=${() => setInfo(r)} aria-label="Détails ${ROLES[r].name}"><${Emblem} role=${r} size=${40} /></button>
      <div class="re-text"><b>${ROLES[r].name}</b><small>${ROLES[r].tagline}</small></div>
      <${Toggle} checked=${!!custom[r]} onChange=${(v) => set(r, v ? 1 : 0)} label="" />
    </div>`)}
    <${Sheet} open=${!!info} onClose=${() => setInfo(null)} title=${info ? ROLES[info].name : ''} icon="card">
      ${info && html`<div class="role-detail"><${RoleCard} role=${info} size="md" /><p>${ROLES[info].desc}</p></div>`}
    </${Sheet}>
  </div>`;
}

const TIMER_FIELDS = [
  ['reveal', 'Découverte des cartes', 10, 120, 5],
  ['night', 'Action de nuit', 15, 120, 5],
  ['discussion', 'Débat du conseil', 30, 900, 15],
  ['vote', 'Vote du bûcher', 20, 240, 5],
  ['hunter', 'Tir du chasseur', 10, 90, 5],
];
const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ' ' + (s % 60) + ' s' : ''}` : `${s} s`);

function RulesPanel({ room }) {
  const s = room.settings;
  return html`<div class="rules">
    <${Toggle} checked=${s.hostPlays} onChange=${(v) => settings({ hostPlays: v })} label="Le meneur joue aussi" hint="Sinon, vous êtes narrateur et voyez tout le village." />
    <${Toggle} checked=${s.revealOnDeath} onChange=${(v) => settings({ revealOnDeath: v })} label="Révéler les cartes des défunts" />
    <${Toggle} checked=${s.deadSeeAll} onChange=${(v) => settings({ deadSeeAll: v })} label="Les morts voient tout" hint="Les fantômes découvrent tous les rôles (et se taisent !)." />
    <div class="timers">
      ${TIMER_FIELDS.map(([k, label, lo, hi, step]) => html`<label class="range" key=${k}>
        <span>${label}<b>${fmt(s.timers[k])}</b></span>
        <input type="range" min=${lo} max=${hi} step=${step} value=${s.timers[k]} onChange=${(e) => settings({ timers: { [k]: Number(e.currentTarget.value) } })} />
      </label>`)}
    </div>
  </div>`;
}

export function VoicePanel({ room }) {
  const stored = loadKey();
  const [key, setKey] = useState(stored.apiKey || '');
  const [voiceId, setVoiceId] = useState(room.voice.voiceId || stored.voiceId);
  const [model, setModel] = useState(room.voice.model || 'eleven_multilingual_v2');
  const [voices, setVoices] = useState([]);
  const [busy, setBusy] = useState(false);
  const isHost = room.isHost;

  useEffect(() => {
    if (!isHost) return;
    call('voice:list').then((r) => r.voices && setVoices(r.voices));
  }, [room.voice.configured]);

  const save = async () => {
    unlockAudio();
    saveKey({ apiKey: key.trim(), voiceId });
    await call('room:voice', { apiKey: key.trim(), voiceId, model });
    toast(key.trim() ? 'La voix du conteur est prête' : 'Narration ElevenLabs désactivée', 'ok');
  };
  const test = async () => {
    unlockAudio();
    setBusy(true);
    const r = await call('voice:test', {});
    setBusy(false);
    if (r.ok) playUrlOnce(r.audio, r.text);
  };
  const [deviceVoice, setDeviceVoice] = useState(!!audioPrefs.voice);
  const [amb, setAmb] = useState(!!audioPrefs.ambience);

  return html`<div class="voice-panel">
    <${Toggle} checked=${deviceVoice} onChange=${(v) => { unlockAudio(); audioPrefs.setVoice(v); setDeviceVoice(v); }} label="Narration sur cet appareil"
      hint="Conseil : activez-la sur un seul appareil posé au centre de la table." />
    <${Toggle} checked=${amb} onChange=${(v) => { unlockAudio(); audioPrefs.setAmbience(v); setAmb(v); }} label="Ambiance sonore" hint="Vent nocturne, cloche du village, battements de cœur." />
    ${isHost && html`<div class="eleven">
      <${Ornament}>ElevenLabs</${Ornament}>
      <p class="hint">Le conteur guide les réveils et les votes avec une voix posée. Sans clé, la voix française du navigateur prend le relais.</p>
      <label class="field"><span>Clé API ElevenLabs</span>
        <input class="text mono" type="password" autocomplete="off" value=${key} placeholder="sk_…" onInput=${(e) => setKey(e.currentTarget.value)} /></label>
      <label class="field"><span>Voix</span>
        <select class="text" value=${voiceId} onChange=${(e) => setVoiceId(e.currentTarget.value)}>
          ${(voices.length ? voices : [{ id: voiceId, name: voiceId }]).map((v) => html`<option value=${v.id}>${v.name}</option>`)}
        </select></label>
      <label class="field"><span>Modèle</span>
        <select class="text" value=${model} onChange=${(e) => setModel(e.currentTarget.value)}>
          <option value="eleven_multilingual_v2">Multilingual v2 — expressif</option>
          <option value="eleven_turbo_v2_5">Turbo v2.5 — rapide</option>
          <option value="eleven_flash_v2_5">Flash v2.5 — très rapide</option>
        </select></label>
      <div class="row gap">
        <button class="btn gold small" onClick=${save}>Enregistrer</button>
        <button class="btn ghost small" onClick=${test} disabled=${busy}><${Icon} name="voice" size=${16} />${busy ? 'Incantation…' : 'Écouter'}</button>
      </div>
      <p class="voice-status ${room.voice.error ? 'err' : room.voice.configured ? 'ok' : ''}">
        ${room.voice.error ? `⚠ ${room.voice.error} — repli sur la voix du navigateur.` : room.voice.configured ? '● Voix ElevenLabs active' : '○ Voix du navigateur (repli)'}
      </p>
      <p class="hint small">La clé n’est conservée que dans ce navigateur et dans la mémoire du serveur le temps de la partie.</p>
    </div>`}
  </div>`;
}

export function Lobby({ view, chats, writable, unread }) {
  const { room, you } = view;
  const [tab, setTab] = useState(null);
  const s = room.settings;
  const { comp, n, error } = room.preview;

  // Ré-envoie la clé mémorisée si le serveur a redémarré
  useEffect(() => {
    if (!room.isHost || room.voice.configured) return;
    const k = loadKey();
    if (k.apiKey) call('room:voice', { apiKey: k.apiKey, voiceId: k.voiceId });
  }, [room.isHost]);
  // Par défaut, la narration est active sur l'appareil du meneur uniquement
  useEffect(() => { if (audioPrefs.voice === null) audioPrefs.setVoice(room.isHost); }, []);

  const start = async () => { unlockAudio(); await call('room:start'); };

  return html`<main class="lobby screen-enter">
    <header class="lobby-head">
      <div class="lobby-identity"><img src="/img/brand/thiercelieux-emblem-transparent.webp" alt="" width="72" height="72" /><div>
        <p class="kicker">La taverne de Thiercelieux</p>
        <h1 class="h1">Le village se rassemble</h1>
      </div></div>
      <button class="icon-btn" onClick=${() => leaveRoom()} aria-label="Quitter le village" title="Quitter"><${Icon} name="door" /></button>
    </header>

    <section class="lobby-progress" aria-label="Préparation de la partie"><span class="active"><b>01</b> Invitez vos amis</span><span><b>02</b> Composez le village</span><span><b>03</b> Faites tomber la nuit</span></section>
    <div class="lobby-grid">
      <div class="col">
        <${CodeBanner} code=${room.code} />
        <${Roster} room=${room} you=${you} />
      </div>
      <div class="col">
        <section class="panel">
          <header class="panel-head">
            <h2><${Icon} name="card" />Les cartes du destin</h2>
            <span class="count">${n}<small> joueurs</small></span>
          </header>
          ${room.isHost && html`<nav class="seg small">
            <button class=${s.roleMode === 'auto' ? 'active' : ''} onClick=${() => settings({ roleMode: 'auto' })}>Équilibre automatique</button>
            <button class=${s.roleMode === 'custom' ? 'active' : ''} onClick=${() => settings({ roleMode: 'custom', custom: { ...s.custom, villageois: s.custom.villageois ?? finalizeComposition(s.custom, n).villageois ?? 0 } })}>Personnalisée</button>
          </nav>`}
          ${!room.isHost && html`<p class="hint">${s.roleMode === 'auto' ? 'Composition équilibrée automatiquement par le meneur.' : 'Composition choisie par le meneur.'}</p>`}
          <${CompositionView} comp=${comp} />
          <${BalanceGauge} comp=${comp} />
          <button class="link-btn" onClick=${() => setTab('grimoire')}><${Icon} name="book" size=${16} />Consulter le grimoire</button>
          ${room.isHost && s.roleMode === 'custom' && html`<${RoleEditor} room=${room} />`}
        </section>

        ${room.isHost && html`<section class="panel">
          <header class="panel-head"><h2><${Icon} name="gear" />Règles du village</h2></header>
          <${RulesPanel} room=${room} />
        </section>`}

        <section class="panel">
          <header class="panel-head"><h2><${Icon} name="voice" />La voix du conteur</h2></header>
          <${VoicePanel} room=${room} />
        </section>
      </div>
    </div>

    <div class="lobby-dock">
      <button aria-label="Ouvrir les murmures de la taverne" class="btn ghost dock-chat" onClick=${() => setTab('chat')}><${Icon} name="chat" />${unread ? html`<span class="badge">${unread}</span>` : null}</button>
      ${room.isHost
        ? html`<div class="start-wrap">
            ${error && html`<p class="start-error">${error}</p>`}
            <button class="btn blood big" disabled=${!!error} onClick=${start}><${Icon} name="moon" />Que la nuit tombe</button>
          </div>`
        : html`<p class="waiting"><span class="dots"><i></i><i></i><i></i></span>Le meneur prépare la veillée…</p>`}
    </div>

    <${Sheet} open=${tab === 'grimoire'} onClose=${() => setTab(null)} title="Le grimoire" icon="book" wide><${Grimoire} /></${Sheet}>
    <${Sheet} open=${tab === 'chat'} onClose=${() => setTab(null)} title="Murmures de la taverne" icon="chat">
      <${Chat} chats=${chats} writable=${writable} you=${you} />
    </${Sheet}>
  </main>`;
}
