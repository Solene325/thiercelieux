/** Une réplique n’appartient qu’à une phase et un réveil de la partie. */
export function narrationScope(game) {
  return game ? [game.phase, game.step || '', game.nightNo, game.dayNo].join(':') : null;
}

/** Débit de lecture posé, sans allonger artificiellement chaque syllabe. */
export function narrationDuration(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  const pauses = (String(text).match(/[.!?…]/g) || []).length;
  return Math.max(2, words / 2.6 + pauses * .3 + .5);
}
