// Plotësim i TextEncoder/TextDecoder për Hermes (i nevojshëm për pdf-lib).
// Importohet i pari në App.js që të ekzistojë para librarive të raporteve.

const enc = (str) => {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
};

const dec = (buf) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer || buf);
  let out = "", i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    let c;
    if (b < 0x80) c = b;
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63);
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    if (c > 0xffff) {
      c -= 0x10000;
      out += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023));
    } else out += String.fromCharCode(c);
  }
  return out;
};

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = class TextEncoder {
    get encoding() { return "utf-8"; }
    encode(input = "") { return enc(String(input)); }
    encodeInto(input, dest) {
      const bytes = enc(String(input));
      const n = Math.min(bytes.length, dest.length);
      dest.set(bytes.subarray(0, n));
      return { read: String(input).length, written: n };
    }
  };
}

if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = class TextDecoder {
    constructor(label = "utf-8") { this.encoding = label; }
    decode(input) { return input ? dec(input) : ""; }
  };
}
