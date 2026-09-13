let seq = 0;

export default function fid(prefix, extra) {
  seq = (seq + 1) % 1679616;
  return (
    (prefix || '') +
    Date.now().toString(36) +
    '_' +
    seq.toString(36).padStart(4, '0') +
    (extra ? '_' + extra : '')
  );
}

export function randCode(len) {
  let s = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < (len || 6); i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}