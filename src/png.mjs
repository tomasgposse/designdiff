// Decodificador PNG mínimo (8 bits, RGB o RGBA, sin entrelazado) y comparación visual.
// Alcanza para las capturas de Chrome y Edge; sin dependencias.

import fs from 'node:fs';
import zlib from 'node:zlib';

export function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width = 0, height = 0, colorType = 0, bitDepth = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || interlace || (colorType !== 2 && colorType !== 6)) throw new Error(`PNG no soportado: ${file}`);
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y ? out[dst - stride + x] : 0;
      const c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  return { width, height, bpp, data: out };
}

// Porcentaje de la pantalla que cambió (0 a 100). Muestrea cada 2 píxeles y
// tolera diferencias chicas de color, para no contar ruido de antialiasing.
export function diffPercent(fileA, fileB) {
  const a = decodePng(fileA), b = decodePng(fileB);
  if (a.width !== b.width || a.height !== b.height) return 100;
  let changed = 0, total = 0;
  for (let y = 0; y < a.height; y += 2) {
    for (let x = 0; x < a.width; x += 2) {
      const ia = (y * a.width + x) * a.bpp, ib = (y * b.width + x) * b.bpp;
      const d = Math.abs(a.data[ia] - b.data[ib]) + Math.abs(a.data[ia + 1] - b.data[ib + 1]) + Math.abs(a.data[ia + 2] - b.data[ib + 2]);
      if (d > 48) changed++;
      total++;
    }
  }
  return Math.round((changed / total) * 1000) / 10;
}
