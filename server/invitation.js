import os from 'node:os';
import QRCode from 'qrcode';

export function networkAddresses() {
  return Object.entries(os.networkInterfaces())
    .filter(([name]) => !/^(lo|docker|br-|veth|virbr)/i.test(name))
    .flatMap(([, entries]) => entries || [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
}

export function invitationLink(code, origin, addresses = networkAddresses()) {
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Code du village invalide.');
  if (typeof origin !== 'string' || origin.length > 2048) throw new Error('Adresse du jeu invalide.');
  let url;
  try { url = new URL(origin); } catch { throw new Error('Adresse du jeu invalide.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Adresse du jeu invalide.');
  // localhost désignerait le téléphone qui scanne, et non le serveur du village.
  if (['localhost', '[::1]', '0.0.0.0'].includes(url.hostname) || /^127\./.test(url.hostname)) {
    if (addresses.length) url.hostname = addresses[0];
  }
  const link = new URL('/', url.origin);
  link.searchParams.set('code', code);
  return link.href;
}

export async function createInvitation(code, origin) {
  const link = invitationLink(code, origin);
  const svg = await QRCode.toString(link, {
    type: 'svg', width: 264, margin: 4, errorCorrectionLevel: 'M',
    color: { dark: '#111827', light: '#ffffff' },
  });
  return { link, svg };
}
