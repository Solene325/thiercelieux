// ─────────────────────────────────────────────────────────────
//  Rôles de Thiercelieux — source unique partagée client/serveur
// ─────────────────────────────────────────────────────────────

export const CAMPS = {
  village: { id: 'village', name: 'Le Village', color: '#D4AF37' },
  loups: { id: 'loups', name: 'La Meute', color: '#C53030' },
  solo: { id: 'solo', name: 'Solitaire', color: '#C9D6E8' },
};

export const ROLES = {
  loup: {
    id: 'loup', name: 'Loup-Garou', plural: 'Loups-Garous', camp: 'loups', unique: false, weight: -6,
    tagline: 'Chaque nuit, la meute dévore un villageois.',
    desc: "Chaque nuit, vous vous réveillez avec la meute pour désigner une victime. Le jour, vous vous fondez parmi les villageois. Vous gagnez lorsque tous les innocents ont péri.",
  },
  loup_blanc: {
    id: 'loup_blanc', name: 'Loup Blanc', camp: 'solo', unique: true, weight: -8,
    tagline: 'Il chasse avec la meute… et chasse la meute.',
    desc: "Vous chassez avec les loups, qui vous croient des leurs. Une nuit sur deux, vous pouvez dévorer un loup-garou. Vous ne gagnez que si vous êtes le dernier survivant.",
  },
  villageois: {
    id: 'villageois', name: 'Simple Villageois', plural: 'Villageois', camp: 'village', unique: false, weight: 1,
    tagline: 'Sa seule arme : sa parole et son vote.',
    desc: "Vous n'avez aucun pouvoir, sinon votre flair, votre éloquence et votre voix au conseil. Démasquez les loups et menez-les au bûcher.",
  },
  voyante: {
    id: 'voyante', name: 'Voyante', camp: 'village', unique: true, weight: 7,
    tagline: 'Sa boule de cristal perce les âmes.',
    desc: "Chaque nuit, vous sondez l'âme d'un joueur et découvrez sa véritable identité. Guidez le village… sans vous trahir.",
  },
  sorciere: {
    id: 'sorciere', name: 'Sorcière', camp: 'village', unique: true, weight: 4,
    tagline: 'Une potion pour sauver, une potion pour tuer.',
    desc: "Vous possédez une Potion de résurrection et une Potion de mort, chacune utilisable une seule fois. Chaque nuit, vous découvrez la victime de la meute et pouvez agir.",
  },
  chasseur: {
    id: 'chasseur', name: 'Chasseur', camp: 'village', unique: true, weight: 3,
    tagline: "Dans son dernier souffle, il tire.",
    desc: "Si vous mourez, de quelque manière que ce soit, vous emportez immédiatement un joueur de votre choix dans la tombe.",
  },
  cupidon: {
    id: 'cupidon', name: 'Cupidon', camp: 'village', unique: true, weight: -2,
    tagline: "Ses flèches lient deux destins à jamais.",
    desc: "La première nuit, vous désignez deux Amoureux. Si l'un meurt, l'autre meurt de chagrin. Si les Amoureux sont de camps opposés, ils doivent survivre seuls contre tous.",
  },
  petite_fille: {
    id: 'petite_fille', name: 'Petite Fille', camp: 'village', unique: true, weight: 3,
    tagline: 'Elle entrouvre les yeux quand la meute rôde.',
    desc: "Pendant le réveil des loups, vous pouvez espionner : vous entendez leurs murmures et apercevrez peut-être un visage… mais ils pourraient vous surprendre.",
  },
  chien_loup: {
    id: 'chien_loup', name: 'Chien-Loup', camp: 'village', unique: true, weight: -1,
    tagline: 'Fidèle chien ou loup sauvage ?',
    desc: "La première nuit, vous choisissez votre nature : rester un fidèle compagnon du village, ou rejoindre la meute pour toujours.",
  },
  salvateur: {
    id: 'salvateur', name: 'Salvateur', camp: 'village', unique: true, weight: 3,
    tagline: 'Son bouclier veille sur les dormeurs.',
    desc: "Chaque nuit, vous protégez un joueur (vous-même compris) de l'attaque des loups. Vous ne pouvez pas protéger la même personne deux nuits de suite.",
  },
  ancien: {
    id: 'ancien', name: "L'Ancien", camp: 'village', unique: true, weight: 2,
    tagline: 'Les années l’ont rendu coriace.',
    desc: "Vous avez survécu à tant d'hivers : il faut deux attaques de la meute pour vous abattre. Le bûcher, la potion ou le chasseur vous tuent normalement.",
  },
  idiot: {
    id: 'idiot', name: 'Idiot du Village', camp: 'village', unique: true, weight: 2,
    tagline: "On ne brûle pas l'idiot du village.",
    desc: "Si le conseil vous condamne au bûcher, votre identité est révélée et le village vous épargne… mais vous perdez votre droit de vote.",
  },
  corbeau: {
    id: 'corbeau', name: 'Corbeau', camp: 'village', unique: true, weight: 2,
    tagline: 'Son croassement désigne les suspects.',
    desc: "Chaque nuit, vous pouvez désigner un joueur : au prochain conseil, il commencera avec deux voix contre lui.",
  },
  renard: {
    id: 'renard', name: 'Renard', camp: 'village', unique: true, weight: 4,
    tagline: 'Son museau ne trompe jamais… presque.',
    desc: "Chaque nuit, vous flairez un joueur et ses deux voisins de table. Si l'un d'eux est un loup, votre flair est confirmé. Sinon, vous perdez votre pouvoir à jamais.",
  },
  montreur_ours: {
    id: 'montreur_ours', name: "Montreur d'Ours", camp: 'village', unique: true, weight: 3,
    tagline: 'Son ours grogne quand la bête est proche.',
    desc: "Chaque matin, si l'un de vos deux voisins de table (vivants) est un loup-garou, votre ours grogne devant tout le village.",
  },
  grand_mechant_loup: {
    id: 'grand_mechant_loup', name: 'Grand Méchant Loup', camp: 'loups', unique: true, weight: -8,
    tagline: 'Sa faim ne connaît aucune limite.',
    desc: "Vous chassez avec la meute. Tant qu'aucun loup n'a péri, vous dévorez seul une seconde victime chaque nuit.",
  },
  infect: {
    id: 'infect', name: 'Infect Père des Loups', camp: 'loups', unique: true, weight: -9,
    tagline: 'Sa morsure ne tue pas : elle transforme.',
    desc: "Vous chassez avec la meute. Une fois par partie, au lieu de tuer la victime de la meute, vous pouvez l'infecter : elle devient secrètement un loup-garou et garde ses pouvoirs.",
  },
  enfant_sauvage: {
    id: 'enfant_sauvage', name: 'Enfant Sauvage', camp: 'village', unique: true, weight: -1,
    tagline: 'Élevé par les loups, il cherche un modèle.',
    desc: "La première nuit, vous choisissez un modèle. Tant qu'il vit, vous êtes un villageois. S'il meurt, vous rejoignez la meute.",
  },
  bouc: {
    id: 'bouc', name: 'Bouc Émissaire', camp: 'village', unique: true, weight: 1,
    tagline: "Quand le village hésite, c'est lui qu'on brûle.",
    desc: "En cas d'égalité au vote du bûcher, c'est vous qui êtes sacrifié à la place des accusés.",
  },
  joueur_flute: {
    id: 'joueur_flute', name: 'Joueur de Flûte', camp: 'solo', unique: true, weight: -5,
    tagline: 'Sa mélodie envoûte le village entier.',
    desc: "Chaque nuit, vous envoûtez deux joueurs. Les envoûtés se reconnaissent. Vous gagnez seul si tous les survivants sont sous votre charme.",
  },
  chevalier: {
    id: 'chevalier', name: "Chevalier à l'Épée Rouillée", camp: 'village', unique: true, weight: 3,
    tagline: 'Même mort, sa lame frappe encore.',
    desc: "Si la meute vous dévore, le premier loup-garou assis à votre gauche contracte le tétanos et meurt la nuit suivante.",
  },
  ange: {
    id: 'ange', name: 'Ange', camp: 'solo', unique: true, weight: -1,
    tagline: 'Il ne rêve que de rejoindre les cieux.',
    desc: "Si le village vous envoie au bûcher lors du tout premier conseil, vous gagnez seul, immédiatement. Sinon, vous devenez un simple villageois.",
  },
  soeur: {
    id: 'soeur', name: 'Sœur', plural: 'Deux Sœurs', camp: 'village', unique: false, fixed: 2, weight: 3,
    tagline: 'Deux âmes, un même sang.',
    desc: "Vous et votre sœur vous connaissez dès le début de la partie. Vous pouvez vous faire confiance… et murmurer en secret.",
  },
  pretre: {
    id: 'pretre', name: 'Prêtre', camp: 'village', unique: true, weight: 3,
    tagline: "Son eau bénite brûle les créatures de la nuit.",
    desc: "Une fois par partie, la nuit, vous aspergez un joueur d'eau bénite. S'il est loup-garou, il meurt à l'aube. Sinon, le sacrilège vous coûte la vie.",
  },
};

