'use strict';
/* PASUNDAN SETIA SEJAHTERA · piutang — pelanggan, penjualan kredit (piutang), pembayaran cicilan & kuitansi */
const PT = { q: '', tab: 'open' }, PL = { q: '' };

/* ================= PELANGGAN ================= */
PAGES.pelanggan = {
  title: 'Pelanggan', live: true,
  render() {
    $('#pg-pelanggan').innerHTML = '<div class="row wrap mb"><input class="in" style="flex:1;min-width:160px" data-in="plQ2" placeholder="🔍 Cari nama / HP…" value="' + esc(PL.q) + '"><button class="btn pri" data-act="plNew">＋ Pelanggan</button></div><div id="plList"></div>'; this.body();
  },
  body() {
    const q = PL.q.toLowerCase(), list = S.customers.filter(c => !q || (c.nama + ' ' + c.telp + ' ' + c.alamat).toLowerCase().includes(q)).sort((a, b) => a.nama.localeCompare(b.nama));
    $('#plList').innerHTML = list.length ? '<div class="card" style="padding:4px 14px"><div class="list">' + list.map(c => { const pt = piutangPel(c.id_pelanggan); return '<div class="it" style="cursor:pointer" data-act="plEdit" data-id="' + esc(c.id_pelanggan) + '"><div class="sp" style="min-width:0"><b>' + esc(c.nama) + '</b><div class="xs muted ell">' + esc(c.telp || '') + (c.alamat ? ' · ' + esc(c.alamat) : '') + '</div></div><span class="chip">' + esc(c.level) + '</span>' + (isOn(c.kredit) ? '<span class="chip ok">kredit' + (num(c.limit_kredit) ? ' ≤ ' + rp(c.limit_kredit) : '') + '</span>' : '') + (pt ? '<span class="chip warn">piutang ' + rp(pt) + '</span>' : '') + (c._local ? '<span class="chip warn">⏳</span>' : '') + '</div>'; }).join('') + '</div></div>' : '<div class="empty"><div class="big">👥</div>' + (S.customers.length ? 'Tidak ditemukan.' : 'Belum ada pelanggan. Tambahkan pelanggan langganan/kontraktor agar bisa diberi harga grosir/proyek dan kredit.') + '</div>';
  }
};
INP.plQ2 = el => { PL.q = el.value; PAGES.pelanggan.body(); };
ACT.plNew = () => pelForm(null); ACT.plEdit = el => pelForm(pelOf(el.dataset.id));
function pelForm(c, cb) {
  const own = isOwner();
  const m = openModal({ title: c ? 'Ubah pelanggan' : 'Pelanggan baru', onClose: () => { if (cb && !m._saved) cb(null); },
    body: '<div class="fld"><label>Nama <span class="req">*</span></label><input class="in" id="pN" maxlength="60" value="' + esc(c ? c.nama : '') + '"></div><div class="grid2"><div class="fld"><label>No. HP / WhatsApp</label><input class="in" id="pT" inputmode="tel" value="' + esc(c ? c.telp : '') + '"></div><div class="fld"><label>Level harga</label><select class="sel" id="pL"' + (own ? '' : ' disabled') + '>' + LEVEL.map(x => '<option' + (c && c.level === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div><div class="fld"><label>Alamat</label><input class="in" id="pA" maxlength="160" value="' + esc(c ? c.alamat : '') + '"></div>' +
      (own ? '<div class="grid2"><label class="chk"><input type="checkbox" id="pK"' + (c && isOn(c.kredit) ? ' checked' : '') + '> Boleh beli kredit</label><div class="fld"><label>Limit kredit (Rp, 0 = tanpa batas)</label><input class="in m" id="pLim" data-money inputmode="numeric" value="' + (c && num(c.limit_kredit) ? rpn(c.limit_kredit) : '') + '"></div></div>' : '<div class="hint">Level harga dan izin kredit diatur oleh Owner.</div>') + '<div class="fld"><label>Catatan</label><input class="in" id="pC" maxlength="120" value="' + esc(c ? c.catatan : '') + '"></div><div id="pErr" class="err hidden"></div>',
    foot: (c && own ? '<button class="btn dng" id="pDel">Hapus</button><span class="sp"></span>' : '') + '<button class="btn" data-x>Batal</button><button class="btn pri" id="pOkB">Simpan</button>' });
  const er = t => { const e = $('#pErr', m.el); e.textContent = t; e.classList.remove('hidden'); };
  $('#pOkB', m.el).onclick = () => {
    const nama = $('#pN', m.el).value.trim(); if (!nama) return er('Nama wajib diisi.');
    const id = c ? c.id_pelanggan : uid('PLG'), tp = $('#pT', m.el).value.trim();
    if (!c && S.customers.some(x => x.nama.toLowerCase() === nama.toLowerCase() && String(x.telp) === tp.replace(/[^\d+]/g, ''))) return er('Pelanggan dengan nama & nomor sama sudah ada.');
    const d = { id_pelanggan: id, nama, telp: tp.replace(/[^\d+]/g, ''), alamat: $('#pA', m.el).value.trim(), level: $('#pL', m.el).value, catatan: $('#pC', m.el).value.trim() };
    if (own) { d.kredit = $('#pK', m.el).checked; d.limit_kredit = mv($('#pLim', m.el)); } else { d.level = c ? c.level : 'Eceran'; d.kredit = c ? isOn(c.kredit) : false; d.limit_kredit = c ? num(c.limit_kredit) : 0; }
    m._saved = true; enqueue('pelanggan.save', d, 'Pelanggan ' + nama); m.close(); toast('Pelanggan tersimpan', 'ok'); if (cb) cb(id); refresh();
  };
  if (c && own) $('#pDel', m.el).onclick = async () => { if (!(await confirmDlg('Hapus pelanggan “' + c.nama + '”?', { danger: true, ok: 'Hapus' }))) return; try { await call('pelanggan.delete', { id_pelanggan: c.id_pelanggan }); S.vers.Customers = -1; m._saved = true; m.close(); toast('Pelanggan dihapus', 'ok'); await syncNow(); refresh(); } catch (e) { er(needNet(e)); } };
}

/* ================= PIUTANG ================= */
PAGES.piutang = {
  title: 'Piutang Pelanggan', live: true,
  render() {
    const open = piutangAktif(), tot = open.reduce((a, p) => a + sisaPiutang(p), 0), t = todayStr(), lewat = open.filter(p => p.jatuh_tempo && p.jatuh_tempo < t);
    $('#pg-piutang').innerHTML = '<div class="kpis"><div class="kpi pri"><div class="l">Total piutang</div><div class="v">' + rp(tot) + '</div></div><div class="kpi"><div class="l">Nota belum lunas</div><div class="v">' + open.length + '</div></div><div class="kpi"><div class="l">Lewat jatuh tempo</div><div class="v" style="color:' + (lewat.length ? 'var(--bad)' : 'var(--ok)') + '">' + lewat.length + ' · ' + rp(lewat.reduce((a, p) => a + sisaPiutang(p), 0)) + '</div></div></div>' +
      '<div class="tabs">' + [['open', '💳 Belum lunas'], ['riwayat', '🧾 Riwayat pembayaran']].map(x => '<button class="tab' + (PT.tab === x[0] ? ' on' : '') + '" data-act="ptTab" data-k="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<input class="in mb" data-in="ptQ" placeholder="🔍 Cari pelanggan / no. nota…" value="' + esc(PT.q) + '"><div id="ptBody"></div>'; this.body();
  },
  body() {
    const q = PT.q.toLowerCase(), t = todayStr(), own = isOwner();
    if (PT.tab === 'open') {
      const list = piutangAktif().filter(p => !q || (p.pelanggan + ' ' + p.no_nota).toLowerCase().includes(q)).sort((a, b) => String(a.jatuh_tempo || '9').localeCompare(String(b.jatuh_tempo || '9')));
      $('#ptBody').innerHTML = list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Pelanggan / nota</th><th>Jatuh tempo</th><th class="r">Total</th><th class="r">Sisa</th><th></th></tr></thead><tbody>' + list.map(p => '<tr><td><b>' + esc(p.pelanggan) + '</b><div class="xs muted">' + esc(p.no_nota) + ' · ' + tglIndo(p.tgl) + (p.telp ? ' · ' + esc(p.telp) : '') + '</div></td><td class="sm">' + (p.jatuh_tempo ? tglIndo(p.jatuh_tempo) + (p.jatuh_tempo < t ? ' <span class="chip bad">lewat</span>' : '') : '—') + '</td><td class="r">' + rp(p.total) + '</td><td class="r b">' + rp(sisaPiutang(p)) + (p._local ? ' ⏳' : '') + '</td><td class="r" style="white-space:nowrap">' + (p.telp ? '<a class="btn sm gh" target="_blank" rel="noopener" href="' + esc(waLink(p.telp, 'Halo ' + p.pelanggan + ', mengingatkan tagihan nota ' + p.no_nota + ' sisa ' + rp(sisaPiutang(p)) + (p.jatuh_tempo ? ' (jatuh tempo ' + tglIndo(p.jatuh_tempo) + ')' : '') + '. Terima kasih. — ' + cfg().namaUsaha)) + '" title="Ingatkan lewat WhatsApp">💬</a> ' : '') + '<button class="btn sm pri" data-act="ptBayar" data-id="' + esc(p.id_transaksi) + '">Terima bayar</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="empty"><div class="big">🎉</div>Tidak ada piutang' + (q ? ' yang cocok' : ' — semua lunas') + '.</div>';
    } else {
      const list = S.payments.filter(p => !q || (p.no_nota + ' ' + p.no_kuitansi + ' ' + ((S.piutang.find(x => x.id_transaksi === p.id_transaksi) || {}).pelanggan || '')).toLowerCase().includes(q)).slice().sort((a, b) => String(b.tanggal_waktu).localeCompare(String(a.tanggal_waktu))).slice(0, 150);
      $('#ptBody').innerHTML = list.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Waktu</th><th>Kuitansi / nota</th><th>Metode</th><th class="r">Jumlah</th><th></th></tr></thead><tbody>' + list.map(p => '<tr><td class="sm">' + esc(String(p.tanggal_waktu).substr(5, 11)) + '</td><td><b>' + esc(p.no_kuitansi) + '</b><div class="xs muted">' + esc(p.no_nota) + (p.catatan ? ' · ' + esc(p.catatan) : '') + '</div></td><td class="sm">' + esc(p.metode) + '</td><td class="r b">' + rp(p.jumlah) + (p.status === 'BATAL' ? ' <span class="chip bad">BATAL</span>' : '') + '</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-act="pKwtBayar" data-id="' + esc(p.id_bayar) + '">🖨️</button>' + (own && p.status !== 'BATAL' && !p._local ? ' <button class="btn sm dng" data-act="ptBatal" data-id="' + esc(p.id_bayar) + '">Batal</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty"><div class="big">🧾</div>Belum ada pembayaran tercatat.</div>';
    }
  },
  refresh() { if ($('#ptBody')) this.body(); else this.render(); }
};
ACT.ptTab = el => { PT.tab = el.dataset.k; PAGES.piutang.render(); };
INP.ptQ = el => { PT.q = el.value; PAGES.piutang.body(); };
ACT.ptBayar = el => {
  const p = S.piutang.find(x => x.id_transaksi === el.dataset.id); if (!p) return; const sisa = sisaPiutang(p); let metode = 'Tunai';
  const m = openModal({ title: 'Terima pembayaran', body: '<div class="note mb"><b>' + esc(p.pelanggan) + '</b> · ' + esc(p.no_nota) + '<br>Total ' + rp(p.total) + ' · dibayar ' + rp(p.dibayar) + ' · <b>sisa ' + rp(sisa) + '</b></div><div class="fld"><label>Jumlah dibayar (Rp)</label><input class="in m" id="byJ" data-money inputmode="numeric" style="font-size:20px;font-weight:700" value="' + rpn(sisa) + '"></div><div class="fld"><label>Cara bayar</label><select class="sel" id="byM">' + METODE_BAYAR.map(x => '<option>' + x + '</option>').join('') + '</select></div><div class="fld"><label>Catatan</label><input class="in" id="byC" maxlength="100" placeholder="mis. cicilan ke-2"></div>' + (!S.shift ? '<div class="hint">Anda tanpa shift: pembayaran tunai oleh kasir butuh shift terbuka.</div>' : '') + '<div id="byE" class="err hidden"></div>', foot: '<button class="btn" data-x>Batal</button><button class="btn pri" id="byOk">Simpan pembayaran</button>' });
  $('#byOk', m.el).onclick = () => {
    const j = mv($('#byJ', m.el)), met = $('#byM', m.el).value, e = $('#byE', m.el); if (j <= 0 || j > sisa) { e.textContent = 'Jumlah harus antara 1 dan sisa piutang (' + rp(sisa) + ').'; e.classList.remove('hidden'); return; }
    if (met === 'Tunai' && !S.shift && !isOwner()) { e.textContent = 'Shift belum dibuka.'; e.classList.remove('hidden'); return; }
    const id = uid('BYR'), kw = nextNo('KW'); enqueue('piutang.bayar', { id_bayar: id, id_transaksi: p.id_transaksi, jumlah: j, metode: met, catatan: $('#byC', m.el).value.trim(), shift_id: S.shift ? S.shift.id_shift : '', no_kuitansi: kw, tanggal_waktu: nowStr() }, 'Bayar piutang ' + p.pelanggan + ' · ' + rp(j));
    m.close(); openModal({ title: 'Pembayaran dicatat', sticky: true, body: '<div class="big-ok"><div class="ck">✅</div><div class="b" style="font-size:22px">' + rp(j) + '</div><div class="muted">' + esc(p.pelanggan) + ' · ' + esc(met) + '</div></div>', foot: '<button class="btn" data-act="pKwtBayar" data-id="' + id + '">🖨️ Cetak kuitansi</button><button class="btn pri sp" data-x>Selesai</button>' }); refresh();
  };
};
ACT.ptBatal = async el => {
  const al = prompt('Alasan membatalkan pembayaran ini?'); if (!al || al.trim().length < 3) return;
  try { await call('piutang.batal', { id_bayar: el.dataset.id, alasan: al.trim() }); ['Piutang', 'Payments'].forEach(k => { S.vers[k] = -1; }); toast('Pembayaran dibatalkan', 'ok'); await syncNow(); refresh(); } catch (e) { toast(needNet(e), 'bad'); }
};
