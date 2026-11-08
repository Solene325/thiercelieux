// ─────────────────────────────────────────────────────────────
//  Bruitages réalistes générés par ElevenLabs (Sound Effects API)
//  Générés une seule fois puis conservés dans data/sfx/*.mp3
// ─────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';

export const SFX = {
  rooster: { text: 'A rooster crowing loudly and proudly at dawn in a quiet medieval farm village, distant birds waking up', duration: 5 },
  howl: { text: 'A lone wolf howling long and mournful in a dark misty forest at night, distant echo, cold wind', duration: 6 },
  nightfall: { text: 'Night falling over a medieval village: an owl hooting twice, crickets, cold wind through dead trees', duration: 7 },
  bell: { text: 'A single deep heavy church bell toll echoing slowly over a medieval village square', duration: 6 },
  reveal: { text: 'Deep cinematic trailer impact boom with low reverberating sub bass and dark whoosh, slow motion', duration: 4 },
  death: { text: 'Ominous dark choir sting with a low brass hit and reverb tail, horror film death reveal', duration: 5 },
  fire: { text: 'A wooden pyre igniting with a whoosh, then a roaring crackling bonfire', duration: 6 },
  shot: { text: 'A single old flintlock musket gunshot echoing across a forest valley', duration: 3 },
  heartbeat: { text: 'One slow heavy cinematic heartbeat, deep and tense', duration: 1.2 },
  whoosh: { text: 'Slow motion deep cinematic whoosh transition with reverse cymbal swell', duration: 3 },
  flip: { text: 'A single tarot card flipped over quickly, soft paper swoosh', duration: 0.8 },
  council: { text: 'Murmuring medieval crowd gathering in a village square, tense whispers, distant crows', duration: 6 },
  victory: { text: 'Short triumphant medieval orchestral fanfare with choir and church bells', duration: 7 },
  wolves_win: { text: 'A pack of wolves howling together in triumph under the full moon, dark orchestral drone', duration: 7 },
  raven: { text: 'A raven cawing twice in a misty graveyard', duration: 3 },
};

const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'sfx');
fs.mkdirSync(DIR, { recursive: true });

export const sfxDir = DIR;
export function availableSfx() {
  return Object.keys(SFX).filter((k) => fs.existsSync(path.join(DIR, `${k}.mp3`)));
}

let running = null;
/** Génère en arrière-plan les bruitages manquants. */
export function generateMissingSfx(apiKey, onProgress = () => {}) {
  if (running || !apiKey) return running;
  running = (async () => {
    for (const [name, { text, duration }] of Object.entries(SFX)) {
      const file = path.join(DIR, `${name}.mp3`);
      if (fs.existsSync(file)) continue;
      try {
        const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
          method: 'POST',
          headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text, duration_seconds: duration, prompt_influence: 0.55 }),
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) { console.warn(`  ⚠ Bruitage « ${name} » : ElevenLabs ${res.status}`); if (res.status === 401) break; continue; }
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        onProgress(name);
      } catch (e) {
        console.warn(`  ⚠ Bruitage « ${name} » : ${e.message}`);
      }
    }
  })().finally(() => { running = null; });
  return running;
}
