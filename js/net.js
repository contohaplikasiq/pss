'use strict';
/* PASUNDAN SETIA SEJAHTERA · net — API, antrean offline (idempoten), sinkron berbasis versi */
let ONLINE = navigator.onLine, flushing = false, syncing = false;
class NetErr extends Error {}
function setOnline(v) { if (ONLINE !== v) { ONLINE = v; updateStatus(); if (v) { flushSoon(); syncSoon(); } } }

async function API(action, data, opt) {
  opt = opt || {};
  if (!CFG.GAS_URL || /GANTI/.test(CFG.GAS_URL)) throw new Error('GAS_URL belum diisi di js/config.js');
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), opt.timeout || 30000); let res;
  try {
    res = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, data: data || {}, token: opt.noAuth ? undefined : (opt.token || S.token) }), signal: ctl.signal });
  } catch (e) { clearTimeout(to); setOnline(false); throw new NetErr('Tidak dapat terhubung ke server.'); }
  clearTimeout(to); let j;
  try { j = await res.json(); } catch (e) { setOnline(false); throw new NetErr('Respons server tidak valid. Pastikan deployment: Execute as "Me", akses "Anyone".'); }
  setOnline(true); return j;
}
// Panggilan langsung dari UI (butuh internet). Melempar Error berisi pesan ramah.
async function call(action, data, opt) {
  const j = await API(action, data, opt);
  if (!j.success) { if (j.code === 'SESI_HABIS') needRelogin(); throw new Error(j.message || 'Gagal'); }
  return j;
}
const needNet = e => e instanceof NetErr ? 'Fitur ini butuh internet. Sambungkan lalu coba lagi.' : e.message;

/* ---------- antrean ---------- */
const flushSoon = debounce(() => flushQ(), 300), syncSoon = debounce(() => syncNow(), 600);
function enqueue(action, data, label) {
  const it = { id: uid('Q'), action, data, label: label || action, ts: Date.now(), state: 'WAIT', tries: 0, user: S.user && S.user.username };
  Q.push(it); saveQ(); applyEffect(it); saveState(); flushSoon(); return it;
}
async function tokenFor(it) { if (S.user && it.user === S.user.username && S.token) return S.token; const r = await kv.get('tok:' + it.user); return r && r.token; }
async function flushQ() {
  if (flushing || !Q.some(x => x.state === 'WAIT')) return; flushing = true; updateStatus();
  try {
    for (;;) {
      const it = Q.find(x => x.state === 'WAIT'); if (!it) break;
      const tk = await tokenFor(it);
      if (!tk) { rejectItem(it, 'Sesi ' + it.user + ' tidak ada. Masuk sebagai ' + it.user + ' untuk mengirim.'); continue; }
      let res; try { res = await API(it.action, it.data, { token: tk, timeout: 40000 }); } catch (e) { if (e instanceof NetErr) break; rejectItem(it, e.message); continue; }
      it.tries++;
      if (res.success) { Q = Q.filter(x => x !== it); onQueued(it, res); saveQ(); }
      else if (res.code === 'SESI_HABIS') { if (S.user && it.user === S.user.username) { needRelogin(); saveQ(); break; } rejectItem(it, 'Sesi ' + it.user + ' berakhir — masuk sebagai ' + it.user + ' untuk mengirim.'); }
      else rejectItem(it, res.message);
    }
  } finally { flushing = false; updateStatus(); }
  if (!Q.some(x => x.state === 'WAIT')) syncSoon();
}
function rejectItem(it, msg) { it.state = 'REVIEW'; it.err = msg; ['Barang', 'Piutang', 'Payments', 'Customers'].forEach(k => { S.vers[k] = -1; }); saveQ(); saveState(); }
function onQueued(it, res) {
  const d = res.data || {};
  if (it.action === 'trx.save' && d.trx) upsertTrx(d.trx);
  if (it.action === 'shift.close' && d.shift) { if (S.shift && S.shift.id_shift === d.shift.id_shift) S.shift = d.shift; const i = S.shifts.findIndex(x => x.id_shift === d.shift.id_shift); if (i >= 0) S.shifts[i] = d.shift; }
  ['Piutang', 'Payments', 'Customers'].forEach(k => { S.vers[k] = -1; });
  saveState(); syncSoon(); if (window.refresh) refresh();
}
/* efek lokal agar layar langsung benar saat offline. part: B stok, P piutang, C pelanggan */
function applyEffect(it, only) {
  const d = it.data, B = !only || only === 'B', P = !only || only === 'P', C = !only || only === 'C';
  if (it.action === 'trx.save') { if (B) localDeduct(d.items, 1); if (P && d.metode_bayar === 'Kredit') localPiutang(d); }
  else if (it.action === 'stock.ops' && B) d.ops.forEach(op => { const b = barangOf(op.id_barang); if (!b) return; if (op.type === 'WASTE') b.stok = round3(num(b.stok) - num(op.qty)); else if (op.type === 'OPNAME') b.stok = num(op.fisik); });
  else if (it.action === 'purchase.save' && B) d.items.forEach(i => { const b = barangOf(i.id_barang); if (b) b.stok = round3(num(b.stok) + num(i.qty)); });
  else if (it.action === 'piutang.bayar' && P) localBayar(d);
  else if (it.action === 'pelanggan.save' && C) { const i = S.customers.findIndex(x => x.id_pelanggan === d.id_pelanggan); const rec = Object.assign({ aktif: true }, i >= 0 ? S.customers[i] : {}, d, { _local: true }); if (i >= 0) S.customers[i] = rec; else S.customers.push(rec); }
}
function localPiutang(d) {
  if (S.piutang.some(p => p.id_transaksi === d.id_transaksi)) return;
  const c = S.customers.find(x => x.id_pelanggan === d.id_pelanggan) || {}, dp = num(d.dp), tot = num(d.total_klien);
  S.piutang.push({ id_transaksi: d.id_transaksi, no_nota: d.no_nota, tgl: String(d.tanggal_waktu).substr(0, 10), id_pelanggan: d.id_pelanggan, pelanggan: c.nama || d.pelanggan || '', telp: c.telp || '', total: tot, dibayar: dp, jatuh_tempo: d.jatuh_tempo || '', status: dp >= tot ? 'LUNAS' : 'BELUM LUNAS', kasir: S.user ? S.user.username : '', _local: true });
  if (dp > 0 && d.id_bayar && !S.payments.some(x => x.id_bayar === d.id_bayar)) S.payments.push({ id_bayar: d.id_bayar, id_transaksi: d.id_transaksi, no_nota: d.no_nota, no_kuitansi: d.no_kuitansi, tanggal_waktu: d.tanggal_waktu, jumlah: dp, metode: d.dp_metode || 'Tunai', petugas: S.user ? S.user.username : '', shift_id: d.shift_id, catatan: 'DP / uang muka', status: 'OK', _local: true });
}
function localBayar(d) {
  const p = S.piutang.find(x => x.id_transaksi === d.id_transaksi); if (!p || S.payments.some(x => x.id_bayar === d.id_bayar)) return;
  p.dibayar = num(p.dibayar) + num(d.jumlah); if (p.dibayar >= num(p.total)) p.status = 'LUNAS';
  S.payments.push({ id_bayar: d.id_bayar, id_transaksi: d.id_transaksi, no_nota: p.no_nota, no_kuitansi: d.no_kuitansi, tanggal_waktu: d.tanggal_waktu, jumlah: num(d.jumlah), metode: d.metode, petugas: S.user ? S.user.username : '', shift_id: d.shift_id, catatan: d.catatan || '', status: 'OK', _local: true });
}
const reapplyQueue = only => Q.filter(x => x.state === 'WAIT').forEach(x => applyEffect(x, only));
function upsertTrx(t) { delete t._local; t.items = t.items || []; const i = S.trx.findIndex(x => x.id_transaksi === t.id_transaksi); if (i >= 0) { S.trx[i] = Object.assign(S.trx[i], t); delete S.trx[i]._local; } else S.trx.push(t); }