// Ordre de réveil nocturne
export const NIGHT_ORDER = ['cupidon', 'enfant_sauvage', 'chien_loup', 'salvateur', 'voyante', 'renard', 'loups', 'infect', 'grand_mechant_loup', 'loup_blanc', 'sorciere', 'pretre', 'joueur_flute', 'corbeau'];

export const STEP_LABELS = {
  cupidon: { title: 'Cupidon se réveille', sub: 'Ses flèches vont unir deux âmes…' },
  chien_loup: { title: 'Le Chien-Loup se réveille', sub: 'Il choisit sa véritable nature…' },
  salvateur: { title: 'Le Salvateur se réveille', sub: 'Il étend sa protection sur un dormeur…' },
  voyante: { title: 'La Voyante se réveille', sub: "Elle sonde l'âme d'un villageois…" },
  loups: { title: 'Les Loups-Garous se réveillent', sub: 'La meute choisit sa victime…' },
  loup_blanc: { title: 'Le Loup Blanc se réveille', sub: 'Il rôde parmi les siens…' },
  sorciere: { title: 'La Sorcière se réveille', sub: 'Elle contemple ses potions…' },
  corbeau: { title: 'Le Corbeau se réveille', sub: 'Il cherche un suspect à désigner…' },
  enfant_sauvage: { title: "L'Enfant Sauvage se réveille", sub: 'Il se choisit un modèle…' },
  renard: { title: 'Le Renard se réveille', sub: 'Son museau fouille les chaumières…' },
  infect: { title: "L'Infect Père des Loups se réveille", sub: 'Mordra-t-il pour tuer… ou pour transformer ?' },
  grand_mechant_loup: { title: 'Le Grand Méchant Loup se réveille', sub: 'Sa faim n’est pas rassasiée…' },
  pretre: { title: 'Le Prêtre se réveille', sub: 'Il serre sa fiole d’eau bénite…' },
  joueur_flute: { title: 'Le Joueur de Flûte se réveille', sub: 'Sa mélodie se glisse sous les portes…' },
};

