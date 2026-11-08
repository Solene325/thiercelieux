// ─────────────────────────────────────────────────────────────
//  Narration : textes du meneur + synthèse ElevenLabs (proxy + cache)
// ─────────────────────────────────────────────────────────────
import crypto from 'node:crypto';

export const LINES = {
  intro: 'Bienvenue à Thiercelieux. Prenez connaissance de votre carte, à l’abri des regards. Retenez votre rôle, puis indiquez que vous êtes prêt. Votre secret vous appartient.',
  nightFalls: 'La nuit tombe sur Thiercelieux. Le village ferme les yeux. Seuls les personnages appelés pourront les ouvrir.',
  cupidon: 'Cupidon, ouvrez les yeux. Choisissez deux amoureux. Désormais, leur destin sera lié. Validez votre choix en secret.',
  chien_loup: 'Le Chien-Loup ouvre les yeux. Choisissez votre camp : rester fidèle au village, ou rejoindre la meute. Ce choix est définitif.',
  salvateur: 'Le Salvateur ouvre les yeux. Désignez la personne que vous protégerez cette nuit, puis validez votre choix.',
  voyante: 'La Voyante ouvre les yeux. Choisissez un villageois dont vous souhaitez connaître le rôle. Gardez cette découverte pour vous.',
  loups: 'Les Loups-Garous ouvrent les yeux et se reconnaissent. Accordez-vous sur une victime. Les autres villageois gardent les yeux fermés.',
  loup_blanc: 'Le Loup Blanc ouvre les yeux, seul. Vous pouvez choisir un membre de la meute à éliminer, ou laisser passer cette nuit.',
  sorciere: 'La Sorcière ouvre les yeux. Découvrez la victime de la meute. Vous pouvez utiliser une potion disponible, ou les conserver pour une autre nuit.',
  corbeau: 'Le Corbeau ouvre les yeux. Vous pouvez désigner un suspect. Deux voix pèseront contre lui lors du prochain vote.',
  enfant_sauvage: 'L’Enfant Sauvage ouvre les yeux. Choisissez votre modèle parmi les villageois. Si cette personne meurt, vous rejoindrez la meute.',
  renard: 'Le Renard ouvre les yeux. Choisissez un joueur à flairer. Votre pouvoir vous renseignera sur lui et ses deux voisins.',
  infect: 'L’Infect Père des Loups ouvre les yeux. Vous pouvez transformer la victime de la meute. Ce pouvoir ne peut servir qu’une fois.',
  grand_mechant_loup: 'Le Grand Méchant Loup ouvre les yeux. La meute vous a laissé une seconde chasse. Choisissez une nouvelle victime.',
  pretre: 'Le Prêtre ouvre les yeux. Vous pouvez verser votre eau bénite sur un suspect, ou la conserver. Choisissez avec prudence.',
  joueur_flute: 'Le Joueur de Flûte ouvre les yeux. Désignez les personnes que vous souhaitez envoûter cette nuit, puis validez votre choix.',
  winAnge: 'Le village a condamné l’Ange. C’était précisément ce qu’il espérait. L’Ange remporte la partie.',
  winFlute: 'La dernière âme libre a succombé à la mélodie. Le Joueur de Flûte remporte la partie.',
  dawnNone: 'Le jour se lève sur Thiercelieux. Vous pouvez ouvrir les yeux. Cette nuit, tous les villageois ont survécu.',
  dawnIntro: 'Le jour se lève sur Thiercelieux. Vous pouvez ouvrir les yeux. Le village compte ses absents.',
  council: 'Le conseil est ouvert. Partagez vos soupçons, écoutez les autres et défendez-vous. Le village devra bientôt choisir à qui faire confiance.',
  vote: 'Les débats prennent fin. Chacun peut maintenant voter contre un suspect. Votre choix reste modifiable jusqu’à la fin du vote.',
  tie: 'Les voix sont à égalité. Le village n’a pas tranché : personne ne sera éliminé aujourd’hui.',
  noVote: 'Aucune voix n’a désigné de suspect. Le conseil se sépare sans condamner personne.',
  hunter: 'Le Chasseur a été mortellement touché. Avant de quitter la partie, il peut emporter un dernier suspect avec lui.',
  winVillage: 'Le dernier loup est tombé. Les villageois ont démasqué la meute. Thiercelieux peut enfin retrouver le calme. Victoire du village.',
  winLoups: 'Le village ne peut plus résister. La meute a pris le dessus. Les Loups-Garous remportent la partie.',
  winLovers: 'Les amoureux ont survécu à tous les soupçons. Ensemble, ils remportent la partie.',
  winLoupBlanc: 'Il ne reste qu’un survivant à Thiercelieux. Le Loup Blanc a trahi la meute et le village. La victoire lui appartient.',
  winNone: 'Le silence est revenu à Thiercelieux. Personne n’a survécu. Cette partie s’achève sans vainqueur.',
};

