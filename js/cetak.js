'use strict';
/* PASUNDAN SETIA SEJAHTERA · cetak — nota & kuitansi untuk printer dot matrix (kertas continuous), pratinjau, unduh .TXT, cetak laporan */
function dmCfg() {
  const c = cfg(), k = c.dm_kertas;
  return { w: k === 'a4' ? 8.27 : 9.5, h: k === '9.5x11' ? 11 : k === 'a4' ? 11.69 : 5.5, kol: Math.max(40, num(c.dm_kolom) || 80), baris: Math.max(15, num(c.dm_baris) || 33), cpi: num(c.dm_cpi) || 10, kiri: num(c.dm_kiri), atas: num(c.dm_atas) };
}
const trxById = id => S.trx.find(t => t.id_transaksi === id) || (window.RW && RW.rangeRows && RW.rangeRows.find(t => t.id_transaksi === id)) || (window.LP && LP.rows && LP.rows.find(t => t.id_transaksi === id));
const garis = (K, ch) => ch.repeat(K);
const kanan = (a, b, K) => padR(a, K - b.length) + b;
function headToko(K) {
  const c = cfg(), L = [padC(String(c.namaUsaha).toUpperCase(), K)];
  wrapTxt(c.alamat, K).forEach(x => L.push(padC(x, K))); if (c.telp) L.push(padC('Telp/WA: ' + c.telp, K));
  L.push(garis(K, '=')); return L;
}
function paginate(head, rows, foot, cap, K) {
  const pages = []; let i = 0, guard = 0;
  const flat = a => a.reduce((x, r) => x.concat(r), []);
  for (;;) {
    const rest = rows.slice(i), restN = flat(rest).length;
    if (restN + head.length + foot.length <= cap || guard++ > 200) { pages.push(head.concat(flat(rest), foot)); break; }
    const avail = cap - head.length - 1; let n = 0, used = 0;
    while (i + n < rows.length && (used + rows[i + n].length <= avail || n === 0)) { used += rows[i + n].length; n++; }
    if (n === 0) { pages.push(head.concat(foot)); break; }
    pages.push(head.concat(flat(rows.slice(i, i + n)), [padL('(bersambung…)', K)])); i += n;
  }
  if (pages.length > 1) pages.forEach((p, k) => { p[0] = padR(p[0].trimEnd(), K - 9) + padL('Hal ' + (k + 1) + '/' + pages.length, 9); });
  return pages;
}
function dmNota(t) {
  const P = dmCfg(), K = P.kol, c = cfg(), nw = Math.max(12, K - 45), items = t.items || [];
  const head = headToko(K).concat([kanan('NOTA PENJUALAN' + (t.status === 'VOID' ? ' *** VOID ***' : ''), 'No: ' + (t.no_nota || '-'), K),
    kanan('Tanggal   : ' + tglIndo(String(t.tanggal_waktu).substr(0, 10)) + ' ' + jam(t.tanggal_waktu), 'Kasir: ' + (t.kasir || ''), K),
    kanan('Pelanggan : ' + (t.pelanggan || 'Umum'), 'Bayar: ' + (t.metode_bayar || '') + ' · ' + (t.tipe || ''), K)]);
  if (t.alamat || t.kirim) head.push(...wrapTxt('Kirim ke  : ' + (t.kirim || t.alamat), K));
  head.push(garis(K, '-'), padL('No', 3) + ' ' + padR('Nama Barang', nw) + ' ' + padL('Qty', 7) + ' ' + padR('Sat', 6) + ' ' + padL('Harga', 11) + ' ' + padL('Jumlah', 13), garis(K, '-'));
  const rows = items.map((l, i) => { const nm = wrapTxt(l.nama + (l.catatan ? ' (' + l.catatan + ')' : ''), nw); return nm.map((x, k) => k ? ' '.repeat(4) + padR(x, nw) : padL(i + 1, 3) + ' ' + padR(x, nw) + ' ' + padL(qfmt(l.qty), 7) + ' ' + padR(l.sat || '', 6) + ' ' + padL(rpn(l.harga), 11) + ' ' + padL(rpn(l.subtotal), 13)); });
  const foot = [garis(K, '-')], tot = (a, b) => foot.push(padL(a, K - 15) + padL(b, 15));
  tot('Subtotal :', 'Rp ' + rpn(t.subtotal)); if (num(t.diskon)) tot('Diskon   :', '-Rp ' + rpn(t.diskon)); if (num(t.pajak)) tot('Pajak    :', 'Rp ' + rpn(t.pajak));
  tot('TOTAL    :', 'Rp ' + rpn(t.total));
  if (t.metode_bayar === 'Kredit') { tot('DP/Bayar :', 'Rp ' + rpn(t.tunai)); tot('SISA     :', 'Rp ' + rpn(num(t.total) - num(t.tunai))); }
  else if (t.metode_bayar === 'Tunai') { tot('Tunai    :', 'Rp ' + rpn(t.tunai)); if (num(t.kembalian)) tot('Kembali  :', 'Rp ' + rpn(t.kembalian)); }
  foot.push(...wrapTxt('Terbilang : ' + cap1(terbilang(t.total)) + ' rupiah', K));
  if (t.metode_bayar === 'Kredit' && t.jatuh_tempo) foot.push('Jatuh tempo: ' + tglIndo(t.jatuh_tempo));
  if (t.catatan) foot.push(...wrapTxt('Catatan: ' + t.catatan, K)); if (c.rekening && t.metode_bayar !== 'Tunai') foot.push(...wrapTxt('Transfer: ' + c.rekening, K));
  foot.push('', padC('Penerima', Math.floor(K / 2)) + padC('Hormat kami', K - Math.floor(K / 2)), '', padC('(..............)', Math.floor(K / 2)) + padC('(..............)', K - Math.floor(K / 2)));
  foot.push(...wrapTxt(c.footer || '', K).map(x => padC(x, K)));
  return paginate(head, rows, foot, P.baris, K);
}
function dmKuitansi(k) {   // k: {no, tgl, dari, jumlah, untuk, metode, petugas, sisa}
  const P = dmCfg(), K = P.kol, c = cfg(), W = 19, L = headToko(K);
  L.push(kanan('KUITANSI', 'No: ' + k.no, K), '');
  const f = (a, b) => wrapTxt(b, K - W).forEach((x, i) => L.push(padR(i ? '' : a, W - 2) + (i ? '  ' : ': ') + x));
  f('Telah terima dari', k.dari || 'Umum'); f('Uang sejumlah', 'Rp ' + rpn(k.jumlah)); f('Terbilang', '# ' + cap1(terbilang(k.jumlah)) + ' rupiah #'); f('Untuk pembayaran', k.untuk); f('Cara bayar', k.metode);
  if (k.sisa != null) f('Sisa piutang', k.sisa > 0 ? 'Rp ' + rpn(k.sisa) : 'LUNAS');
  L.push(garis(K, '-'), padL((c.kota || '') + ', ' + tglIndo(k.tgl), K), padC('Yang menerima,', K), '', '', padC('( ' + (k.petugas || '................') + ' )', K));
  return [L];
}
function kuitansiTrx(t) { return { no: 'KW-' + String(t.no_nota || t.id_transaksi).slice(-12), tgl: String(t.tanggal_waktu).substr(0, 10), dari: t.pelanggan, jumlah: t.metode_bayar === 'Kredit' ? num(t.tunai) : num(t.total), untuk: 'Pembelian barang sesuai Nota ' + t.no_nota, metode: t.metode_bayar === 'Kredit' ? 'DP (uang muka)' : t.metode_bayar, petugas: t.kasir, sisa: t.metode_bayar === 'Kredit' ? num(t.total) - num(t.tunai) : null }; }
function kuitansiBayar(py) {
  const p = S.piutang.find(x => x.id_transaksi === py.id_transaksi) || {};
  return { no: py.no_kuitansi, tgl: String(py.tanggal_waktu).substr(0, 10), dari: p.pelanggan || '', jumlah: num(py.jumlah), untuk: 'Pembayaran piutang Nota ' + (py.no_nota || p.no_nota) + (py.catatan ? ' (' + py.catatan + ')' : ''), metode: py.metode, petugas: py.petugas, sisa: p.id_transaksi ? sisaPiutang(p) : null };
}
/* ---------- keluaran ---------- */
function printHTML(html) { const r = $('#print-root'); r.innerHTML = html; const st = document.createElement('style'); st.id = 'pgCss'; st.textContent = '@page{size:A4;margin:8mm}'; document.head.appendChild(st); setTimeout(() => { window.print(); setTimeout(() => { r.innerHTML = ''; st.remove(); }, 800); }, 60); }
function printDM(pages) {
  const P = dmCfg(), st = document.createElement('style'); st.id = 'pgCss';
  st.textContent = '@page{size:' + P.w + 'in ' + P.h + 'in;margin:0}.dmp{box-sizing:border-box;width:' + P.w + 'in;height:' + P.h + 'in;padding:' + P.atas + 'mm 0 0 ' + P.kiri + 'mm;overflow:hidden;page-break-after:always;break-after:page;background:#fff;color:#000}.dmp:last-child{page-break-after:auto;break-after:auto}.dmp pre{margin:0;font:' + (120 / P.cpi) + 'pt/12pt "Courier New",Courier,monospace;white-space:pre}';
  document.head.appendChild(st); const r = $('#print-root'); r.innerHTML = pages.map(p => '<div class="dmp"><pre>' + esc(p.join('\n')) + '</pre></div>').join('');
  setTimeout(() => { window.print(); setTimeout(() => { r.innerHTML = ''; st.remove(); }, 1200); }, 80);
}
const dmTxt = pages => pages.map(p => p.join('\r\n')).join('\r\n\f');
function cetakDlg(title, pages, o) {
  o = o || {}; const P = dmCfg();
  const m = openModal({ title, wide: true, body: '<div class="note mb">Printer dot matrix: pilih printer lalu kertas <b>' + P.w + '×' + P.h + ' in</b> (Pengaturan → Cetak). ' + P.kol + ' kolom · ' + P.baris + ' baris/halaman.</div><div class="pvwrap dmv" style="font:11px/1.15 \'Courier New\',monospace;white-space:pre;overflow:auto;max-height:55vh">' + esc(pages.map(p => p.join('\n')).join('\n' + '─'.repeat(20) + ' ganti halaman ' + '─'.repeat(20) + '\n')) + '</div>',
    foot: '<button class="btn" data-x>Tutup</button>' + (o.wa ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(o.wa) + '">💬 WhatsApp</a>' : '') + '<button class="btn" id="cTxt">⬇ .TXT (cetak cepat)</button><button class="btn pri" id="cPr">🖨️ Cetak</button>' });
  $('#cPr', m.el).onclick = () => printDM(pages); $('#cTxt', m.el).onclick = () => download((o.nama || 'cetak') + '.txt', dmTxt(pages), 'text/plain;charset=utf-8');
}
ACT.pNota = el => { const t = trxById(el.dataset.id); if (t) cetakDlg('Nota ' + t.no_nota, dmNota(t), { nama: 'nota-' + t.no_nota, wa: t.telp ? waLink(t.telp, waNota(t)) : '' }); };
ACT.pKwt = el => { const t = trxById(el.dataset.id); if (t) cetakDlg('Kuitansi', dmKuitansi(kuitansiTrx(t)), { nama: 'kuitansi-' + t.no_nota }); };
ACT.pKwtBayar = el => { const py = S.payments.find(x => x.id_bayar === el.dataset.id); if (py) cetakDlg('Kuitansi ' + py.no_kuitansi, dmKuitansi(kuitansiBayar(py)), { nama: 'kuitansi-' + py.no_kuitansi }); };
ACT.dmTest = () => cetakDlg('Tes cetak', [headToko(dmCfg().kol).concat(['Tes cetak printer dot matrix', '1234567890'.repeat(Math.ceil(dmCfg().kol / 10)).slice(0, dmCfg().kol), 'Jika baris ini terpotong di kanan, kurangi jumlah kolom / margin kiri.'])], { nama: 'tes-cetak' });
