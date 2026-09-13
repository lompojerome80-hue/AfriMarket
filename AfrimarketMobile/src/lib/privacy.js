export function maskPhone(phone) {
  const s = String(phone || '').replace(/[^\d+]/g, '');
  if (s.length < 4) return '•••';
  return s.slice(0, 3) + '••••' + s.slice(-2);
}

export function maskPhoneInText(text) {
  return String(text || '').replace(/\+?\d[\d\s\-\.]{7,18}/g, (t) => {
    const d = t.replace(/[^\d+]/g, '');
    if (d.length < 8) return t;
    return d.slice(0, 3) + '••••' + d.slice(-2);
  });
}

export function looksLikeContact(text) {
  const t = String(text || '');
  const digits = t.replace(/\D/g, '');
  return (digits.length >= 8 && digits.length <= 14) || /\bwhatsapp\b/i.test(t);
}