// ─────────────────────────────────────────────────────────────
//  Le bûcher : vote public et verdict
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect } from 'preact/hooks';
import { act } from '../net.js';
import { sfx } from '../audio.js';
import { VerdictFire } from '../components/VerdictFire.js';
import { Icon, PlayerGrid, RoleCard, Seal } from '../components/ui.js';
import { DeathReveal } from './Day.js';

function votersMap(game) {
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  const m = {};
  for (const [v, t] of Object.entries(game.dayVotes || {})) (m[t] ||= []).push(names[v]);
  if (game.ravenActive) (m[game.ravenActive] ||= []).unshift('🪶 Corbeau ×2');
  return m;
}

export function Vote({ game, you }) {
  const a = game.action;
  const voted = Object.keys(game.dayVotes || {}).length;
  const eligible = game.players.filter((p) => p.alive && !p.idiot).length;
  const vote = (id) => { sfx.tick(); act({ type: 'vote', target: a.current === id ? null : id }); };
  return html`<section class="stage vote-stage">
    <header class="stage-head">
      <p class="eyebrow">Jour ${game.dayNo} · ${voted} / ${eligible} voix exprimées</p>
      <h2 class="h2 blood-text">Le bûcher</h2>
      <p class="lede">${a?.type === 'vote' ? 'Désignez celui qui sera livré aux flammes. Vous pouvez changer d’avis jusqu’au dernier instant.'
        : a?.type === 'novote' ? 'L’Idiot du Village a perdu le droit de voter.' : 'Les vivants délibèrent…'}</p>
    </header>
    <${PlayerGrid} players=${game.players} you=${you}
      selectable=${a?.type === 'vote' ? new Set(a.targets) : null}
      selected=${a?.current ? [a.current] : []} onSelect=${vote}
      votes=${game.tally} voters=${votersMap(game)} />
  </section>`;
}

export function Verdict({ game }) {
  const v = game.verdict;
  useEffect(() => { if (v?.outcome === 'bucher' || v?.outcome === 'bouc') sfx.fire(); }, [v?.target]);
  if (!v) return null;
  const target = v.target && game.players.find((p) => p.id === v.target);
  return html`<section class="stage-center verdict-stage outcome-${v.outcome}">
    ${(v.outcome === 'bucher' || v.outcome === 'bouc') && html`<${VerdictFire} />`}
    <p class="eyebrow">Le verdict du conseil</p>
    ${v.outcome === 'bucher' && html`<h2 class="h2">${target?.name} monte sur le bûcher</h2><${DeathReveal} deaths=${game.lastDeaths} players=${game.players} />`}
    ${v.outcome === 'idiot' && html`<h2 class="h2">${target?.name} est épargné !</h2>
      <div class="death-card"><${RoleCard} role="idiot" size="sm" /></div>
      <p class="lede">Ce n’est que l’Idiot du Village. Le conseil lui laisse la vie… mais plus jamais sa voix.</p>`}
    ${v.outcome === 'bouc' && html`<h2 class="h2">Le village est divisé…</h2><p class="lede">Alors, comme le veut la coutume, c’est le Bouc Émissaire que l’on sacrifie.</p><${DeathReveal} deaths=${game.lastDeaths} players=${game.players} />`}
    ${v.outcome === 'tie' && html`<h2 class="h2">Le village est divisé</h2><p class="lede">Égalité des voix : personne ne montera sur le bûcher aujourd’hui.</p>`}
    ${v.outcome === 'none' && html`<h2 class="h2">Le silence du conseil</h2><p class="lede">Aucune voix ne s’est élevée. Personne n’est condamné.</p>`}
  </section>`;
}