export const DEATH_CAUSES = {
  loups: 'Victime de la meute',
  sorciere: 'Empoisonné par la sorcière',
  loup_blanc: 'Déchiqueté par le Loup Blanc',
  bucher: 'Brûlé sur le bûcher',
  chasseur: 'Abattu par le chasseur',
  chagrin: "Mort de chagrin d'amour",
  gml: 'Dévoré par le Grand Méchant Loup',
  rouille: "Emporté par le tétanos de l'épée rouillée",
  bouc: 'Sacrifié comme bouc émissaire',
  eau_benite: "Consumé par l'eau bénite",
  sacrilege: 'Foudroyé pour sacrilège',
};

export const SPECIAL_ROLES = [
  'voyante', 'sorciere', 'chasseur', 'cupidon', 'petite_fille', 'salvateur', 'renard', 'chien_loup', 'ancien', 'idiot', 'corbeau',
  'montreur_ours', 'enfant_sauvage', 'soeur', 'bouc', 'chevalier', 'pretre', 'ange',
  'loup_blanc', 'grand_mechant_loup', 'infect', 'joueur_flute',
];
export const WOLF_ROLES = ['loup', 'loup_blanc', 'grand_mechant_loup', 'infect'];

// Seuils d'apparition des rôles en mode « Équilibre automatique »
const AUTO_THRESHOLDS = {
  voyante: 5, sorciere: 6, chasseur: 7, cupidon: 8, petite_fille: 9, salvateur: 10,
  renard: 11, chien_loup: 12, ancien: 13, loup_blanc: 14, idiot: 15, corbeau: 16,
  montreur_ours: 17, enfant_sauvage: 18, grand_mechant_loup: 19, soeur: 20, bouc: 21,
  chevalier: 23, pretre: 25, infect: 27, ange: 29, joueur_flute: 31,
};

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 50;

