import { decodeVapidKey } from '../push.web';

test('clé VAPID : base64url décodée en octets', () => {
  // 65 octets : point P-256 non compressé, premier octet 0x04.
  const bytes = new Uint8Array(65).fill(7);
  bytes[0] = 4;
  const key = Buffer.from(bytes).toString('base64url');
  expect(Array.from(decodeVapidKey(key))).toEqual(Array.from(bytes));
});
