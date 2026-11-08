import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { ROLES } from '/shared/roles.js';
import { RoleCard, Icon } from './ui.js';

const GROUPS = [['loups', 'La Meute'], ['village', 'Le Village'], ['solo', 'Les Solitaires']];
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function Grimoire() {
  const [query, setQuery] = useState('');
  const [camp, setCamp] = useState('all');
  const roles = Object.values(ROLES).filter((r) => (camp === 'all' || r.camp === camp) && normalize(`${r.name} ${r.tagline} ${r.desc}`).includes(normalize(query.trim())));
  return html`<div class="grimoire">
    <div class="grim-tools"><label class="field"><span>Rechercher un personnage ou un pouvoir</span><input class="text" type="search" value=${query} placeholder="Voyante, protection, meute…" onInput=${(e) => setQuery(e.currentTarget.value)} /></label>
      <nav class="grim-filters" aria-label="Filtrer par camp">${[['all', 'Tous les rôles'], ...GROUPS].map(([id, title]) => html`<button class=${camp === id ? 'active' : ''} aria-pressed=${camp === id} onClick=${() => setCamp(id)} key=${id}>${title}</button>`)}</nav>
      <p class="hint" role="status">${roles.length} personnage${roles.length > 1 ? 's' : ''}</p>
    </div>
    ${GROUPS.map(([id, title]) => {
      const group = roles.filter((r) => r.camp === id);
      return group.length ? html`<section key=${id}><h4 class="sub-title camp-${id}">${title}<span>${group.length}</span></h4><div class="grim-grid">${group.map((r) => html`<article class="grim-item" key=${r.id}><${RoleCard} role=${r.id} size="sm" /><div class="grim-text"><b>${r.name}</b><small>${r.tagline}</small><p>${r.desc}</p></div></article>`)}</div></section>` : null;
    })}
    ${!roles.length && html`<div class="grim-empty"><${Icon} name="book" size=${32} /><h3>Ce secret reste introuvable.</h3><p>Essayez un autre nom ou un autre camp.</p><button class="btn ghost" onClick=${() => { setQuery(''); setCamp('all'); }}>Réinitialiser la recherche</button></div>`}
  </div>`;
}
