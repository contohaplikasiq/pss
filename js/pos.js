'use strict';
/* PASUNDAN SETIA SEJAHTERA · pos — Kasir (harga bertingkat, satuan ganda, kredit), Riwayat nota, Biaya, Dashboard */
const POS = { cart: [], cat: 'Semua', q: '', level: 'Eceran', pel: '', kirim: '', cat2: '', diskon: 0, diskonMode: 'rp', open: false };

/* ================= KASIR ================= */
const lineSub = l => Math.round(num(l.harga) * num(l.qty));
function posTotals() { const t = POS.cart.reduce((a, l) => a + lineSub(l), 0), dis = POS.diskonMode === 'pct' ? Math.round(t * num(POS.diskon) / 100) : num(POS.diskon); return calcTotals(t, dis); }
function repriceCart() { POS.cart.forEach(l => { if (l.id_barang && !l.manual) { const b = barangOf(l.id_barang); if (b) l.harga = hargaSat(b, POS.level, l.sat); } }); }
PAGES.pos = {
  title: 'Kasir', live: false,
  render() {
    if (!S.shift && !isOwner()) { $('#pg-pos').innerHTML = '<div class="empty"><div class="big">🔒</div>Shift belum dibuka. Keluar lalu masuk kembali untuk membuka shift.</div>'; return; }
    $('#pg-pos').innerHTML = (!S.shift ? '<div class="note mb">Anda masuk tanpa shift (mode lihat laporan). Transaksi tidak masuk rekonsiliasi kas — masuk ulang untuk membuka shift.</div>' : '') +
      '<div class="pos"><div class="pos-l"><div class="row"><input class="in" id="pSearch" data-in="posQ" placeholder="🔍 Cari nama / kode barang…" value="' + esc(POS.q) + '" autocomplete="off"><button class="btn" data-act="heldList">📌 <span id="heldN">' + S.held.length + '</span></button></div><div class="cats" id="pCats"></div><div id="pGrid" class="plist"></div></div>' +
      '<aside class="card cart" id="cart"></aside></div><button id="cartbar" class="none" data-act="cartOpen"></button>';
    this.cats(); this.grid(); this.cart();
  },
  cats() { const ks = ['Semua'].concat([...new Set(S.barang.map(m => m.kategori))]); $('#pCats').innerHTML = ks.map(k => '<button class="tab' + (POS.cat === k ? ' on' : '') + '" data-act="posCat" data-k="' + esc(k) + '">' + esc(k) + '</button>').join(''); },
  grid() {
    const q = POS.q.toLowerCase(), list = S.barang.filter(m => (POS.cat === 'Semua' || m.kategori === POS.cat) && (!q || (m.nama + ' ' + m.kode).toLowerCase().includes(q))), blok = num(cfg().blokir_stok);
    $('#pGrid').innerHTML = list.length ? list.slice(0, 200).map(b => {
      const s = stokStatus(b), off = blok && num(b.stok) <= 0, n = POS.cart.filter(l => l.id_barang === b.id_barang).reduce((a, l) => a + l.qty, 0);
      return '<button class="prow' + (off ? ' off' : '') + '" data-act="posAdd" data-id="' + b.id_barang + '"' + (off ? ' disabled' : '') + '><div class="sp" style="min-width:0"><div class="nm">' + esc(b.nama) + (n ? ' <span class="qb">' + qfmt(n) + '</span>' : '') + '</div><div class="xs muted">' + esc(b.kode ? b.kode + ' · ' : '') + esc(b.kategori) + ' · stok <b style="color:' + (s === 'habis' ? 'var(--bad)' : s === 'tipis' ? 'var(--warn)' : 'inherit') + '">' + qfmt(b.stok) + ' ' + esc(b.satuan) + '</b></div></div><div class="pr">' + rp(hargaLevel(b, POS.level)) + '<span class="xs muted">/' + esc(b.satuan) + '</span></div></button>';
    }).join('') : '<div class="empty"><div class="big">📦</div>' + (S.barang.length ? 'Barang tidak ditemukan.' : 'Belum ada barang. ' + (isOwner() ? 'Tambahkan di Barang & Stok.' : 'Minta Owner menambahkan barang.')) + '</div>';
  },
  cart() {
    const T = posTotals(), c = cfg(), n = POS.cart.length, pel = pelOf(POS.pel);
    $('#cart').classList.toggle('open', POS.open);
    $('#cart').innerHTML = '<div class="row mb"><h3 style="margin:0">🧾 Nota</h3><span class="sp"></span><button class="btn sm gh" data-act="cartClose" style="display:' + (window.innerWidth <= 900 ? 'inline-flex' : 'none') + '">✕ Tutup</button>' + (n ? '<button class="btn sm dng" data-act="posClear">Kosongkan</button>' : '') + '</div>' +
      '<div class="seg mb">' + LEVEL.map(x => '<button class="' + (POS.level === x ? 'on' : '') + '" data-act="posLevel" data-k="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<button class="btn blk mb" data-act="posPel" style="justify-content:space-between"><span>👤 ' + (pel ? '<b>' + esc(pel.nama) + '</b>' : 'Pelanggan umum') + '</span><span class="muted xs">' + (pel && piutangPel(pel.id_pelanggan) ? 'piutang ' + rp(piutangPel(pel.id_pelanggan)) : 'pilih ›') + '</span></button>' +
      '<div class="body">' + (n ? POS.cart.map((l, i) => {
        const b = barangOf(l.id_barang);
        return '<div class="ci"><div class="sp"><div class="row"><div class="nm sp">' + esc(l.nama) + '</div><button class="ibtn" style="width:30px;height:30px" data-act="posDel" data-i="' + i + '" aria-label="Hapus">✕</button></div>' +
          '<div class="row mt" style="flex-wrap:wrap"><div class="qty"><button data-act="posQty" data-i="' + i + '" data-d="-1">−</button><input class="qin" data-in="cQty" data-i="' + i + '" inputmode="decimal" value="' + qfmt(l.qty) + '"><button data-act="posQty" data-i="' + i + '" data-d="1">+</button></div>' +
          (b && b.satuan2 ? '<select class="sel" style="width:auto;min-height:36px" data-ch="cSat" data-i="' + i + '"><option>' + esc(b.satuan) + '</option><option' + (l.sat === b.satuan2 ? ' selected' : '') + '>' + esc(b.satuan2) + '</option></select>' : '<span class="xs muted">' + esc(l.sat) + '</span>') +
          '<input class="in m" style="flex:1;min-width:90px;min-height:36px" data-money data-in="cHrg" data-i="' + i + '" inputmode="numeric" value="' + rpn(l.harga) + '" aria-label="Harga satuan">' + (l.manual ? '<span class="chip warn xs" title="Harga diubah manual">nego</span>' : '') + '</div>' +
          '<div class="r b sm mt" id="ls' + i + '">' + rp(lineSub(l)) + '</div></div></div>';
      }).join('') : '<div class="empty" style="padding:24px 8px"><div class="big">🛒</div>Ketuk barang untuk menambah ke nota.</div>') + '</div>' +
      '<div class="row mt"><button class="btn sm" data-act="posExtra">＋ Ongkir / jasa</button><input class="in" style="min-height:36px" data-in="posKirim" placeholder="Alamat kirim (opsional)" value="' + esc(POS.kirim) + '"></div>' +
      '<div class="tot" id="cartTot">' + this.totHTML(T, c) + '</div>' +
      '<div class="row mt"><button class="btn" data-act="posHold"' + (n ? '' : ' disabled') + '>📌 Simpan</button><button class="btn pri lg sp" data-act="posPay"' + (n ? '' : ' disabled') + '>Bayar ' + (T.total ? rp(T.total) : '') + '</button></div>';
    this.bar(T);
  },
  totHTML(T, c) {
    return (POS.cart.length ? '<div class="row mb"><span class="sm muted">Diskon</span><input class="in m" style="max-width:110px;min-height:36px" data-money data-in="posDis" inputmode="numeric" value="' + (POS.diskon ? rpn(POS.diskon) : '') + '" placeholder="0"><div class="seg" style="min-width:92px"><button class="' + (POS.diskonMode === 'rp' ? 'on' : '') + '" data-act="posDM" data-k="rp">Rp</button><button class="' + (POS.diskonMode === 'pct' ? 'on' : '') + '" data-act="posDM" data-k="pct">%</button></div></div>' : '') +
      '<div class="tr"><span>Subtotal</span><b>' + rp(T.sub) + '</b></div>' + (T.diskon ? '<div class="tr"><span>Diskon</span><b>−' + rp(T.diskon) + '</b></div>' : '') + (T.pajak ? '<div class="tr"><span>Pajak ' + num(c.pajak_persen) + '%</span><b>' + rp(T.pajak) + '</b></div>' : '') + '<div class="tr gt"><span>Total</span><span>' + rp(T.total) + '</span></div>';
  },
  bar(T) { const cb = $('#cartbar'); if (!cb) return; cb.classList.toggle('none', !POS.cart.length); cb.innerHTML = '<span>🛒 ' + POS.cart.length + ' baris</span><span>' + rp(T.total) + ' ›</span>'; },
  soft() { const T = posTotals(); const t = $('#cartTot'); if (t) { const a = document.activeElement, k = a && a.dataset.in; t.innerHTML = this.totHTML(T, cfg()); if (k) { const n = $('[data-in=' + k + ']', t); if (n && n !== a) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } } } POS.cart.forEach((l, i) => { const e = $('#ls' + i); if (e) e.textContent = rp(lineSub(l)); }); const pb = $('[data-act=posPay]'); if (pb) pb.textContent = 'Bayar ' + (T.total ? rp(T.total) : ''); this.bar(T); },
  refresh() { if (!$('#pGrid')) return this.render(); this.grid(); },
  totals: posTotals
};
INP.posQ = el => { POS.q = el.value; PAGES.pos.grid(); };
INP.posKirim = el => { POS.kirim = el.value; };
INP.posDis = el => { POS.diskon = mv(el); PAGES.pos.soft(); };
INP.cQty = el => { const l = POS.cart[+el.dataset.i]; if (l) { l.qty = num(String(el.value).replace(',', '.')); PAGES.pos.soft(); } };
INP.cHrg = el => { const l = POS.cart[+el.dataset.i]; if (!l) return; l.harga = mv(el); const b = barangOf(l.id_barang); l.manual = !l.id_barang || !b ? l.manual : l.harga !== hargaSat(b, POS.level, l.sat); PAGES.pos.soft(); };
CHG.cSat = el => { const l = POS.cart[+el.dataset.i], b = l && barangOf(l.id_barang); if (!b) return; l.sat = el.value; l.manual = false; l.harga = hargaSat(b, POS.level, l.sat); PAGES.pos.cart(); };
ACT.posCat = el => { POS.cat = el.dataset.k; PAGES.pos.cats(); PAGES.pos.grid(); };
ACT.posLevel = el => { POS.level = el.dataset.k; POS.cart.forEach(l => { l.manual = false; }); repriceCart(); PAGES.pos.cart(); PAGES.pos.grid(); };
ACT.posDM = el => { POS.diskonMode = el.dataset.k; PAGES.pos.cart(); };
ACT.cartOpen = () => { POS.open = true; PAGES.pos.cart(); };
ACT.cartClose = () => { POS.open = false; PAGES.pos.cart(); };
ACT.posClear = async () => { if (await confirmDlg('Kosongkan semua baris nota?', { danger: true, ok: 'Kosongkan' })) resetCart(); };
function resetCart() { Object.assign(POS, { cart: [], level: 'Eceran', pel: '', kirim: '', cat2: '', diskon: 0, diskonMode: 'rp', open: false }); PAGES.pos.render(); }
ACT.posQty = el => { const i = +el.dataset.i, l = POS.cart[i]; if (!l) return; l.qty = Math.max(0, round3(num(l.qty) + +el.dataset.d)); if (l.qty <= 0) POS.cart.splice(i, 1); PAGES.pos.cart(); PAGES.pos.grid(); };
ACT.posDel = el => { POS.cart.splice(+el.dataset.i, 1); PAGES.pos.cart(); PAGES.pos.grid(); };
ACT.posAdd = el => {
  const b = barangOf(el.dataset.id); if (!b) return; const sat = b.satuan, ex = POS.cart.find(l => l.id_barang === b.id_barang && l.sat === sat && !l.manual);
  if (ex) ex.qty = round3(num(ex.qty) + 1); else POS.cart.push({ id_barang: b.id_barang, nama: b.nama, sat, qty: 1, harga: hargaSat(b, POS.level, sat), manual: false });
  PAGES.pos.cart(); PAGES.pos.grid(); if (navigator.vibrate) navigator.vibrate(8);
};
ACT.posExtra = () => {
  const m = openModal({ title: 'Baris tambahan (tanpa stok)', body: '<div class="fld"><label>Keterangan</label><input class="in" id="xN" list="xL" placeholder="mis. Ongkos kirim / Jasa pasang"><datalist id="xL"><option>Ongkos kirim</option><option>Jasa pasang</option><option>Bongkar muat</option></datalist></div><div class="grid2"><div class="fld"><label>Jumlah</label><input class="in m" id="xQ" inputmode="decimal" value="1"></div><div class="fld"><label>Harga (Rp)</label><input class="in m" id="xH" data-money inputmode="numeric"></div></div><div id="xE" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="xOk">Tambah</button>' });
  $('#xOk', m.el).onclick = () => { const nm = $('#xN', m.el).value.trim(), q = num(String($('#xQ', m.el).value).replace(',', '.')), h = mv($('#xH', m.el)); if (!nm || q <= 0 || h <= 0) { $('#xE', m.el).textContent = 'Isi keterangan, jumlah, dan harga.'; $('#xE', m.el).classList.remove('hidden'); return; } POS.cart.push({ id_barang: '', nama: nm, sat: 'ls', qty: q, harga: h, manual: false }); m.close(); PAGES.pos.cart(); };
};
ACT.posPel = () => {
  const m = openModal({ title: 'Pilih pelanggan', body: '', wide: true }); let q = '';
  const draw = () => {
    const ql = q.toLowerCase(), list = S.customers.filter(c => !ql || (c.nama + ' ' + c.telp).toLowerCase().includes(ql)).slice(0, 40);
    m.setBody('<div class="row mb"><input class="in" id="plQ" placeholder="🔍 Cari nama / HP…" value="' + esc(q) + '"><button class="btn pri" id="plNew">＋ Baru</button></div><button class="btn blk mb" data-pick="">👤 Pelanggan umum (tanpa data)</button>' +
      (list.length ? '<div class="list">' + list.map(c => '<div class="it" style="cursor:pointer" data-pick="' + esc(c.id_pelanggan) + '"><div class="sp"><b>' + esc(c.nama) + '</b><div class="xs muted">' + esc(c.telp || '') + (c.alamat ? ' · ' + esc(c.alamat) : '') + '</div></div><span class="chip">' + esc(c.level) + '</span>' + (isOn(c.kredit) ? '<span class="chip ok">kredit</span>' : '') + (piutangPel(c.id_pelanggan) ? '<span class="chip warn">' + rp(piutangPel(c.id_pelanggan)) + '</span>' : '') + '</div>').join('') + '</div>' : '<div class="empty" style="padding:20px">Pelanggan tidak ditemukan.</div>'));
    const i = $('#plQ', m.el); i.oninput = e => { q = e.target.value; draw(); const n = $('#plQ', m.el); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
    $('#plNew', m.el).onclick = () => { m.close(); pelForm(null, id => { if (id) pickPel(id); }); };
  };
  draw();
  m.el.addEventListener('click', e => { const p = e.target.closest('[data-pick]'); if (!p) return; pickPel(p.dataset.pick); m.close(); });
};
function pickPel(id) { POS.pel = id; const c = pelOf(id); if (c) { POS.level = c.level || 'Eceran'; if (c.alamat && !POS.kirim) POS.kirim = c.alamat; } POS.cart.forEach(l => { l.manual = false; }); repriceCart(); PAGES.pos.cart(); PAGES.pos.grid(); }

/* pesanan tersimpan (hold) */
ACT.posHold = () => { if (!POS.cart.length) return; S.held.push({ id: uid('H'), t: Date.now(), cart: POS.cart, level: POS.level, pel: POS.pel, kirim: POS.kirim }); saveState(); resetCart(); toast('Nota disimpan. Buka lewat tombol 📌', 'ok'); };
ACT.heldList = () => {
  const m = openModal({ title: 'Nota tersimpan', body: '' });
  const draw = () => m.setBody(S.held.length ? '<div class="list">' + S.held.map(h => '<div class="it"><div class="sp"><b>' + esc((pelOf(h.pel) || {}).nama || 'Pelanggan umum') + '</b><div class="xs muted">' + h.cart.length + ' baris · ' + rp(h.cart.reduce((a, l) => a + lineSub(l), 0)) + ' · ' + jam(nowStr(new Date(h.t))) + '</div></div><button class="btn sm pri" data-hid="' + h.id + '" data-do="open">Buka</button><button class="btn sm dng" data-hid="' + h.id + '" data-do="del">Hapus</button></div>').join('') + '</div>' : '<div class="empty"><div class="big">📌</div>Tidak ada nota tersimpan.</div>');
  draw();
  m.el.addEventListener('click', e => { const b = e.target.closest('[data-hid]'); if (!b) return; const h = S.held.find(x => x.id === b.dataset.hid); if (!h) return;
    if (b.dataset.do === 'del') { S.held = S.held.filter(x => x !== h); saveState(); draw(); $('#heldN').textContent = S.held.length; return; }
    if (POS.cart.length) { toast('Selesaikan/simpan nota yang sedang dibuat dulu', 'bad'); return; }
    Object.assign(POS, { cart: h.cart, level: h.level, pel: h.pel, kirim: h.kirim }); repriceCart(); S.held = S.held.filter(x => x !== h); saveState(); m.close(); PAGES.pos.render(); });
};

/* pembayaran */
function nextNo(seri) { const k = seri ? 'counterK' : 'counter', d = todayStr(); if (S[k].d !== d) S[k] = { d, n: 0 }; S[k].n++; return (seri || 'PSS') + '-' + d.replace(/-/g, '').slice(2) + '-' + String(S.user.username).slice(0, 2).toUpperCase() + '-' + String(S[k].n).padStart(3, '0'); }
ACT.posPay = () => {
  POS.cart = POS.cart.filter(l => num(l.qty) > 0); if (!POS.cart.length) return PAGES.pos.cart();
  const T = posTotals(), own = isOwner(), c = cfg(), pel = pelOf(POS.pel);
  if (!own && T.diskon > Math.round(T.sub * num(c.diskon_maks_kasir) / 100)) { toast('Diskon melebihi batas kasir (' + c.diskon_maks_kasir + '%). Minta Owner.', 'bad'); return; }
  if (num(c.blokir_stok)) { const need = {}; POS.cart.forEach(l => { if (l.id_barang) need[l.id_barang] = (need[l.id_barang] || 0) + baseQty(l); }); const k = Object.keys(need).map(barangOf).filter(Boolean).find(b => num(b.stok) + 1e-9 < need[b.id_barang]); if (k) { toast('Stok ' + k.nama + ' tidak cukup untuk nota ini', 'bad'); return; } }
  const kreditOk = pel && isOn(pel.kredit); let metode = 'Tunai', tunai = 0, dp = 0, dpm = 'Tunai', jt = addDaysStr(todayStr(), num(c.jatuh_tempo_hari) || 14);
  const m = openModal({ title: 'Pembayaran', body: '', foot: '' });
  const draw = () => {
    const kem = tunai - T.total, quick = [...new Set([T.total, Math.ceil(T.total / 50000) * 50000, Math.ceil(T.total / 100000) * 100000, 500000, 1000000].filter(x => x >= T.total))].slice(0, 4);
    m.setBody('<div class="c mb"><div class="muted sm">Total tagihan' + (pel ? ' · ' + esc(pel.nama) : '') + '</div><div style="font-size:34px;font-weight:800;color:var(--primary)">' + rp(T.total) + '</div></div><div class="seg mb" style="flex-wrap:wrap">' + METODE.map(x => '<button class="' + (metode === x ? 'on' : '') + '" data-met="' + x + '"' + (x === 'Kredit' && !kreditOk ? ' disabled style="opacity:.45"' : '') + '>' + x + '</button>').join('') + '</div>' +
      (metode === 'Tunai' ? '<div class="fld"><label>Uang diterima</label><input class="in m" id="pTunai" data-money inputmode="numeric" style="font-size:22px;font-weight:700;min-height:54px" value="' + (tunai ? rpn(tunai) : '') + '" placeholder="0"></div><div class="quick mb">' + quick.map(q => '<button class="btn" data-q="' + q + '">' + (q === T.total ? 'Uang pas' : rpn(q)) + '</button>').join('') + '</div><div class="c b" id="pKem" style="font-size:18px;color:' + (kem >= 0 ? 'var(--ok)' : 'var(--bad)') + '">' + (tunai ? (kem >= 0 ? 'Kembalian ' + rp(kem) : 'Kurang ' + rp(-kem)) : '&nbsp;') + '</div>'
      : metode === 'Kredit' ? '<div class="note mb">Piutang <b>' + esc(pel ? pel.nama : '') + '</b> saat ini ' + rp(pel ? piutangPel(pel.id_pelanggan) : 0) + (num(pel && pel.limit_kredit) ? ' · limit ' + rp(pel.limit_kredit) : '') + '</div><div class="grid2"><div class="fld"><label>DP / uang muka (Rp)</label><input class="in m" id="pDp" data-money inputmode="numeric" value="' + (dp ? rpn(dp) : '') + '" placeholder="0"></div><div class="fld"><label>Jatuh tempo</label><input type="date" class="in" id="pJt" value="' + jt + '"></div></div>' + (dp ? '<div class="fld"><label>DP dibayar via</label><select class="sel" id="pDpm">' + METODE_BAYAR.map(x => '<option' + (dpm === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' : '') + '<div class="c b" id="pSisa">Sisa piutang ' + rp(Math.max(0, T.total - dp)) + '</div>'
      : '<div class="note c">Pastikan pembayaran ' + metode + ' sudah diterima sebelum konfirmasi.</div>') + (!kreditOk && pel ? '<div class="hint mt c">Kredit belum diizinkan untuk pelanggan ini (diatur Owner).</div>' : !pel ? '<div class="hint mt c">Pilih pelanggan terdaftar untuk opsi Kredit.</div>' : ''));
    m.setFoot('<button class="btn" data-x>Batal</button><button class="btn pri lg sp" id="pOk"' + (metode === 'Tunai' && tunai < T.total ? ' disabled' : '') + '>✓ Konfirmasi</button>');
  };
  draw();
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-met]'); if (b && !b.disabled) { metode = b.dataset.met; draw(); return; } const q = e.target.closest('[data-q]'); if (q) { tunai = +q.dataset.q; draw(); return; }
    if (e.target.closest('#pOk')) {
      if (metode === 'Tunai' && tunai < T.total) return;
      if (metode === 'Kredit') { dp = mv($('#pDp', m.el)); jt = $('#pJt', m.el).value || jt; if (dp > T.total) { toast('DP melebihi total', 'bad'); return; } const lim = num(pel.limit_kredit); if (lim > 0 && piutangPel(pel.id_pelanggan) + T.total - dp > lim) { toast('Melebihi limit kredit pelanggan (' + rp(lim) + ')', 'bad'); return; } }
      m.close(); finishPay(T, metode, metode === 'Tunai' ? tunai : T.total, dp, dpm, jt);
    }
  });
  m.el.addEventListener('input', e => {
    if (e.target.id === 'pTunai') { tunai = mv(e.target); const kem = tunai - T.total; $('#pOk', m.el).disabled = tunai < T.total; const x = $('#pKem', m.el); x.style.color = kem >= 0 ? 'var(--ok)' : 'var(--bad)'; x.textContent = tunai ? (kem >= 0 ? 'Kembalian ' + rp(kem) : 'Kurang ' + rp(-kem)) : ''; }
    if (e.target.id === 'pDp') { const had = dp > 0; dp = mv(e.target); $('#pSisa', m.el).textContent = 'Sisa piutang ' + rp(Math.max(0, T.total - dp)); if ((dp > 0) !== had) { draw(); const n = $('#pDp', m.el); n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }
  });
  m.el.addEventListener('change', e => { if (e.target.id === 'pDpm') dpm = e.target.value; if (e.target.id === 'pJt') jt = e.target.value; });
  const fi = $('#pTunai', m.el); if (fi && innerWidth > 900) fi.focus();
};
function finishPay(T, metode, tunai, dp, dpm, jt) {
  const pel = pelOf(POS.pel), id = 'TRX-' + todayStr().replace(/-/g, '').slice(2) + '-' + uid('').slice(1, 11), no = nextNo(), now = nowStr();
  const items = POS.cart.map(l => ({ id_barang: l.id_barang, nama: l.nama, sat: l.sat, qty: l.qty, harga: l.harga, catatan: l.catatan || '' }));
  const data = { id_transaksi: id, no_nota: no, tanggal_waktu: now, shift_id: S.shift ? S.shift.id_shift : '', tipe: POS.level, kirim: POS.kirim, id_pelanggan: POS.pel, pelanggan: pel ? pel.nama : 'Umum', telp: pel ? pel.telp : '', alamat: pel ? pel.alamat : '', catatan: POS.cat2, items, diskon: T.diskon, metode_bayar: metode, tunai, total_klien: T.total };
  if (metode === 'Kredit') Object.assign(data, { dp, dp_metode: dpm, jatuh_tempo: jt, id_bayar: uid('BYR'), no_kuitansi: nextNo('KW') });
  const lines = POS.cart.map(l => { const b = barangOf(l.id_barang); return { id_barang: l.id_barang, nama: l.nama, sat: l.sat, qty: l.qty, harga: l.harga, subtotal: lineSub(l), hpp: b && b.harga_beli ? Math.round(baseQty(l) * num(b.harga_beli)) : 0, catatan: '' }; });
  const trx = { id_transaksi: id, no_nota: no, tanggal_waktu: now, kasir: S.user.username, shift_id: data.shift_id, tipe: POS.level, kirim: POS.kirim, id_pelanggan: POS.pel, pelanggan: data.pelanggan, telp: data.telp, alamat: data.alamat, items: lines, subtotal: T.sub, diskon: T.diskon, pajak: T.pajak, total: T.total, metode_bayar: metode, tunai: metode === 'Kredit' ? dp : tunai, kembalian: metode === 'Tunai' ? tunai - T.total : 0, hpp: lines.reduce((a, l) => a + l.hpp, 0), catatan: POS.cat2, status: 'SUKSES', jatuh_tempo: metode === 'Kredit' ? jt : '', _local: true };
  S.trx.push(trx); enqueue('trx.save', data, 'Nota ' + no + ' · ' + rp(T.total));
  resetCart(); successDlg(trx);
}
function successDlg(t) {
  const pend = Q.some(x => x.data && x.data.id_transaksi === t.id_transaksi);
  openModal({ title: 'Nota ' + t.no_nota, sticky: true, body: '<div class="big-ok"><div class="ck">✅</div><div class="b" style="font-size:22px">' + rp(t.total) + '</div><div class="muted">' + esc(t.metode_bayar) + (t.metode_bayar === 'Kredit' ? ' · DP ' + rp(t.tunai) + ' · sisa <b>' + rp(num(t.total) - num(t.tunai)) + '</b>' : num(t.kembalian) ? ' · Kembalian <b>' + rp(t.kembalian) + '</b>' : '') + '</div>' + (pend && !ONLINE ? '<div class="chip warn mt">⏳ Tersimpan di perangkat — terkirim saat online</div>' : '') + '</div>',
    foot: '<button class="btn" data-act="pNota" data-id="' + t.id_transaksi + '">🖨️ Nota</button><button class="btn" data-act="pKwt" data-id="' + t.id_transaksi + '">🧾 Kuitansi</button>' + (t.telp ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(waLink(t.telp, waNota(t))) + '">💬</a>' : '') + '<button class="btn pri sp" data-x>Nota baru</button>' });
}

/* ================= RIWAYAT NOTA ================= */
const RW = { q: '', st: 'all', met: 'all', rangeRows: null, from: '', to: '' };
function riwayatList() { const own = isOwner(), base = RW.rangeRows || S.trx; return base.filter(t => own || t.kasir === S.user.username); }
const statusBayar = t => { if (t.metode_bayar !== 'Kredit') return ''; const p = S.piutang.find(x => x.id_transaksi === t.id_transaksi); return p ? (p.status === 'LUNAS' ? 'lunas' : 'sisa ' + rp(sisaPiutang(p))) : (t._local ? 'kredit' : 'lunas'); };
PAGES.riwayat = {
  title: 'Riwayat Nota', live: true,
  render() {
    const own = isOwner(), today = todayStr();
    $('#pg-riwayat').innerHTML = '<div class="row wrap mb"><input class="in" style="flex:1;min-width:180px" id="rwQ" data-in="rwQ" placeholder="🔍 Cari no. nota, pelanggan, barang, kasir…" value="' + esc(RW.q) + '"><select class="sel" style="max-width:150px" data-ch="rwSt"><option value="all">Semua status</option><option value="ok"' + (RW.st === 'ok' ? ' selected' : '') + '>Sukses</option><option value="void"' + (RW.st === 'void' ? ' selected' : '') + '>Void</option><option value="pend"' + (RW.st === 'pend' ? ' selected' : '') + '>Belum terkirim</option></select><select class="sel" style="max-width:150px" data-ch="rwMet"><option value="all">Semua bayar</option>' + METODE.map(x => '<option' + (RW.met === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
      (own ? '<div class="row wrap mb"><span class="sm muted">Tanggal lain:</span><input type="date" class="in" style="max-width:160px" id="rwFrom" value="' + (RW.from || today) + '"><span>–</span><input type="date" class="in" style="max-width:160px" id="rwTo" value="' + (RW.to || today) + '"><button class="btn" data-act="rwLoad">Muat</button>' + (RW.rangeRows ? '<button class="btn gh" data-act="rwReset">↩ Hari ini</button>' : '') + '</div>' : '') + '<div id="rwBody"></div>';
    this.body();
  },
  body() {
    const q = RW.q.toLowerCase(), pend = new Set(Q.filter(x => x.action === 'trx.save').map(x => x.data.id_transaksi));
    let list = riwayatList().filter(t => (RW.st === 'all' || (RW.st === 'ok' && t.status !== 'VOID') || (RW.st === 'void' && t.status === 'VOID') || (RW.st === 'pend' && (t._local || pend.has(t.id_transaksi)))) && (RW.met === 'all' || t.metode_bayar === RW.met) &&
      (!q || [t.no_nota, t.kirim, t.pelanggan, t.telp, t.kasir, ...(t.items || []).map(i => i.nama)].join(' ').toLowerCase().includes(q)));
    list = list.slice().sort((a, b) => String(b.tanggal_waktu).localeCompare(String(a.tanggal_waktu)));
    const ok = list.filter(t => t.status !== 'VOID'), tot = ok.reduce((a, t) => a + num(t.total), 0);
    $('#rwBody').innerHTML = '<div class="row mb sm muted"><span><b>' + ok.length + '</b> nota</span><span>·</span><span>Total <b>' + rp(tot) + '</b></span>' + (RW.rangeRows ? '<span class="chip info">' + esc(tglIndo(RW.from)) + ' – ' + esc(tglIndo(RW.to)) + '</span>' : '') + '</div>' +
      (list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>No. nota</th><th>Waktu</th><th>Pelanggan / barang</th><th>Bayar</th><th class="r">Total</th></tr></thead><tbody>' + list.slice(0, 300).map(t => '<tr class="click" data-act="trxOpen" data-id="' + esc(t.id_transaksi) + '"><td><b>' + esc(t.no_nota) + '</b></td><td class="sm">' + (RW.rangeRows ? esc(String(t.tanggal_waktu).substr(5, 11)) : jam(t.tanggal_waktu)) + '</td><td class="sm"><b>' + esc(t.pelanggan || 'Umum') + '</b><div class="xs muted">' + esc((t.items || []).map(i => qfmt(i.qty) + ' ' + i.nama).join(', ')).slice(0, 80) + '</div></td><td class="sm">' + esc(t.metode_bayar) + (statusBayar(t) ? '<div class="xs muted">' + statusBayar(t) + '</div>' : '') + '</td><td class="r b">' + rp(t.total) + (t.status === 'VOID' ? ' <span class="chip bad">VOID</span>' : '') + (t._local || pend.has(t.id_transaksi) ? ' <span class="chip warn">⏳</span>' : '') + '</td></tr>').join('') + '</tbody></table></div>' + (list.length > 300 ? '<div class="hint mt">Menampilkan 300 nota terbaru dari ' + list.length + '. Persempit pencarian atau lihat Laporan.</div>' : '') : '<div class="empty"><div class="big">🧾</div>Belum ada nota' + (RW.q ? ' yang cocok.' : ' hari ini.') + '</div>');
  },
  refresh() { if ($('#rwBody')) this.body(); else this.render(); }
};
INP.rwQ = el => { RW.q = el.value; PAGES.riwayat.body(); };
CHG.rwSt = el => { RW.st = el.value; PAGES.riwayat.body(); }; CHG.rwMet = el => { RW.met = el.value; PAGES.riwayat.body(); };
ACT.rwReset = () => { RW.rangeRows = null; RW.from = RW.to = ''; PAGES.riwayat.render(); };
ACT.rwLoad = async () => {
  const f = $('#rwFrom').value, t = $('#rwTo').value; if (!f || !t || f > t) { toast('Rentang tanggal tidak valid', 'bad'); return; }
  try { const r = await call('trx.range', { from: f, to: t }); RW.rangeRows = r.data.rows; RW.from = f; RW.to = t; PAGES.riwayat.render(); if (r.data.total > r.data.rows.length) toast('Hanya ' + r.data.rows.length + ' nota terbaru yang dimuat. Persempit tanggal.', 'bad'); } catch (e) { toast(needNet(e), 'bad'); }
};
ACT.trxOpen = el => {
  const id = el.dataset.id, t = trxById(id); if (!t) return; const own = isOwner(), pend = Q.some(x => x.data && x.data.id_transaksi === id);
  openModal({ title: 'Nota ' + t.no_nota, wide: true, body: '<div class="row wrap mb"><span class="chip">' + esc(String(t.tanggal_waktu).substr(0, 16)) + '</span><span class="chip">' + esc(t.tipe) + '</span><span class="chip">Kasir ' + esc(t.kasir) + '</span><span class="chip">' + esc(t.metode_bayar) + '</span>' + (statusBayar(t) ? '<span class="chip warn">' + statusBayar(t) + '</span>' : '') + (t.status === 'VOID' ? '<span class="chip bad">VOID · ' + esc(t.void_alasan || '') + '</span>' : '') + (pend ? '<span class="chip warn">⏳ belum terkirim</span>' : '') + '</div>' +
    '<div class="sm mb"><b>' + esc(t.pelanggan || 'Umum') + '</b>' + (t.telp ? ' · ' + esc(t.telp) : '') + (t.kirim || t.alamat ? '<div class="muted">Kirim: ' + esc(t.kirim || t.alamat) + '</div>' : '') + '</div>' +
    '<div class="tw"><table class="tbl"><thead><tr><th>Barang</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">Jumlah</th></tr></thead><tbody>' + (t.items || []).map(l => '<tr><td>' + esc(l.nama) + '</td><td class="r">' + qfmt(l.qty) + ' ' + esc(l.sat || '') + '</td><td class="r">' + rp(l.harga) + '</td><td class="r b">' + rp(l.subtotal) + '</td></tr>').join('') + '<tr><td colspan="3" class="r">Subtotal</td><td class="r">' + rp(t.subtotal) + '</td></tr>' + (num(t.diskon) ? '<tr><td colspan="3" class="r">Diskon</td><td class="r">−' + rp(t.diskon) + '</td></tr>' : '') + (num(t.pajak) ? '<tr><td colspan="3" class="r">Pajak</td><td class="r">' + rp(t.pajak) + '</td></tr>' : '') + '<tr><td colspan="3" class="r b">TOTAL</td><td class="r b">' + rp(t.total) + '</td></tr></tbody></table></div>' + (own && t.hpp ? '<div class="hint mt">HPP ' + rp(t.hpp) + ' · Laba kotor ' + rp(num(t.total) - num(t.pajak) - num(t.hpp)) + '</div>' : ''),
    foot: (own && t.status !== 'VOID' && !pend ? '<button class="btn dng" data-act="trxVoid" data-id="' + esc(id) + '">Void</button>' : '') + '<span class="sp"></span><button class="btn" data-act="pNota" data-id="' + esc(id) + '">🖨️ Nota</button><button class="btn" data-act="pKwt" data-id="' + esc(id) + '">🧾 Kuitansi</button>' + (t.telp ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(waLink(t.telp, waNota(t))) + '">💬</a>' : '') });
};
ACT.trxVoid = el => {
  const id = el.dataset.id, m = openModal({ title: 'Void nota', body: '<p class="muted sm">Stok barang dikembalikan sesuai jumlah saat dijual. Nota kredit yang sudah ada pembayaran/DP tidak bisa di-void. Void tidak bisa dibatalkan.</p><div class="fld"><label>Alasan void <span class="req">*</span></label><input class="in" id="vAl" maxlength="100" placeholder="mis. salah input / pelanggan batal"></div><div id="vErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn dng" id="vOk">Void nota</button>' });
  $('#vOk', m.el).onclick = async () => {
    const al = $('#vAl', m.el).value.trim(); if (al.length < 3) { $('#vErr', m.el).textContent = 'Alasan minimal 3 huruf.'; $('#vErr', m.el).classList.remove('hidden'); return; }
    try { const r = await call('trx.void', { id, alasan: al }); const t = trxById(id); if (t) Object.assign(t, r.data.trx); ['Barang', 'Piutang'].forEach(k => { S.vers[k] = -1; }); $$('#mroot .ov').forEach(o => o.remove()); toast('Nota di-void, stok dikembalikan', 'ok'); syncSoon(); refresh(); }
    catch (e) { $('#vErr', m.el).textContent = needNet(e); $('#vErr', m.el).classList.remove('hidden'); }
  };
};

/* ================= BIAYA ================= */
PAGES.biaya = {
  title: 'Biaya Operasional', live: true,
  render() {
    const own = isOwner(), today = todayStr(), mon = today.substr(0, 7), pend = new Set(Q.filter(x => x.action === 'expense.save').map(x => x.data.id_biaya));
    const list = S.expenses.filter(e => e.status !== 'BATAL' && (own ? String(e.tanggal).substr(0, 7) === (BY.mon || mon) : true)).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || String(b.dibuat).localeCompare(String(a.dibuat)));
    const byKat = {}; list.forEach(e => byKat[e.kategori] = (byKat[e.kategori] || 0) + num(e.jumlah)); const tot = list.reduce((a, e) => a + num(e.jumlah), 0);
    $('#pg-biaya').innerHTML = '<div class="row wrap mb"><button class="btn pri" data-act="byAdd">＋ Catat biaya</button><span class="sp"></span>' + (own ? '<input type="month" class="in" style="max-width:170px" data-ch="byMon" value="' + (BY.mon || mon) + '">' : '<span class="chip">Hari ini · milik Anda</span>') + '</div>' +
      '<div class="kpis"><div class="kpi pri"><div class="l">Total ' + (own ? 'bulan ini' : 'hari ini') + '</div><div class="v">' + rp(tot) + '</div></div>' + Object.keys(byKat).sort((a, b) => byKat[b] - byKat[a]).slice(0, 3).map(k => '<div class="kpi"><div class="l">' + esc(k) + '</div><div class="v">' + rp(byKat[k]) + '</div></div>').join('') + '</div>' +
      (list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Catatan</th><th>Sumber</th><th class="r">Jumlah</th>' + (own ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map(e => '<tr><td class="sm">' + tglIndo(e.tanggal) + '</td><td>' + esc(e.kategori) + '</td><td class="sm">' + esc(e.catatan || '') + '</td><td><span class="chip ' + (e.sumber === 'Kas Laci' ? 'warn' : '') + '">' + esc(e.sumber) + '</span>' + (pend.has(e.id_biaya) ? ' <span class="chip warn">⏳</span>' : '') + '</td><td class="r b">' + rp(e.jumlah) + '</td>' + (own ? '<td><button class="btn sm gh" data-act="byDel" data-id="' + esc(e.id_biaya) + '" aria-label="Batalkan">🗑</button></td>' : '') + '</tr>').join('') + '</tbody></table></div>' : '<div class="empty"><div class="big">💸</div>Belum ada biaya tercatat.</div>');
  }
};
const BY = { mon: '' };
CHG.byMon = el => { BY.mon = el.value; PAGES.biaya.render(); };
ACT.byAdd = () => {
  const c = cfg(), kats = String(c.kategori_biaya).split(',').map(s => s.trim()).filter(Boolean), kas = !!S.shift;
  const m = openModal({ title: 'Catat biaya', body: '<div class="grid2"><div class="fld"><label>Kategori</label><input class="in" id="bKat" list="bKatL" placeholder="Pilih / ketik"><datalist id="bKatL">' + kats.map(k => '<option>' + esc(k) + '</option>').join('') + '</datalist></div><div class="fld"><label>Tanggal</label><input type="date" class="in" id="bTgl" value="' + todayStr() + '"></div></div><div class="fld"><label>Jumlah (Rp)</label><input class="in m" id="bJml" data-money inputmode="numeric" placeholder="0"></div><div class="fld"><label>Catatan</label><input class="in" id="bCat" maxlength="120"></div>' + (kas ? '<label class="chk"><input type="checkbox" id="bKas" checked> Diambil dari kas laci (mengurangi kas seharusnya)</label>' : '') + '<div id="bErr" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="bOk">Simpan</button>' });
  $('#bOk', m.el).onclick = () => {
    const kat = $('#bKat', m.el).value.trim(), jml = mv($('#bJml', m.el)), e = $('#bErr', m.el); if (!kat || jml <= 0) { e.textContent = 'Isi kategori dan jumlah.'; e.classList.remove('hidden'); return; }
    const dariKas = kas && $('#bKas', m.el).checked, id = uid('BYA'), rec = { id_biaya: id, tanggal: $('#bTgl', m.el).value || todayStr(), kategori: kat, jumlah: jml, sumber: dariKas ? 'Kas Laci' : 'Owner', shift_id: dariKas ? S.shift.id_shift : '', catatan: $('#bCat', m.el).value.trim(), petugas: S.user.username, dibuat: nowStr(), status: 'AKTIF' };
    S.expenses.push(Object.assign({}, rec, { _local: true })); if (dariKas) S.kasOut.push({ id, shift_id: S.shift.id_shift, jumlah: jml, ket: kat });
    enqueue('expense.save', rec, 'Biaya ' + kat + ' · ' + rp(jml)); m.close(); toast('Biaya dicatat', 'ok'); PAGES.biaya.render();
  };
};
ACT.byDel = async el => { if (!(await confirmDlg('Batalkan biaya ini?', { danger: true, ok: 'Batalkan' }))) return; try { await call('expense.delete', { id_biaya: el.dataset.id }); const e = S.expenses.find(x => x.id_biaya === el.dataset.id); if (e) e.status = 'BATAL'; saveState(); toast('Biaya dibatalkan', 'ok'); PAGES.biaya.render(); syncSoon(); } catch (e) { toast(needNet(e), 'bad'); } };

/* ================= DASHBOARD ================= */
const DB7 = { data: null };
PAGES.dashboard = {
  title: 'Dashboard', live: true,
  render() {
    const own = isOwner(), me = S.user.username, hari = todayStr(), list = S.trx.filter(t => String(t.tanggal_waktu).substr(0, 10) === hari && (own || t.kasir === me)), a = aggLocal(list), al = alerts();
    const top = Object.keys(a.byBarang).map(k => a.byBarang[k]).sort((x, y) => y.qty - x.qty).slice(0, 5), mx = Math.max(1, ...top.map(x => x.qty));
    const jams = Object.keys(a.byJam).sort(), mj = Math.max(1, ...jams.map(j => a.byJam[j]));
    const st = S.shift && S.shift.status === 'BUKA' ? shiftStats() : null;
    $('#pg-dashboard').innerHTML = '<div class="row wrap mb"><div><div class="b" style="font-size:18px">Halo, ' + esc((S.user.nama || me).split(' ')[0]) + ' 👋</div><div class="muted sm">' + tglIndo(hari) + (S.shift ? ' · Shift ' + esc(S.shift.shift) + ' dibuka ' + jam(S.shift.mulai) : '') + '</div></div><span class="sp"></span><button class="btn pri" data-act="nav" data-id="pos">🧾 Buka Kasir</button></div>' +
      '<div class="kpis"><div class="kpi pri"><div class="l">Penjualan hari ini' + (own ? '' : ' (Anda)') + '</div><div class="v">' + rp(a.omzet) + '</div></div><div class="kpi"><div class="l">Nota</div><div class="v">' + a.n + '</div></div>' + (own ? '<div class="kpi"><div class="l">HPP barang</div><div class="v">' + rp(a.hpp) + '</div></div><div class="kpi"><div class="l">Laba kotor</div><div class="v" style="color:var(--ok)">' + rp(a.laba) + '</div></div>' : '') + '<div class="kpi"><div class="l">Piutang beredar</div><div class="v" style="color:' + (piutangAktif().length ? 'var(--warn)' : 'inherit') + '">' + rp(piutangAktif().reduce((x, p) => x + sisaPiutang(p), 0)) + '</div></div><div class="kpi"><div class="l">Rata-rata / nota</div><div class="v">' + rp(a.n ? a.omzet / a.n : 0) + '</div></div>' + (st ? '<div class="kpi"><div class="l">Kas laci seharusnya</div><div class="v">' + rp(st.seharusnya) + '</div></div>' : '') + '</div>' +
      '<div class="two"><div class="card"><h3>Penjualan per jam</h3>' + (jams.length ? '<div class="bars">' + jams.map(j => '<div class="bar"><b>' + (a.byJam[j] >= 1000 ? Math.round(a.byJam[j] / 1000) + 'rb' : '') + '</b><i style="height:' + Math.max(3, a.byJam[j] / mj * 100) + '%"></i><span>' + j + '</span></div>').join('') + '</div>' : '<div class="empty" style="padding:24px">Belum ada penjualan hari ini.</div>') + '</div>' +
      '<div class="card"><h3>Barang terlaris hari ini</h3>' + (top.length ? top.map(x => '<div class="hb"><span class="t ell">' + esc(x.nama) + '</span><div class="tr"><i style="width:' + x.qty / mx * 100 + '%"></i></div><span class="n">' + fq(x.qty) + ' porsi</span></div>').join('') : '<div class="empty" style="padding:24px">Belum ada data.</div>') + '</div></div>' +
      '<div class="two">' + (own ? '<div class="card"><h3>Tren 7 hari</h3><div id="d7"><div class="sk" style="height:150px"></div></div></div>' : '') + '<div class="card"><h3>Perlu perhatian <span class="chip ' + (al.length ? 'warn' : 'ok') + '">' + al.length + '</span></h3>' + (al.length ? '<div class="list">' + al.slice(0, 7).map(x => '<div class="it"><span>' + x.ic + '</span><div class="sp sm">' + esc(x.x) + '</div></div>').join('') + '</div>' + (al.length > 7 ? '<div class="hint">+' + (al.length - 7) + ' lainnya — ketuk 🔔</div>' : '') : '<div class="okbox">✅ Stok & piutang aman, tidak ada peringatan.</div>') + '</div></div>';
    if (own) this.week();
  },
  async week() {
    const box = () => $('#d7'); const draw = d => { if (!box()) return; const days = Object.keys(d.agg.byDay).sort(), mxv = Math.max(1, ...days.map(x => d.agg.byDay[x].omzet)); box().innerHTML = days.length ? '<div class="bars">' + days.map(x => '<div class="bar"><b>' + Math.round(d.agg.byDay[x].omzet / 1000) + 'rb</b><i style="height:' + Math.max(3, d.agg.byDay[x].omzet / mxv * 100) + '%"></i><span>' + x.substr(8, 2) + '/' + x.substr(5, 2) + '</span></div>').join('') + '</div><div class="hint mt">Total 7 hari: <b>' + rp(d.agg.omzet) + '</b> · laba kotor ' + rp(d.agg.laba) + '</div>' : '<div class="empty" style="padding:24px">Belum ada data.</div>'; };
    if (DB7.data) draw(DB7.data); else { const c = await kv.get('db7'); if (c) { DB7.data = c; draw(c); } }
    if (!ONLINE || (DB7.at && Date.now() - DB7.at < 120000)) return;
    try { const r = await call('report.get', { from: addDaysStr(todayStr(), -6), to: todayStr() }); DB7.data = r.data; DB7.at = Date.now(); kv.set('db7', r.data); draw(r.data); } catch (e) { if (!DB7.data && box()) box().innerHTML = '<div class="muted sm">Tren belum tersedia (offline).</div>'; }
  }
};
