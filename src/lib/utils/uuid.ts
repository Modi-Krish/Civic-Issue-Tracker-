// Deterministic string to UUID converter for both Client (Browser) and Server (Node.js)

function pureJsMd5(str: string): string {
  var k = [], i = 0;
  for (; i < 64;) {
    k[i] = Math.floor(Math.abs(Math.sin(++i)) * 4294967296);
  }
  var b, c, d, j,
    x: number[] = [],
    str2 = unescape(encodeURIComponent(str)),
    len = str2.length,
    h = [1732584193, -271733879, -1732584194, 271733878];

  for (i = 0; i < len; i++) {
    x[i >> 2] |= str2.charCodeAt(i) << ((i % 4) * 8);
  }
  x[i >> 2] |= 0x80 << ((i % 4) * 8);
  x[(((len + 8) >> 6) << 4) + 14] = len * 8;

  for (i = 0; i < x.length; i += 16) {
    b = h[0]; c = h[1]; d = h[2]; j = h[3];
    for (var m = 0; m < 64; m++) {
      var f = 0, g = 0;
      if (m < 16) {
        f = (c & d) | ((~c) & j);
        g = m;
      } else if (m < 32) {
        f = (j & c) | ((~j) & d);
        g = (5 * m + 1) % 16;
      } else if (m < 48) {
        f = c ^ d ^ j;
        g = (3 * m + 5) % 16;
      } else {
        f = d ^ (c | (~j));
        g = (7 * m) % 16;
      }
      var temp: number = j;
      j = d;
      d = c;
      var sum: number = (b + f + k[m] + (x[i + g] || 0)) | 0;

      var rot = (m < 16 ? [7, 12, 17, 22][m % 4] : m < 32 ? [5, 9, 14, 20][m % 4] : m < 48 ? [4, 11, 16, 23][m % 4] : [6, 10, 15, 21][m % 4]);
      c = (c + ((sum << rot) | (sum >>> (32 - rot)))) | 0;
      b = temp;
    }
    h[0] = (h[0] + b) | 0;
    h[1] = (h[1] + c) | 0;
    h[2] = (h[2] + d) | 0;
    h[3] = (h[3] + j) | 0;
  }

  var res = '';
  for (i = 0; i < 4; i++) {
    for (j = 0; j < 4; j++) {
      res += ((h[i] >> (j * 8)) & 0xff).toString(16).padStart(2, '0');
    }
  }
  return res;
}

export function stringToUUID(idStr: string | null | undefined): string {
  if (!idStr) return '00000000-0000-4000-8000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idStr)) return idStr;

  const hex = pureJsMd5(idStr);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function getPossibleCompanyIds(rawId: string | null | undefined): string[] {
  if (!rawId) return [];
  const hashed = stringToUUID(rawId);
  if (hashed === rawId) return [rawId];
  return [rawId, hashed];
}
