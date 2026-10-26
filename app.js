import { calc } from './calc.js';

const $ = id => document.getElementById(id);
const data = await (await fetch('data.json')).json();
const T = Object.fromEntries([...data.floors, ...data.walls].map(t => [t.id, t]));
const st = { set: data.sets[0].id, floor: null, pat: 's' };
const rub = n => n.toLocaleString('ru-RU') + ' ₽';
const has = (s, p, f) => (data.shots[s]?.[p] || []).includes(f);

for (const k of ['w', 'd', 'h']) { $(k).value = data.room[k]; $(k).oninput = recalc; }
$('door').onchange = $('win').onchange = recalc;

data.sets.forEach(s => {
  const b = document.createElement('button'); b.textContent = s.name; b.dataset.id = s.id;
  b.onclick = () => { st.set = s.id; show(); }; $('sets').append(b);
});
data.floors.forEach(t => {
  const b = document.createElement('button'); b.dataset.id = t.id;
  b.innerHTML = `<img src="sw/${t.id}.jpg" alt=""><span>${t.name}</span><small>${t.len}×${t.wid} · ${rub(t.price_m2)}/м²</small>`;
  b.onclick = () => { st.floor = t.id; show(); }; $('floors').append(b);
});
$('pattern').querySelectorAll('button').forEach(b => b.onclick = () => { st.pat = b.dataset.p; show(); });
st.floor = data.floors.find(t => has(st.set, 's', t.id))?.id || data.floors[0].id;

function show() {
  const p = has(st.set, st.pat, st.floor) ? st.pat : 's';
  for (const b of $('sets').children) b.classList.toggle('on', b.dataset.id === st.set);
  for (const b of $('floors').children) {
    b.classList.toggle('on', b.dataset.id === st.floor); b.disabled = !has(st.set, 's', b.dataset.id);
  }
  for (const b of $('pattern').children) b.classList.toggle('on', b.dataset.p === st.pat);
  $('shot').src = `img/${st.set}_${p}_${st.floor}.jpg`;
  const set = data.sets.find(s => s.id === st.set);
  $('caption').textContent = `Пол: ${T[st.floor].name}, ${st.pat === 'd' ? 'ромбом' : 'прямо'}. Стены: ${set.name}.`;
  recalc();
}

function recalc() {
  const set = data.sets.find(s => s.id === st.set);
  const room = { w: +$('w').value, d: +$('d').value, h: +$('h').value, door: $('door').checked, window: $('win').checked };
  if (!(room.w > 0.5 && room.d > 0.5 && room.h > 1.5)) return;
  const walls = Object.fromEntries(Object.entries(set.walls).map(([k, id]) => [k, T[id]]));
  const r = calc(room, T[st.floor], walls, st.pat === 'd');
  $('rows').innerHTML = '<tr><th>Где</th><th>Плитка</th><th>м²</th><th>целых</th><th>подрезок</th><th>штук</th></tr>' +
    r.rows.map(x => `<tr><td>${x.name}</td><td>${x.tile}</td><td>${x.area.toFixed(2)}</td><td>${x.full}</td><td>${x.cut}</td><td>${x.need}</td></tr>`).join('');
  $('buy').innerHTML = '<tr><th>Плитка</th><th>штук</th><th>коробок</th><th>за штуку</th><th>сумма</th></tr>' +
    r.buy.map(b => `<tr><td><a href="${b.t.url}" target="_blank" rel="noopener">${b.t.name}</a> ${b.t.len}×${b.t.wid}</td>` +
      `<td>${b.pcs} <small>(${b.need} + запас)</small></td><td>${b.boxes} × ${b.t.pack_pcs} шт</td><td>${rub(b.piece)}</td><td>${rub(b.rub)}</td></tr>`).join('');
  $('total').textContent = rub(r.total);
}
show();
