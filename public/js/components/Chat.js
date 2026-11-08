// ─────────────────────────────────────────────────────────────
//  Murmures : chat multi-canaux (village, meute, cimetière, amants)
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { call, store } from '../net.js';
import { Seal } from './ui.js';

const CHANNELS = {
  village: { label: 'Place du village', closed: 'Le village dort : la place est déserte.' },
  loups: { label: 'Tanière', closed: 'La meute ne parle qu’à la nuit tombée.' },
  morts: { label: 'Cimetière', closed: 'Seuls les défunts murmurent ici.' },
  amoureux: { label: 'Amants', closed: 'Les amants se taisent.' },
};

export function Chat({ chats, writable, you }) {
  const available = Object.keys(CHANNELS).filter((c) => chats[c]);
  const [ch, setCh] = useState(available.includes('loups') ? 'loups' : 'village');
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const active = available.includes(ch) ? ch : available[0] || 'village';
  const msgs = chats[active] || [];
  const canWrite = writable.includes(active);

  useEffect(() => { store.set({ chatOpen: true, unread: 0 }); return () => store.set({ chatOpen: false }); }, []);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, active]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    const r = await call('chat:send', { ch: active, text: t });
    if (r.error) setText(t);
  };

  return html`<div class="chat">
    ${available.length > 1 && html`<nav class="chat-tabs" role="tablist">
      ${available.map((c) => html`<button role="tab" class="chat-tab ch-${c} ${c === active ? 'active' : ''}" aria-selected=${c === active} onClick=${() => setCh(c)}>${CHANNELS[c].label}</button>`)}
    </nav>`}
    <div class="chat-list ch-${active}" ref=${listRef}>
      ${msgs.length === 0 && html`<p class="chat-empty">Aucun murmure pour l’instant…</p>`}
      ${msgs.map((m) => html`<div key=${m.id} class="msg ${m.from === you ? 'mine' : ''} ${m.spy ? 'spy' : ''}">
        ${m.spy ? html`<span class="seal-ghost">?</span>` : html`<${Seal} name=${m.name} size=${28} />`}
        <div class="bubble"><b>${m.name}</b><span>${m.text}</span></div>
      </div>`)}
    </div>
    <form class="chat-form" onSubmit=${send}>
      <input value=${text} onInput=${(e) => setText(e.currentTarget.value)} maxlength="280" disabled=${!canWrite}
        placeholder=${canWrite ? (active === 'loups' ? 'Grognez à la meute…' : 'Murmurez…') : CHANNELS[active]?.closed} aria-label="Message" />
      <button class="btn small gold" disabled=${!canWrite || !text.trim()}>Envoyer</button>
    </form>
  </div>`;
}
