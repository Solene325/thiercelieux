// ─────────────────────────────────────────────────────────────
//  Moteur de jeu — autorité unique côté serveur
// ─────────────────────────────────────────────────────────────
import { ROLES, NIGHT_ORDER, STEP_LABELS, DEATH_CAUSES, WOLF_ROLES } from '../shared/roles.js';
import { LINES, SLEEP_LINES } from './narration.js';

const SPEED = Number(process.env.GAME_SPEED_FACTOR) || 1; // < 1 pour accélérer (tests)
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  /**
   * @param room  Room hôte (fournit noms, diffusion, narration)
   * @param ids   identifiants des joueurs recevant une carte
   * @param composition { roleId: count }
   */
  constructor(room, ids, composition) {
    this.room = room;
    this.settings = structuredClone(room.settings);
    this.composition = composition;
    const deck = shuffle(Object.entries(composition).flatMap(([r, c]) => Array(c).fill(r)));
    this.order = shuffle(ids);
    this.roles = {};
    this.order.forEach((id, i) => (this.roles[id] = deck[i]));
    this.alive = new Set(ids);

    this.phase = 'reveal';
    this.step = null;
    this.nightNo = 0;
    this.dayNo = 0;
    this.deadline = null;
    this.timer = null;
    this.timerCb = null;

    this.ready = new Set();
    this.acted = new Set(); // joueurs ayant agi pendant l'étape courante
    this.lovers = null;
    this.houndChoice = null;
    this.potions = { life: true, death: true };
    this.guardLast = null;
    this.elderLives = 1;
    this.idiotRevealed = new Set();
    this.ravenNext = null;
    this.ravenActive = null;
    this.wolfVotes = {};
    this.dayVotes = {};
    this.n = {}; // données de la nuit courante
    this.spy = { active: false };
    this.knowledge = {}; // viewer -> { target: roleId }
    this.notes = {}; // viewer -> [{ at, text, tone }]
    this.chronicle = []; // journal public
    this.deaths = []; // { id, cause, role, when }
    this.lastDeaths = [];
    this.pendingHunters = [];
    this.hunter = null;
    this.hunterShot = null;
    this.verdict = null;
    this.winner = null;
    this.steps = [];
    this.stepIndex = -1;
    // Nouveaux rôles
    this.foxPower = true;
    this.wildModel = null;
    this.wildWolf = false;
    this.infected = new Set();
    this.infectUsed = false;
    this.wolfDied = false;
    this.charmed = new Set();
    this.priestUsed = false;
    this.rustyPending = null;
    this.bearGrowl = null;
    this.angelWin = null;
    this.rustyArmedNight = null;
  }

  // ── Utilitaires ────────────────────────────────────────────
  name(id) { return this.room.nameOf(id); }
  role(id) { return this.roles[id]; }
  isAlive(id) { return this.alive.has(id); }
  inGame(id) { return id in this.roles; }
  aliveIds() { return this.order.filter((id) => this.alive.has(id)); }
  isWolf(id) {
    const r = this.roles[id];
    return WOLF_ROLES.includes(r)
      || (r === 'chien_loup' && this.houndChoice === 'loup')
      || (r === 'enfant_sauvage' && this.wildWolf)
      || this.infected.has(id);
  }
  /** Voisins vivants de table (ordre circulaire). */
  neighbors(id) {
    const alive = this.order.filter((x) => this.alive.has(x) || x === id);
    const i = alive.indexOf(id);
    if (alive.length < 2) return [];
    const left = alive[(i - 1 + alive.length) % alive.length];
    const right = alive[(i + 1) % alive.length];
    return [...new Set([left, right])].filter((x) => x !== id);
  }
  aliveWithRole(roleId) { return this.aliveIds().filter((id) => this.roles[id] === roleId); }
  hasRole(roleId) { return (this.composition[roleId] || 0) > 0; }
  learn(viewer, target, roleId) { (this.knowledge[viewer] ||= {})[target] = roleId; }
  note(viewer, text, tone = 'info') {
    (this.notes[viewer] ||= []).push({ at: Date.now(), text, tone, label: this.stamp() });
  }
  stamp() {
    if (this.phase === 'night' || this.phase === 'reveal') return `Nuit ${Math.max(1, this.nightNo)}`;
    return `Jour ${Math.max(1, this.dayNo)}`;
  }
  chron(text, tone = 'info') { this.chronicle.push({ at: Date.now(), text, tone, label: this.stamp() }); }
  sync() { this.room.emitState(); }

  setTimer(seconds, cb) {
    this.clearTimer();
    seconds *= SPEED;
    this.deadline = Date.now() + seconds * 1000;
    this.timerCb = cb;
    this.timer = setTimeout(() => { this.timer = null; this.timerCb = null; cb(); }, seconds * 1000);
  }
  /** Avance immédiatement (bouton « Passer » du meneur). */
  skip() {
    if (!this.timerCb) return;
    const cb = this.timerCb;
    this.clearTimer();
    cb();
  }
  /** Raccourcit le compte à rebours (sans le rallonger). */
  hurry(seconds) {
    if (!this.timerCb) return;
    const remaining = this.deadline - Date.now();
    if (remaining <= seconds * SPEED * 1000) return;
    this.setTimer(seconds, this.timerCb);
  }
  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.timerCb = null;
    this.deadline = null;
  }
  destroy() { this.clearTimer(); this.phase = 'destroyed'; }
  setPhase(phase, step = null) {
    this.phase = phase;
    this.step = step;
    this.acted = new Set();
    this.room.onPhaseChange();
  }

  // ── Déroulement ────────────────────────────────────────────
  start() {
    const sisters = this.order.filter((id) => this.roles[id] === 'soeur');
    for (const a of sisters) for (const b of sisters) if (a !== b) {
      this.learn(a, b, 'soeur');
    }
    for (const a of sisters) {
      const others = sisters.filter((b) => b !== a).map((b) => this.name(b));
      if (others.length) this.note(a, `Votre sœur est ${others.join(' et ')}. Vous pouvez lui faire confiance.`, 'love');
    }
    this.setPhase('reveal');
    this.room.narrate(LINES.intro);
    this.setTimer(this.settings.timers.reveal, () => this.startNight());
    this.sync();
  }

  startNight() {
    this.nightNo++;
    this.n = { wolfVictim: null, guardTarget: null, witchSave: false, witchKill: null, whiteKill: null, gmlKill: null, priestKill: null, priestSelf: false, infectedNow: null };
    this.wolfVotes = {};
    this.spy = { active: false };
    this.verdict = null;
    this.hunterShot = null;
    this.lastDeaths = [];
    this.steps = NIGHT_ORDER.filter((s) => {
      if (s === 'loups') return true;
      if (s === 'cupidon' || s === 'chien_loup' || s === 'enfant_sauvage') return this.nightNo === 1 && this.hasRole(s);
      if (s === 'loup_blanc') return this.nightNo % 2 === 0 && this.hasRole(s);
      if (s === 'grand_mechant_loup') return this.hasRole(s) && !this.wolfDied;
      if (s === 'infect') return this.hasRole(s) && !this.infectUsed;
      if (s === 'pretre') return this.hasRole(s) && !this.priestUsed;
      return this.hasRole(s);
    });
    this.stepIndex = -1;
    this.setPhase('night', 'endormissement');
    this.chron(`La nuit ${this.nightNo} tombe sur Thiercelieux.`, 'night');
    const t = this.room.narrate(LINES.nightFalls);
    this.setTimer(t + 3, () => this.nextStep());
    this.sync();
  }

  actorsFor(step) {
    if (step === 'loups') return this.aliveIds().filter((id) => this.isWolf(id));
    if (step === 'renard' && !this.foxPower) return [];
    if (step === 'pretre' && this.priestUsed) return [];
    if (step === 'infect' && (this.infectUsed || !this.n.wolfVictim || !this.isAlive(this.n.wolfVictim))) return [];
    if (step === 'joueur_flute' && this.uncharmedFor(this.aliveWithRole('joueur_flute')[0]).length === 0) return [];
    return this.aliveWithRole(step);
  }
  uncharmedFor(piper) {
    return piper ? this.aliveIds().filter((id) => id !== piper && !this.charmed.has(id)) : [];
  }

  nextStep() {
    this.stepIndex++;
    if (this.stepIndex >= this.steps.length) return this.dawn();
    const step = this.steps[this.stepIndex];
    this.setPhase('night', step);
    const t = this.room.narrate(LINES[step]);
    const actors = this.actorsFor(step);
    if (step === 'loup_blanc' && actors.length && !this.aliveIds().some((id) => this.isWolf(id) && this.roles[id] !== 'loup_blanc')) {
      // Plus aucun loup à trahir : simple temps mort
      this.setTimer(t + rand(4, 7), () => this.endStep());
    } else if (actors.length === 0) {
      // Le rôle est mort : on simule un temps d'action pour ne rien trahir
      this.setTimer(t + rand(5, 9), () => this.endStep());
    } else {
      this.setTimer(this.settings.timers.night + t, () => this.endStep(true));
    }
    this.sync();
  }

  endStep(timedOut = false) {
    const step = this.step;
    if (step === 'loups') this.resolveWolves();
    if (step === 'chien_loup' && !this.houndChoice) {
      this.houndChoice = 'village';
      const [h] = this.aliveWithRole('chien_loup');
      if (h && timedOut) this.note(h, 'Faute de choix, vous restez un fidèle compagnon du village.', 'info');
    }
    this.clearTimer();
    this.setPhase('night', 'transition');
    const t = SLEEP_LINES[step] ? this.room.narrate(SLEEP_LINES[step]) : 0;
    this.sync();
    this.setTimer(Math.max(3, t + 1.2), () => this.nextStep());
  }

  /** Une étape où un seul acteur doit agir se clôt dès qu'il a agi. */
  completeIfDone() {
    const actors = this.actorsFor(this.step);
    if (actors.length && actors.every((id) => this.acted.has(id))) this.setTimer(2.5, () => this.endStep());
  }

  // ── Actions des joueurs ────────────────────────────────────
  act(pid, a) {
    if (!a || typeof a !== 'object') return 'Action invalide';
    const t = a.type;
    if (t === 'ready') return this.actReady(pid);
    if (!this.inGame(pid)) return 'Vous ne participez pas à cette partie';
    const alive = this.isAlive(pid);
    const role = this.roles[pid];

    if (this.phase === 'night') {
      if (t === 'spy') return this.actSpy(pid);
      if (!alive) return 'Les morts ne se réveillent plus';
      const step = this.step;
      const actors = this.actorsFor(step);
      if (!actors.includes(pid)) return "Ce n'est pas votre tour";
      if (step !== 'loups' && this.acted.has(pid)) return 'Vous avez déjà agi cette nuit';
      switch (step) {
        case 'cupidon': return this.actCupid(pid, a);
        case 'chien_loup': return this.actHound(pid, a);
        case 'salvateur': return this.actGuard(pid, a);
        case 'voyante': return this.actSeer(pid, a);
        case 'loups': return this.actWolf(pid, a);
        case 'loup_blanc': return this.actWhite(pid, a);
        case 'sorciere': return this.actWitch(pid, a);
        case 'corbeau': return this.actRaven(pid, a);
        case 'enfant_sauvage': return this.actWild(pid, a);
        case 'renard': return this.actFox(pid, a);
        case 'infect': return this.actInfect(pid, a);
        case 'grand_mechant_loup': return this.actBigBad(pid, a);
        case 'pretre': return this.actPriest(pid, a);
        case 'joueur_flute': return this.actPiper(pid, a);
        default: return "Ce n'est pas le moment";
      }
    }
    if (this.phase === 'hunter') {
      if (pid !== this.hunter || this.hunterShot) return "Ce n'est pas votre tour";
      return this.actHunter(pid, a);
    }
    if (this.phase === 'day' && t === 'callVote') {
      if (!alive) return 'Les morts ne votent pas';
      this.ready.add(pid);
      const voters = this.aliveIds();
      if (this.ready.size > voters.length / 2) {
        this.chron('Le conseil réclame le vote.', 'day');
        this.startVote();
      }
      this.sync();
      return null;
    }
    if (this.phase === 'vote' && t === 'vote') return this.actVote(pid, a, role);
    return "Ce n'est pas le moment";
  }

  actReady(pid) {
    if (this.phase !== 'reveal') return null;
    this.ready.add(pid);
    const players = this.order;
    if (players.every((id) => this.ready.has(id) || !this.room.isConnected(id))) this.hurry(2.5);
    this.sync();
    return null;
  }

  validTarget(id, { self = null, allowSelf = true } = {}) {
    return typeof id === 'string' && this.isAlive(id) && (allowSelf || id !== self);
  }

  actCupid(pid, a) {
    const [x, y] = Array.isArray(a.targets) ? a.targets : [];
    if (!this.validTarget(x) || !this.validTarget(y) || x === y) return 'Désignez deux joueurs vivants distincts';
    this.lovers = [x, y];
    this.acted.add(pid);
    this.note(pid, `Vos flèches ont uni ${this.name(x)} et ${this.name(y)}.`, 'love');
    this.learnLovers();
    for (const [a1, b1] of [[x, y], [y, x]]) {
      this.note(a1, `Une flèche vous a transpercé le cœur : vous êtes éperdument amoureux de ${this.name(b1)}, qui est ${ROLES[this.roles[b1]].name}. Si l'un meurt, l'autre le suit.`, 'love');
    }
    this.completeIfDone();
    this.sync();
    return null;
  }

  learnLovers() {
    const [x, y] = this.lovers;
    this.learn(x, y, this.roles[y]);
    this.learn(y, x, this.roles[x]);
  }

  actHound(pid, a) {
    if (a.choice !== 'loup' && a.choice !== 'village') return 'Choix invalide';
    this.houndChoice = a.choice;
    this.acted.add(pid);
    this.note(pid, a.choice === 'loup'
      ? 'Vous répondez à l’appel de la lune : vous rejoignez la meute. Vous vous réveillerez avec les Loups-Garous dès cette nuit.'
      : 'Vous restez fidèle au village. Vos crocs défendront Thiercelieux.', a.choice === 'loup' ? 'blood' : 'info');
    if (a.choice === 'loup') {
      for (const w of this.aliveIds().filter((id) => this.isWolf(id) && id !== pid)) {
        this.note(w, `${this.name(pid)}, le Chien-Loup, a rejoint la meute.`, 'blood');
      }
    }
    this.completeIfDone();
    this.sync();
    return null;
  }

  actGuard(pid, a) {
    if (a.target === null) { this.acted.add(pid); this.guardLast = null; this.completeIfDone(); this.sync(); return null; }
    if (!this.validTarget(a.target)) return 'Cible invalide';
    if (a.target === this.guardLast) return 'Vous ne pouvez protéger la même personne deux nuits de suite';
    this.n.guardTarget = a.target;
    this.guardLast = a.target;
    this.acted.add(pid);
    this.note(pid, `Vous veillez cette nuit sur ${this.name(a.target)}.`, 'info');
    this.completeIfDone();
    this.sync();
    return null;
  }

  actSeer(pid, a) {
    if (!this.validTarget(a.target, { self: pid, allowSelf: false })) return 'Cible invalide';
    const r = this.roles[a.target];
    this.learn(pid, a.target, r);
    this.acted.add(pid);
    this.n.seerLook = { target: a.target, role: r };
    this.note(pid, `Votre boule de cristal révèle ${this.name(a.target)} : ${ROLES[r].name}${r === 'chien_loup' ? (this.houndChoice === 'loup' ? ' (rallié à la meute)' : ' (fidèle au village)') : ''}.`, ROLES[r].camp === 'village' && !this.isWolf(a.target) ? 'info' : 'blood');
    this.sync();
    // On laisse quelques secondes pour contempler la vision
    this.setTimer(4.5, () => this.endStep());
    return null;
  }

  actWolf(pid, a) {
    if (a.target !== null && (!this.validTarget(a.target) || this.isWolf(a.target))) return 'La meute ne peut dévorer cette cible';
    if (a.target === null) delete this.wolfVotes[pid];
    else this.wolfVotes[pid] = a.target;
    const wolves = this.actorsFor('loups');
    const votes = wolves.map((w) => this.wolfVotes[w]).filter(Boolean);
    if (votes.length === wolves.length && new Set(votes).size === 1) this.hurry(3);
    this.sync();
    return null;
  }

  resolveWolves() {
    const wolves = this.actorsFor('loups');
    const tally = {};
    for (const w of wolves) {
      const t = this.wolfVotes[w];
      if (t && this.isAlive(t)) tally[t] = (tally[t] || 0) + 1;
    }
    const max = Math.max(0, ...Object.values(tally));
    if (max === 0) { this.n.wolfVictim = null; return; }
    const top = Object.keys(tally).filter((k) => tally[k] === max);
    this.n.wolfVictim = pick(top);
    for (const w of wolves) this.note(w, `La meute a choisi : ${this.name(this.n.wolfVictim)} sera dévoré${top.length > 1 ? ' (le sort a départagé la meute)' : ''}.`, 'blood');
  }

  actSpy(pid) {
    if (this.step !== 'loups' || this.roles[pid] !== 'petite_fille' || !this.isAlive(pid)) return "Ce n'est pas le moment";
    if (this.spy.active) return null;
    this.spy.active = true;
    this.room.onSpy(pid);
    const wolves = this.actorsFor('loups');
    const found = Math.random() < 0.35 && wolves.length ? pick(wolves) : null;
    if (found) {
      this.learn(pid, found, 'loup');
      this.note(pid, `Entre deux volets, vous apercevez un visage déformé par la lune… c'est ${this.name(found)} !`, 'blood');
    } else {
      this.note(pid, 'Vous entrouvrez les yeux… des ombres, des murmures, mais aucun visage.', 'info');
    }
    if (Math.random() < 0.2) {
      for (const w of wolves) {
        this.learn(w, pid, 'petite_fille');
        this.note(w, `Un craquement… La Petite Fille vous espionne : c'est ${this.name(pid)} !`, 'blood');
      }
      this.note(pid, 'Un loup a tourné la tête vers vous… Vous avez peut-être été surprise.', 'blood');
    }
    this.sync();
    return null;
  }

  actWhite(pid, a) {
    if (a.target === null) { this.acted.add(pid); this.completeIfDone(); this.sync(); return null; }
    if (!this.validTarget(a.target, { self: pid, allowSelf: false }) || !this.isWolf(a.target)) return 'Vous ne pouvez dévorer qu’un loup';
    this.n.whiteKill = a.target;
    this.acted.add(pid);
    this.note(pid, `Vous vous jetez sur ${this.name(a.target)} dans l'obscurité…`, 'blood');
    this.completeIfDone();
    this.sync();
    return null;
  }

  actWitch(pid, a) {
    const save = !!a.save;
    const kill = a.kill || null;
    if (save && (!this.potions.life || !this.n.wolfVictim)) return 'Potion de résurrection indisponible';
    if (kill && (!this.potions.death || !this.validTarget(kill))) return 'Potion de mort indisponible';
    if (save) {
      this.potions.life = false;
      this.n.witchSave = true;
      this.note(pid, `Vous versez la Potion de résurrection sur ${this.name(this.n.wolfVictim)}.`, 'life');
    }
    if (kill) {
      this.potions.death = false;
      this.n.witchKill = kill;
      this.note(pid, `Vous versez la Potion de mort dans le gobelet de ${this.name(kill)}.`, 'blood');
    }
    this.acted.add(pid);
    this.completeIfDone();
    this.sync();
    return null;
  }

  actRaven(pid, a) {
    if (a.target === null) { this.acted.add(pid); this.completeIfDone(); this.sync(); return null; }
    if (!this.validTarget(a.target)) return 'Cible invalide';
    this.ravenNext = a.target;
    this.acted.add(pid);
    this.note(pid, `Vous avez désigné ${this.name(a.target)} : il commencera le conseil avec deux voix contre lui.`, 'info');
    this.completeIfDone();
    this.sync();
    return null;
  }

  actWild(pid, a) {
    if (!this.validTarget(a.target, { self: pid, allowSelf: false })) return 'Choisissez un modèle';
    this.wildModel = a.target;
    this.acted.add(pid);
    this.note(pid, `${this.name(a.target)} sera votre modèle. Tant qu'il vit, vous restez parmi les hommes…`, 'info');
    this.completeIfDone();
    this.sync();
    return null;
  }

  actFox(pid, a) {
    if (!this.validTarget(a.target)) return 'Cible invalide';
    const group = [a.target, ...this.neighbors(a.target)];
    const found = group.some((id) => this.isWolf(id));
    const names = group.map((id) => this.name(id)).join(', ');
    this.acted.add(pid);
    if (found) this.note(pid, `Votre flair s'affole : il y a au moins un loup parmi ${names}.`, 'blood');
    else {
      this.foxPower = false;
      this.note(pid, `Aucune odeur de loup parmi ${names}… Votre flair vous abandonne à jamais.`, 'info');
    }
    this.n.foxResult = { group, found };
    this.sync();
    this.setTimer(4.5, () => this.endStep());
    return null;
  }

  actInfect(pid, a) {
    const victim = this.n.wolfVictim;
    this.acted.add(pid);
    if (a.infect && victim && this.isAlive(victim)) {
      this.infectUsed = true;
      this.infected.add(victim);
      this.n.wolfVictim = null;
      this.n.infectedNow = victim;
      this.note(pid, `Vous plantez vos crocs dans la chair de ${this.name(victim)}… sans l'achever. Il est désormais des vôtres.`, 'blood');
      this.note(victim, "Cette nuit, une morsure vous a transformé. Vous êtes désormais un loup-garou : vous vous réveillerez avec la meute (vous conservez vos pouvoirs).", 'blood');
      for (const w of this.aliveIds().filter((id) => this.isWolf(id) && id !== pid && id !== victim)) {
        this.note(w, `${this.name(victim)} a été infecté : il rejoint la meute.`, 'blood');
      }
    }
    this.completeIfDone();
    this.sync();
    return null;
  }

  actBigBad(pid, a) {
    if (a.target === null) { this.acted.add(pid); this.completeIfDone(); this.sync(); return null; }
    if (!this.validTarget(a.target) || this.isWolf(a.target) || a.target === this.n.wolfVictim) return 'Cible invalide';
    this.n.gmlKill = a.target;
    this.acted.add(pid);
    this.note(pid, `Votre faim se porte sur ${this.name(a.target)}…`, 'blood');
    this.completeIfDone();
    this.sync();
    return null;
  }

  actPriest(pid, a) {
    if (a.target === null) { this.acted.add(pid); this.completeIfDone(); this.sync(); return null; }
    if (!this.validTarget(a.target, { self: pid, allowSelf: false })) return 'Cible invalide';
    this.priestUsed = true;
    this.acted.add(pid);
    if (this.isWolf(a.target)) this.n.priestKill = a.target;
    else this.n.priestSelf = true;
    this.note(pid, `Vous aspergez ${this.name(a.target)} d'eau bénite… L'aube dira si le Ciel vous approuve.`, 'info');
    this.completeIfDone();
    this.sync();
    return null;
  }

  actPiper(pid, a) {
    const pool = this.uncharmedFor(pid);
    const need = Math.min(2, pool.length);
    const t = Array.isArray(a.targets) ? [...new Set(a.targets)] : [];
    if (t.length !== need || !t.every((id) => pool.includes(id))) return `Envoûtez ${need} joueur${need > 1 ? 's' : ''} non charmé${need > 1 ? 's' : ''}`;
    t.forEach((id) => this.charmed.add(id));
    this.acted.add(pid);
    this.note(pid, `Votre mélodie envoûte ${t.map((id) => this.name(id)).join(' et ')}.`, 'info');
    const all = [...this.charmed].filter((id) => this.isAlive(id));
    for (const id of t) this.note(id, `Une mélodie lointaine vous envoûte… Vous êtes sous le charme du Joueur de Flûte, comme ${all.filter((x) => x !== id).map((x) => this.name(x)).join(', ') || 'personne d’autre pour l’instant'}.`, 'love');
    this.completeIfDone();
    this.sync();
    return null;
  }

  actHunter(pid, a) {
    if (a.target !== null && !this.validTarget(a.target, { self: pid, allowSelf: false })) return 'Cible invalide';
    this.resolveHunter(a.target);
    return null;
  }

  actVote(pid, a, role) {
    if (!this.isAlive(pid)) return 'Les morts ne votent pas';
    if (this.idiotRevealed.has(pid)) return "L'Idiot du village a perdu son droit de vote";
    if (a.target === null) delete this.dayVotes[pid];
    else if (!this.validTarget(a.target)) return 'Cible invalide';
    else this.dayVotes[pid] = a.target;
    const voters = this.voters();
    if (voters.every((v) => this.dayVotes[v])) this.hurry(5);
    this.sync();
    return null;
  }

  voters() { return this.aliveIds().filter((id) => !this.idiotRevealed.has(id)); }

  // ── Morts ──────────────────────────────────────────────────
  kill(id, cause) {
    if (!this.isAlive(id)) return;
    if (this.isWolf(id)) this.wolfDied = true;
    if (this.roles[id] === 'chevalier' && cause === 'loups') {
      const n = this.order.length;
      const i = this.order.indexOf(id);
      for (let k = 1; k < n; k++) {
        const c = this.order[(i + k) % n];
        if (this.isAlive(c) && this.isWolf(c)) { this.rustyPending = c; break; }
      }
    }
    this.alive.delete(id);
    const entry = { id, cause, role: this.roles[id], when: this.stamp() };
    this.deaths.push(entry);
    this.lastDeaths.push(entry);
    this.chron(`${this.name(id)} — ${DEATH_CAUSES[cause]}${this.settings.revealOnDeath ? ` (${ROLES[this.roles[id]].name})` : ''}.`, 'death');
    if (this.roles[id] === 'chasseur') this.pendingHunters.push(id);
    if (id === this.wildModel && !this.wildWolf) {
      const [wild] = this.aliveWithRole('enfant_sauvage');
      if (wild) {
        this.wildWolf = true;
        this.note(wild, `Votre modèle, ${this.name(id)}, est mort. La sauvagerie vous reprend : vous rejoignez la meute.`, 'blood');
        for (const w of this.aliveIds().filter((x) => this.isWolf(x) && x !== wild)) this.note(w, `${this.name(wild)}, l'Enfant Sauvage, rejoint la meute.`, 'blood');
      }
    }
    if (this.lovers?.includes(id)) {
      const other = this.lovers.find((x) => x !== id);
      this.kill(other, 'chagrin');
    }
  }

  dawn() {
    this.lastDeaths = [];
    const { wolfVictim, guardTarget, witchSave, witchKill, whiteKill } = this.n;
    if (wolfVictim && this.isAlive(wolfVictim) && wolfVictim !== guardTarget && !witchSave) {
      if (this.roles[wolfVictim] === 'ancien' && this.elderLives > 0) {
        this.elderLives--;
        this.note(wolfVictim, 'Les crocs de la meute vous ont lacéré… mais vous avez survécu. Une seconde attaque vous sera fatale.', 'blood');
      } else this.kill(wolfVictim, 'loups');
    }
    const { gmlKill, priestKill, priestSelf } = this.n;
    if (gmlKill && gmlKill !== guardTarget) this.kill(gmlKill, 'gml');
    if (witchKill) this.kill(witchKill, 'sorciere');
    if (whiteKill) this.kill(whiteKill, 'loup_blanc');
    if (priestKill) this.kill(priestKill, 'eau_benite');
    if (priestSelf) { const [pr] = this.aliveWithRole('pretre'); if (pr) this.kill(pr, 'sacrilege'); }
    if (this.rustyPending && this.rustyArmedNight != null && this.rustyArmedNight < this.nightNo) {
      this.kill(this.rustyPending, 'rouille');
      this.rustyPending = null;
      this.rustyArmedNight = null;
    }
    if (this.rustyPending && this.rustyArmedNight == null) this.rustyArmedNight = this.nightNo;
    this.setPhase('dawn');
    let t;
    if (this.lastDeaths.length === 0) {
      this.chron('Personne n’est mort cette nuit.', 'day');
      t = this.room.narrate(LINES.dawnNone);
    } else {
      const names = this.lastDeaths.map((d) => this.name(d.id));
      t = this.room.narrate(`${LINES.dawnIntro} Cette nuit, ${listFr(names)} ${names.length > 1 ? 'ont' : 'a'} trouvé la mort.`);
    }
    // Le coq chante (~4 s) avant la narration côté client
    this.setTimer(t + 8 + this.lastDeaths.length * 3.5, () => this.afterDeaths('day'));
    this.sync();
  }

  afterDeaths(next) {
    if (this.angelWin) return this.checkWin();
    if (this.pendingHunters.length) return this.hunterPhase(next);
    if (this.checkWin()) return;
    if (next === 'day') this.startDay();
    else this.startNight();
  }

  hunterPhase(next) {
    this.hunter = this.pendingHunters.shift();
    this.hunterShot = null;
    this.hunterNext = next;
    this.lastDeaths = [];
    this.setPhase('hunter');
    const t = this.room.narrate(LINES.hunter);
    this.setTimer(this.settings.timers.hunter + t, () => this.resolveHunter(null));
    this.sync();
  }

  resolveHunter(target) {
    this.clearTimer();
    this.lastDeaths = [];
    this.hunterShot = { hunter: this.hunter, target };
    let t;
    if (target) {
      this.kill(target, 'chasseur');
      t = this.room.narrate(`Un coup de feu déchire le silence… ${this.name(target)} s'effondre.`);
    } else {
      this.chron(`Le Chasseur ${this.name(this.hunter)} meurt sans tirer.`, 'death');
      t = this.room.narrate('Le Chasseur rend son dernier souffle… sans tirer.');
    }
    this.sync();
    this.setTimer(t + 4, () => this.afterDeaths(this.hunterNext));
  }

  // ── Jour ───────────────────────────────────────────────────
  startDay() {
    this.dayNo++;
    this.ready = new Set();
    this.dayVotes = {};
    this.ravenActive = this.ravenNext && this.isAlive(this.ravenNext) ? this.ravenNext : null;
    this.ravenNext = null;
    this.lastDeaths = [];
    this.verdict = null;
    this.hunterShot = null;
    this.setPhase('day');
    this.chron(`Le conseil des villageois se réunit (jour ${this.dayNo}).`, 'day');
    let line = LINES.council;
    this.bearGrowl = null;
    const [tamer] = this.aliveWithRole('montreur_ours');
    if (tamer) {
      this.bearGrowl = this.neighbors(tamer).some((id) => this.isWolf(id));
      this.chron(this.bearGrowl ? "Grrr… L'ours du montreur grogne !" : "L'ours du montreur reste paisible.", this.bearGrowl ? 'blood' : 'day');
      line = (this.bearGrowl ? "Grrr… L'ours du montreur grogne ! Un loup rôde tout près de lui. " : "L'ours du montreur reste paisible. ") + line;
    }
    if (this.ravenActive) line += ` Le Corbeau a désigné ${this.name(this.ravenActive)}.`;
    const t = this.room.narrate(line);
    this.setTimer(this.settings.timers.discussion + t, () => this.startVote());
    this.sync();
  }

  startVote() {
    this.dayVotes = {};
    this.setPhase('vote');
    const t = this.room.narrate(LINES.vote);
    this.setTimer(this.settings.timers.vote + t, () => this.resolveVote());
    this.sync();
  }

  tally() {
    const t = {};
    for (const [v, target] of Object.entries(this.dayVotes)) {
      if (this.isAlive(v) && this.isAlive(target) && !this.idiotRevealed.has(v)) t[target] = (t[target] || 0) + 1;
    }
    if (this.ravenActive && this.isAlive(this.ravenActive)) t[this.ravenActive] = (t[this.ravenActive] || 0) + 2;
    return t;
  }

  resolveVote() {
    this.clearTimer();
    const tally = this.tally();
    const max = Math.max(0, ...Object.values(tally));
    const top = Object.keys(tally).filter((k) => tally[k] === max);
    this.lastDeaths = [];
    let outcome;
    let target = null;
    if (max === 0) outcome = 'none';
    else if (top.length > 1) {
      const [goat] = this.aliveWithRole('bouc');
      if (goat) { outcome = 'bouc'; target = goat; } else outcome = 'tie';
    } else {
      target = top[0];
      if (this.roles[target] === 'idiot' && !this.idiotRevealed.has(target)) {
        outcome = 'idiot';
        this.idiotRevealed.add(target);
        for (const id of this.order) this.learn(id, target, 'idiot');
        this.chron(`${this.name(target)} est mené au bûcher… mais c'est l'Idiot du Village ! Il est épargné et perd son droit de vote.`, 'day');
      } else outcome = 'bucher';
    }
    this.verdict = { outcome, target, tally, votes: { ...this.dayVotes } };
    this.setPhase('verdict');
    let t = 4;
    const say = (x) => (t = this.room.narrate(x));
    if (outcome === 'bouc') {
      this.kill(target, 'bouc');
      say(`Le village est divisé… Alors, comme le veut la coutume, c'est le Bouc Émissaire, ${this.name(target)}, que l'on sacrifie.`);
    } else if (outcome === 'bucher') {
      if (this.roles[target] === 'ange' && this.dayNo === 1) this.angelWin = target;
      this.kill(target, 'bucher');
      say(`Le village a tranché. ${this.name(target)} monte sur le bûcher${this.settings.revealOnDeath ? `… c'était ${articleRole(this.roles[target])}` : ''}.`);
    } else if (outcome === 'idiot') {
      say(`Le village a désigné ${this.name(target)}… mais ce n'est que l'Idiot du Village ! On l'épargne, mais il ne votera plus.`);
    } else if (outcome === 'tie') {
      this.chron('Égalité au conseil : personne ne monte sur le bûcher.', 'day');
      say(LINES.tie);
    } else {
      this.chron('Aucun vote : personne n’est condamné.', 'day');
      say(LINES.noVote);
    }
    this.setTimer(t + (outcome === 'bucher' || outcome === 'bouc' ? 6 : 3), () => this.afterDeaths('night'));
    this.sync();
  }

  // ── Victoire ───────────────────────────────────────────────
  checkWin() {
    const alive = this.aliveIds();
    let w = null;
    const wolves = alive.filter((id) => this.isWolf(id));
    const white = alive.filter((id) => this.roles[id] === 'loup_blanc');
    const lovers = this.lovers;
    const mixedLovers = lovers && this.isWolf(lovers[0]) !== this.isWolf(lovers[1]);
    const [piper] = alive.filter((id) => this.roles[id] === 'joueur_flute');
    if (this.angelWin) w = { camp: 'ange', title: "Victoire de l'Ange", line: LINES.winAnge, ids: [this.angelWin] };
    else if (piper && alive.length > 1 && alive.every((id) => id === piper || this.charmed.has(id)))
      w = { camp: 'flute', title: 'Victoire du Joueur de Flûte', line: LINES.winFlute, ids: [piper] };
    else if (alive.length === 0) w = { camp: 'none', title: 'Le village est désert', line: LINES.winNone, ids: [] };
    else if (mixedLovers && alive.length === 2 && alive.every((id) => lovers.includes(id)))
      w = { camp: 'amoureux', title: 'Victoire des Amoureux', line: LINES.winLovers, ids: [...lovers] };
    else if (alive.length === 1 && white.length === 1)
      w = { camp: 'solo', title: 'Victoire du Loup Blanc', line: LINES.winLoupBlanc, ids: white };
    else if (wolves.length === 0 && !piper)
      w = { camp: 'village', title: 'Victoire du Village', line: LINES.winVillage, ids: this.order.filter((id) => !this.isWolf(id) && this.roles[id] !== 'joueur_flute' && !(mixedLovers && lovers.includes(id))) };
    else if (wolves.length === alive.length && white.length === 0 && !(mixedLovers && alive.some((id) => lovers.includes(id))))
      w = { camp: 'loups', title: 'Victoire de la Meute', line: LINES.winLoups, ids: this.order.filter((id) => this.isWolf(id) && this.roles[id] !== 'loup_blanc') };
    else if (piper && alive.length === 1)
      w = { camp: 'flute', title: 'Victoire du Joueur de Flûte', line: LINES.winFlute, ids: [piper] };
    if (!w) return false;
    this.winner = w;
    this.clearTimer();
    this.setPhase('over');
    this.chron(w.title, 'win');
    this.room.narrate(w.line);
    this.sync();
    return true;
  }

  // ── Vue personnalisée ──────────────────────────────────────
  isGod(viewer) {
    if (this.phase === 'over') return true;
    if (!this.inGame(viewer)) return this.room.isHost(viewer); // meneur non-joueur
    return !this.isAlive(viewer) && this.settings.deadSeeAll;
  }

  visibleRole(viewer, target) {
    if (this.isGod(viewer)) return this.roles[target];
    if (viewer === target) return this.roles[target];
    if (!this.isAlive(target) && this.settings.revealOnDeath) return this.roles[target];
    if (this.idiotRevealed.has(target)) return 'idiot';
    if (this.isWolf(viewer) && this.isWolf(target)) {
      const r = this.roles[target];
      return WOLF_ROLES.includes(r) && r !== 'loup_blanc' ? r : 'loup';
    }
    return this.knowledge[viewer]?.[target] || null;
  }

  canSeeLovers(viewer) {
    return this.isGod(viewer) || (this.lovers && this.lovers.includes(viewer)) || this.roles[viewer] === 'cupidon';
  }

  viewFor(viewer) {
    const god = this.isGod(viewer);
    const me = this.inGame(viewer) ? viewer : null;
    const myRole = me ? this.roles[me] : null;
    const iAmWolf = me ? this.isWolf(me) : false;
    const seeLovers = this.lovers && this.canSeeLovers(viewer);
    const publicVotes = this.phase === 'vote' || this.phase === 'verdict';

    const players = this.order.map((id) => ({
      id,
      name: this.name(id),
      connected: this.room.isConnected(id),
      alive: this.isAlive(id),
      role: this.visibleRole(viewer, id),
      wolf: (god || (iAmWolf && this.isAlive(viewer))) && this.isWolf(id) ? true : undefined,
      lover: seeLovers && this.lovers.includes(id) ? true : undefined,
      idiot: this.idiotRevealed.has(id) || undefined,
      charmed: this.charmed.has(id) && (god || this.roles[viewer] === 'joueur_flute' || this.charmed.has(viewer)) ? true : undefined,
      ready: this.phase === 'reveal' || this.phase === 'day' ? this.ready.has(id) : undefined,
    }));

    const v = {
      phase: this.phase,
      step: this.step,
      stepLabel: STEP_LABELS[this.step] || null,
      nightNo: this.nightNo,
      dayNo: this.dayNo,
      deadline: this.deadline,
      god,
      composition: this.composition,
      settings: { revealOnDeath: this.settings.revealOnDeath, deadSeeAll: this.settings.deadSeeAll },
      players,
      me: me && {
        id: me,
        role: myRole,
        alive: this.isAlive(me),
        wolf: iAmWolf,
        houndChoice: myRole === 'chien_loup' ? this.houndChoice : undefined,
        canVote: this.isAlive(me) && !this.idiotRevealed.has(me),
        ready: this.ready.has(me),
      },
      notes: this.notes[viewer] || [],
      chronicle: this.chronicle.slice(-60),
      lastDeaths: this.lastDeaths.map((d) => ({ ...d, role: this.settings.revealOnDeath || god ? d.role : null })),
      ravenActive: this.ravenActive,
      bearGrowl: this.phase === 'day' || this.phase === 'vote' ? this.bearGrowl : null,
      hunter: this.phase === 'hunter' ? this.hunter : null,
      hunterShot: this.phase === 'hunter' ? this.hunterShot : null,
      verdict: this.phase === 'verdict' ? this.verdict : null,
      dayVotes: publicVotes ? { ...this.dayVotes } : null,
      tally: publicVotes ? this.tally() : null,
      readyCount: this.ready.size,
      winner: this.winner,
      action: this.actionFor(viewer),
    };
    if (god || (iAmWolf && this.isAlive(viewer) && this.step === 'loups')) v.wolfVotes = { ...this.wolfVotes };
    if (god) {
      v.godInfo = {
        night: { ...this.n },
        potions: this.potions,
        lovers: this.lovers,
        houndChoice: this.houndChoice,
        guardLast: this.guardLast,
        elderLives: this.elderLives,
        ravenNext: this.ravenNext,
        spy: this.spy.active,
        infected: [...this.infected],
        wildModel: this.wildModel,
        wildWolf: this.wildWolf,
        charmed: [...this.charmed],
        rustyPending: this.rustyPending,
        foxPower: this.foxPower,
        priestUsed: this.priestUsed,
      };
    }
    return v;
  }

  actionFor(viewer) {
    if (!this.inGame(viewer)) return null;
    const alive = this.isAlive(viewer);
    const role = this.roles[viewer];
    const done = this.acted.has(viewer);
    if (this.phase === 'reveal') return { type: 'ready', done: this.ready.has(viewer) };
    if (this.phase === 'hunter' && viewer === this.hunter && !this.hunterShot) {
      return { type: 'pick', kind: 'hunter', count: 1, allowSkip: true, targets: this.aliveIds().filter((id) => id !== viewer),
        title: 'Votre dernier souffle', sub: 'Désignez celui que vous emportez dans la tombe.' };
    }
    if (this.phase === 'day' && alive) return { type: 'callVote', done: this.ready.has(viewer) };
    if (this.phase === 'vote') {
      if (!alive) return null;
      if (this.idiotRevealed.has(viewer)) return { type: 'novote' };
      return { type: 'vote', current: this.dayVotes[viewer] || null, targets: this.aliveIds().filter((id) => id !== viewer) };
    }
    if (this.phase !== 'night' || !alive) return null;
    const step = this.step;
    if (step === 'loups' && role === 'petite_fille') return { type: 'spy', active: this.spy.active };
    if (!this.actorsFor(step).includes(viewer)) return null;
    if (step !== 'loups' && done) return { type: 'done', vision: step === 'voyante' ? this.n.seerLook : undefined, fox: step === 'renard' ? this.n.foxResult : undefined };
    const others = this.aliveIds().filter((id) => id !== viewer);
    switch (step) {
      case 'cupidon':
        return { type: 'pick', kind: 'cupidon', count: 2, targets: this.aliveIds(), title: 'Unissez deux âmes', sub: 'Désignez les deux Amoureux (vous pouvez vous choisir).' };
      case 'chien_loup':
        return { type: 'hound' };
      case 'salvateur':
        return { type: 'pick', kind: 'salvateur', count: 1, allowSkip: true, targets: this.aliveIds().filter((id) => id !== this.guardLast), title: 'Qui protéger cette nuit ?', sub: this.guardLast ? `Vous ne pouvez pas protéger ${this.name(this.guardLast)} deux nuits de suite.` : 'Votre bouclier repoussera la meute.' };
      case 'voyante':
        return { type: 'pick', kind: 'voyante', count: 1, targets: others, title: 'Quelle âme sonder ?', sub: 'Votre boule de cristal ne ment jamais.' };
      case 'loups':
        return { type: 'wolves', current: this.wolfVotes[viewer] || null, targets: this.aliveIds().filter((id) => !this.isWolf(id)) };
      case 'loup_blanc': {
        const prey = others.filter((id) => this.isWolf(id));
        return { type: 'pick', kind: 'loup_blanc', count: 1, allowSkip: true, targets: prey, title: 'Trahir la meute ?', sub: prey.length ? 'Vous pouvez dévorer un loup cette nuit.' : 'Il ne reste aucun loup à trahir.' };
      }
      case 'sorciere':
        return { type: 'witch', victim: this.n.wolfVictim, life: this.potions.life, death: this.potions.death, targets: this.aliveIds() };
      case 'enfant_sauvage':
        return { type: 'pick', kind: 'enfant_sauvage', count: 1, targets: others, title: 'Choisissez votre modèle', sub: "S'il meurt, la sauvagerie vous rattrapera." };
      case 'renard':
        return { type: 'pick', kind: 'renard', count: 1, targets: this.aliveIds(), title: 'Où flairer cette nuit ?', sub: 'Vous sentirez ce joueur et ses deux voisins de table.' };
      case 'infect':
        return { type: 'infect', victim: this.n.wolfVictim };
      case 'grand_mechant_loup':
        return { type: 'pick', kind: 'grand_mechant_loup', count: 1, allowSkip: true, targets: this.aliveIds().filter((id) => !this.isWolf(id) && id !== this.n.wolfVictim), title: 'Une seconde proie', sub: 'Tant qu’aucun loup n’est tombé, votre faim réclame une autre victime.' };
      case 'pretre':
        return { type: 'pick', kind: 'pretre', count: 1, allowSkip: true, targets: others, title: "L'eau bénite", sub: 'Une seule fiole pour toute la partie. Si vous vous trompez, le Ciel vous foudroie.' };
      case 'joueur_flute': {
        const pool = this.uncharmedFor(viewer);
        return { type: 'pick', kind: 'joueur_flute', count: Math.min(2, pool.length), targets: pool, title: 'Qui envoûter ?', sub: 'Votre mélodie charmera deux nouvelles âmes.' };
      }
      case 'corbeau':
        return { type: 'pick', kind: 'corbeau', count: 1, allowSkip: true, targets: this.aliveIds(), title: 'Qui désigner ?', sub: 'Il commencera le prochain conseil avec deux voix contre lui.' };
      default:
        return null;
    }
  }
}

function listFr(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

function articleRole(roleId) {
  const r = ROLES[roleId];
  const fem = ['voyante', 'sorciere', 'petite_fille'].includes(roleId);
  if (roleId === 'ancien') return "l'Ancien";
  if (roleId === 'idiot') return "l'Idiot du Village";
  return `${fem ? 'la' : roleId === 'loup' ? 'un' : roleId === 'villageois' ? 'un' : 'le'} ${r.name}`;
}
