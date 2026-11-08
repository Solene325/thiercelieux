// La phase se lit dans le décor et l’en-tête. Un seul son accompagne son entrée.
import { useEffect } from 'preact/hooks';
import { sfx, audioPrefs } from '../audio.js';

export function PhaseEffects({ game }) {
  useEffect(() => {
    // La voix reste au premier plan, sans effet de phase concurrent.
    if (audioPrefs.voice) return;
    switch (game.phase) {
      case 'reveal': sfx.flip(); break;
      case 'night': sfx.nightfall(); break;
      case 'dawn': sfx.rooster(); break;
      case 'day': sfx.council(); break;
      case 'vote': sfx.bell(); break;
      case 'hunter': sfx.whoosh(); break;
      case 'over': sfx.victory(['loups', 'solo', 'none'].includes(game.winner?.camp)); break;
    }
  }, [game.phase, game.nightNo]);
  return null;
}
