// The party's email address: one check shared by the RSVP form, the admin
// list and the server, and the masked hint that's all a guest ever gets back.

export const EMAIL_MAX = 254;

/** The character maskEmail hides a name with. Never part of a real address. */
export const MASK_CHAR = "•";

/**
 * Deliberately loose: something@something.tld with no spaces. A half-edited
 * mask ("yo•••x@gmail.com") is refused, so it can't be saved as an address.
 */
export const isEmail = (s: string) => s.length <= EMAIL_MAX && !s.includes(MASK_CHAR) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Providers whose near-misses are almost certainly typos ("gmial.com").
const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "comcast.net",
  "naver.com",
  "daum.net",
  "hanmail.net",
  "kakao.com",
  "protonmail.com",
];

// Real domains that sit one typo away from a common one, so they're left alone.
const REAL_DOMAINS = new Set([...COMMON_DOMAINS, "mail.com", "ymail.com", "email.com", "gmx.com", "googlemail.com", "nate.com"]);

// Endings that aren't real, each a slip of ".com".
const COM_TYPOS = /\.(con|cmo|ocm|comm|coom|vom|xom)$/;

/** Whether two strings are one slip apart: a wrong, missing, extra, or swapped-with-its-neighbor character. */
function oneTypoApart(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const rest = (s: string, from: number) => s.slice(from);
  if (a.length === b.length) {
    return rest(a, i + 1) === rest(b, i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && rest(a, i + 2) === rest(b, i + 2));
  }
  return a.length > b.length ? rest(a, i + 1) === rest(b, i) : rest(a, i) === rest(b, i + 1);
}

/**
 * The address they probably meant, if the domain looks like a typo
 * ("sam@gmial.con" → "sam@gmail.com"), or null. Only ever a suggestion: an
 * unusual domain can be right, so nothing is refused over this.
 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  const domain = email.slice(at + 1).toLowerCase();
  if (at < 1 || REAL_DOMAINS.has(domain)) return null;
  const dotCom = domain.replace(COM_TYPOS, ".com");
  const fixed = REAL_DOMAINS.has(dotCom) ? dotCom : (COMMON_DOMAINS.find((d) => oneTypoApart(dotCom, d)) ?? dotCom);
  return fixed === domain ? null : email.slice(0, at + 1) + fixed;
}

/**
 * "youngre@gmail.com" → "yo•••e@gmail.com": the first two and last one
 * characters of the name, and always three dots so the length doesn't show.
 * A name of four characters or fewer shows only its first, so the mask never
 * gives most of it away.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  const name = email.slice(0, at);
  const dots = MASK_CHAR.repeat(3);
  const shown = name.length > 4 ? name.slice(0, 2) + dots + name.slice(-1) : name.slice(0, 1) + dots;
  return shown + email.slice(at);
}