/** Composition équilibrée selon le nombre exact de joueurs. */
export function autoComposition(n) {
  const comp = {};
  if (n < 1) return comp;
  const wolfTeam = Math.max(1, Math.round(n * 0.23));
  for (const [role, min] of Object.entries(AUTO_THRESHOLDS)) if (n >= min) comp[role] = ROLES[role].fixed || 1;
  comp.loup = Math.max(1, wolfTeam - WOLF_ROLES.filter((r) => r !== 'loup' && comp[r]).length);
  // Ajustement fin : si le village est trop fort, retirer le salvateur ; trop faible, retirer cupidon
  let specials = Object.entries(comp).filter(([r]) => r !== 'loup').reduce((a, [, c]) => a + c, 0);
  while (comp.loup + specials > n) {
    const drop = ['joueur_flute', 'ange', 'pretre', 'chevalier', 'bouc', 'soeur', 'enfant_sauvage', 'montreur_ours', 'corbeau', 'idiot', 'ancien', 'chien_loup', 'renard', 'salvateur', 'petite_fille', 'cupidon', 'chasseur', 'sorciere'].find((r) => comp[r]);
    if (!drop) break;
    specials -= comp[drop];
    delete comp[drop];
  }
  const used = Object.values(comp).reduce((a, b) => a + b, 0);
  if (n - used > 0) comp.villageois = n - used;
  return comp;
}

/** Les anciennes compositions sont complétées ; un nombre explicite est respecté, même zéro. */
export function finalizeComposition(custom, n) {
  const comp = {};
  for (const [role, count] of Object.entries(custom || {})) {
    if (!ROLES[role]) continue;
    const c = Math.max(0, Math.floor(Number(count) || 0));
    if (c > 0) comp[role] = ROLES[role].unique ? 1 : ROLES[role].fixed || c;
  }
  const used = Object.values(comp).reduce((a, b) => a + b, 0);
  if (!Object.prototype.hasOwnProperty.call(custom || {}, 'villageois') && n - used > 0) comp.villageois = n - used;
  return comp;
}

export function compositionCount(comp) {
  return Object.values(comp || {}).reduce((a, b) => a + b, 0);
}

export function compositionBalance(comp) {
  return Object.entries(comp || {}).reduce((s, [r, c]) => s + (ROLES[r]?.weight || 0) * c, 0);
}

export function validateComposition(comp, n) {
  const total = compositionCount(comp);
  if (n < MIN_PLAYERS) return `Il faut au moins ${MIN_PLAYERS} joueurs pour réveiller la meute.`;
  if (total !== n) return `La composition compte ${total} cartes pour ${n} joueurs.`;
  const wolves = WOLF_ROLES.reduce((a, r) => a + (comp[r] || 0), 0);
  if (!wolves) return 'Il faut au moins un loup-garou.';
  if (wolves >= n / 2) return 'Trop de loups : la meute gagnerait dès la première aube.';
  return null;
}
