// Расчёт плитки — то же правило, что tools/interior/tile_calc.py и floor_rule.py (сетка, подрезка как у плиточников,
// обрезки парами из одной плитки, запас 5 % / ромб 10 %, покупка коробками).
const STEP = 0.01;                                   // сетка выборки 1 см

function tiler(size, n, farFull) {
  const r = Math.round((n % size) * 1e6) / 1e6 % size;
  if (r === 0) return 0;
  if (!farFull) {
    const a = ((size - r) / 2) % size, b = ((size - r) / 2 + size / 2) % size;
    return (size - a) >= (size - b) ? a : b;
  }
  if (r >= size / 3) return 0;
  return (size - (r + size) / 2) % size;
}

function pieces(w, h, L, Wt, holes, diag, wall) {
  let sx, sy;
  if (wall) { sx = ((L - w % L) % L) / 2; sy = 0; if (w % L > 0 && w % L < L / 3) sx = (sx + L / 2) % L; }
  else { sx = tiler(L, w, false); sy = tiler(Wt, h, true); }
  const cnt = new Map(), cx = w / 2 + sx, cy = h / 2 + sy, r2 = Math.SQRT1_2;
  for (let y = STEP / 2; y < h; y += STEP) for (let x = STEP / 2; x < w; x += STEP) {
    if (holes.some(([x0, x1, y0, y1]) => x > x0 && x < x1 && y > y0 && y < y1)) continue;
    let gx = x + sx, gy = y + sy;
    if (diag) { const dx = gx - cx, dy = gy - cy; gx = (dx - dy) * r2 + 50 * L; gy = (dx + dy) * r2 + 50 * Wt; }
    const k = Math.floor(gx / L) * 100003 + Math.floor(gy / Wt);
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  return [...cnt.values()].map(c => Math.min(c * STEP * STEP / (L * Wt), 1));
}

function count(fr) {
  const full = fr.filter(f => f > 0.98).length, parts = fr.filter(f => f <= 0.98).sort((a, b) => b - a);
  const used = parts.map(() => false); let tiles = 0;
  for (let i = 0; i < parts.length; i++) {
    if (used[i]) continue; used[i] = true; tiles++;
    for (let j = parts.length - 1; j > i; j--) if (!used[j] && parts[i] + parts[j] <= 0.98) { used[j] = true; break; }
  }
  return { full, cut: parts.length, need: full + tiles };
}

// room {w,d,h,door,window}; floor — плитка пола; walls {back, front, left, right}; diag — ромб
export function calc(room, floor, walls, diag) {
  const { w: W, d: D, h: H } = room, surf = [['Пол', floor, W, D, [], diag, false]];
  const holes = { back: [], front: [], left: [], right: [] };
  if (room.door) holes.front.push([W - 1.8, W - 1.0, 0, 2.1]);
  if (room.window) holes.left.push([D - 0.85, D - 0.25, 1.4, Math.min(2.2, H - 0.3)]);
  const names = { back: 'Стена с тумбой', front: 'Стена с дверью', left: 'Левая стена', right: 'Правая стена' };
  for (const k of ['back', 'front', 'left', 'right'])
    surf.push([names[k], walls[k], k === 'back' || k === 'front' ? W : D, H, holes[k], false, true]);
  const rows = [], by = new Map();
  for (const [name, t, w, h, hl, dg, wall] of surf) {
    const c = count(pieces(w, h, t.len / 1000, t.wid / 1000, hl, dg, wall));
    const area = w * h - hl.reduce((s, [x0, x1, y0, y1]) => s + (x1 - x0) * (y1 - y0), 0);
    rows.push({ name, tile: t.name, area, ...c });
    const b = by.get(t.id) || { t, need: 0, diag: false }; b.need += c.need; b.diag ||= dg; by.set(t.id, b);
  }
  let total = 0; const buy = [];
  for (const { t, need, diag: dg } of by.values()) {
    const pcs = Math.ceil(need * (dg ? 1.10 : 1.05)), boxes = Math.ceil(pcs / t.pack_pcs), rub = Math.round(boxes * t.pack_m2 * t.price_m2);
    total += rub;
    buy.push({ t, need, pcs, boxes, rub, piece: Math.round(t.price_m2 * t.len * t.wid / 1e6) });
  }
  return { rows, buy, total };
}
