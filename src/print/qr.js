// Kodi QR i dokumentit (vizatohet me drejtkëndësha, pa imazhe) — për faturat e fiskalizuara.
import qrcode from "qrcode-generator";

export function drawQr(page, payload, { x, y, size = 74, color }) {
  if (!payload) return false;
  const qr = qrcode(0, "M");
  qr.addData(String(payload));
  qr.make();
  const n = qr.getModuleCount();
  const cell = size / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      page.drawRectangle({ x: x + c * cell, y: y - (r + 1) * cell, width: cell, height: cell, color });
    }
  }
  return true;
}