export const SLEEP_LINES = {
  cupidon: 'Cupidon referme les yeux.', chien_loup: 'Le Chien-Loup referme les yeux.',
  salvateur: 'Le Salvateur referme les yeux.', voyante: 'La Voyante referme les yeux.',
  loups: 'Les Loups-Garous referment les yeux.', loup_blanc: 'Le Loup Blanc referme les yeux.',
  sorciere: 'La Sorcière referme les yeux.', corbeau: 'Le Corbeau referme les yeux.',
  enfant_sauvage: 'L’Enfant Sauvage referme les yeux.', renard: 'Le Renard referme les yeux.',
  infect: 'L’Infect Père des Loups referme les yeux.', grand_mechant_loup: 'Le Grand Méchant Loup referme les yeux.',
  pretre: 'Le Prêtre referme les yeux.', joueur_flute: 'Le Joueur de Flûte referme les yeux.',
};

export const PREWARM = ['intro', 'nightFalls', 'cupidon', 'chien_loup', 'enfant_sauvage', 'renard', 'infect', 'grand_mechant_loup', 'pretre', 'joueur_flute', 'salvateur', 'voyante', 'loups', 'loup_blanc', 'sorciere', 'corbeau', 'dawnNone', 'dawnIntro', 'council', 'vote', 'tie', 'noVote', 'hunter'];

export const VOICE_PRESETS = [
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian — grave et posé' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel — narrateur autoritaire' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George — conteur chaleureux' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill — voix mûre et profonde' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam — profond et sombre' },
];

const audioCache = new Map(); // id -> Buffer  (LRU minimaliste)
const MAX_CACHE = 400;

function cacheSet(id, buf) {
  audioCache.set(id, buf);
  if (audioCache.size > MAX_CACHE) audioCache.delete(audioCache.keys().next().value);
}

export function getAudio(id) {
  return audioCache.get(id) || null;
}

/** Synthétise un texte via ElevenLabs. Retourne l'id audio (mis en cache) ou lance une erreur. */
export async function synthesize({ apiKey, voiceId, model }, text) {
  const vid = voiceId || VOICE_PRESETS[0].id;
  const mdl = model || 'eleven_multilingual_v2';
  const id = crypto.createHash('sha1').update(`natural-v2|${vid}|${mdl}|${text}`).digest('hex');
  if (audioCache.has(id)) return id;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: mdl,
      voice_settings: { stability: 0.62, similarity_boost: 0.8, style: 0.18, use_speaker_boost: true, speed: 0.94 },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.detail?.message || j?.detail?.status || JSON.stringify(j.detail || j); } catch { /* ignore */ }
    throw new Error(`ElevenLabs ${res.status}${detail ? ' — ' + detail : ''}`);
  }
  cacheSet(id, Buffer.from(await res.arrayBuffer()));
  return id;
}

export async function listVoices(apiKey) {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
  const j = await res.json();
  return (j.voices || []).map((v) => ({ id: v.voice_id, name: `${v.name}${v.labels?.description ? ' — ' + v.labels.description : ''}` }));
}