/* ---------- sinkron ---------- */
async function syncNow() {
  if (syncing || flushing || !S.token || !S.user) return;
  if (Q.some(x => x.state === 'WAIT')) return flushQ();
  syncing = true; updateStatus();
  try {
    const res = await API('sync', { vers: S.vers, trxRow: S.trxRow, logRow: S.logRow, hari: S.hari }, { timeout: 40000 });
    if (res.success) mergeSync(res.data); else if (res.code === 'SESI_HABIS') needRelogin();
  } catch (e) {} finally { syncing = false; updateStatus(); }
}
function mergeSync(d) {
  ['cfg', 'suppliers', 'purchases', 'expenses', 'shifts', 'users', 'customers', 'piutang', 'payments'].forEach(k => { if (d[k] !== undefined) S[k] = d[k]; });
  if (d.barang) S.barang = d.barang.sort((a, b) => a.nama.localeCompare(b.nama));
  Object.assign(S.vers, d.vers); S.hari = d.hari;
  if (d.trx) {
    if (d.trx.reset) { const lokal = S.trx.filter(t => t._local); S.trx = d.trx.rows; lokal.forEach(l => { if (!S.trx.some(x => x.id_transaksi === l.id_transaksi)) S.trx.push(l); }); }
    else d.trx.rows.forEach(upsertTrx);
    S.trxRow = d.trx.row; (d.trx.voids || []).forEach(v => { const t = S.trx.find(x => x.id_transaksi === v.id_transaksi); if (t) Object.assign(t, v); });
    if (d.trx.more) syncSoon();
  }
  if (d.logs) { if (d.logs.reset) S.logs = d.logs.rows; else S.logs = S.logs.concat(d.logs.rows).slice(-600); S.logRow = d.logs.row; if (d.logs.more) syncSoon(); }
  const hari = todayStr(); S.trx = S.trx.filter(t => String(t.tanggal_waktu).substr(0, 10) >= addDaysStr(hari, -1));
  if (d.barang) reapplyQueue('B'); if (d.piutang || d.payments) reapplyQueue('P'); if (d.customers) reapplyQueue('C');
  S.lastSync = Date.now(); saveState(); if (window.refresh) refresh();
}
async function ping() {
  if (ONLINE && !Q.some(x => x.state === 'WAIT')) return;
  try { const r = await fetch(CFG.GAS_URL + '?ping=' + Date.now(), { cache: 'no-store' }); if (r.ok) { setOnline(true); flushSoon(); syncSoon(); } } catch (e) { setOnline(false); }
}
function startLoops() {
  setInterval(() => { if (document.hidden) return; if (Q.some(x => x.state === 'WAIT')) flushQ(); else if (S.token && Date.now() - S.lastSync > CFG.SYNC_MS - 1000) syncNow(); }, 15000);
  setInterval(ping, 20000);
  addEventListener('online', ping); addEventListener('offline', () => setOnline(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { ping(); if (S.token) syncSoon(); } });
}
