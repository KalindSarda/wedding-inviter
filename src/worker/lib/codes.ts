// Unambiguous uppercase alphabet: no 0/O, 1/I/L. 31 symbols; 12 chars ≈ 59 bits of entropy.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 12;

/** Cryptographically secure code via rejection sampling (no modulo bias). */
export function generateCode(length: number = CODE_LENGTH): string {
  const n = CODE_ALPHABET.length;
  // Largest multiple of n that fits in a byte; bytes at or above it are rejected.
  const limit = 256 - (256 % n);
  let out = "";
  while (out.length < length) {
    const buf = new Uint8Array(length * 2);
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit) {
        out += CODE_ALPHABET[b % n];
        if (out.length === length) break;
      }
    }
  }
  return out;
}
