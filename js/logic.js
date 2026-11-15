'use strict';
/* PASUNDAN SETIA SEJAHTERA · logic — harga bertingkat, satuan ganda, stok, total, agregasi (dipakai kasir, offline & online) */
const round3 = v => Math.round(v * 1000) / 1000;
const LEVEL = ['Eceran', 'Grosir', 'Proyek'], METODE = ['Tunai', 'Transfer', 'QRIS', 'Debit', 'Kredit'], METODE_BAYAR = ['Tunai', 'Transfer', 'QRIS', 'Debit'];
const barangOf = id => S.barang.find(b => b.id_barang === id), pelOf = id => S.customers.find(c => c.id_pelanggan === id);
const multOf = (b, sat) => (b && sat && sat === b.satuan2 && num(b.isi2) > 0) ? num(b.isi2) : 1;
function hargaLevel(b, level) { const h = level === 'Grosir' ? num(b.harga_grosir) : level === 'Proyek' ? num(b.harga_proyek) : num(b.harga); return Math.round(h > 0 ? h : num(b.harga)); }
const hargaSat = (b, level, sat) => hargaLevel(b, level) * multOf(b, sat);
const baseQty = it => { const b = barangOf(it.id_barang); return b ? round3(num(it.qty) * multOf(b, it.sat)) : 0; };
function localDeduct(items, sign) { items.forEach(it => { if (!it.id_barang) return; const b = barangOf(it.id_barang); if (b) b.stok = round3(num(b.stok) - sign * baseQty(it)); }); }
function calcTotals(sub, diskon) {
  diskon = Math.min(Math.max(0, Math.round(num(diskon))), sub);
  const pajak = Math.round((sub - diskon) * num(cfg().pajak_persen) / 100);
  return { sub, diskon, pajak, total: sub - diskon + pajak };
}
function stokStatus(b) { const s = num(b.stok), mn = num(b.stok_min); return s <= 0 ? 'habis' : (mn > 0 && s <= mn) ? 'tipis' : 'ok'; }
const sisaPiutang = p => num(p.total) - num(p.dibayar);
const piutangAktif = () => S.piutang.filter(p => p.status === 'BELUM LUNAS');
const piutangPel = id => piutangAktif().filter(p => p.id_pelanggan === id).reduce((a, p) => a + sisaPiutang(p), 0);
function alerts() {
  const a = [], t = todayStr();
  S.barang.forEach(b => { const s = stokStatus(b); if (s === 'habis') a.push({ t: 'bad', ic: '⛔', x: b.nama + ' habis' }); else if (s === 'tipis') a.push({ t: 'warn', ic: '📉', x: b.nama + ' menipis (' + qfmt(b.stok) + ' ' + b.satuan + ')' }); });
  piutangAktif().forEach(p => { if (p.jatuh_tempo && p.jatuh_tempo <= addDaysStr(t, 3)) a.push({ t: p.jatuh_tempo < t ? 'bad' : 'warn', ic: '💳', x: 'Piutang ' + p.pelanggan + ' ' + (p.jatuh_tempo < t ? 'LEWAT jatuh tempo ' : 'jatuh tempo ') + tglIndo(p.jatuh_tempo) + ' (' + rp(sisaPiutang(p)) + ')' }); });
  if (isOwner()) S.purchases.forEach(p => { if (p.status === 'BELUM LUNAS' && p.jatuh_tempo && p.jatuh_tempo <= addDaysStr(t, 3)) a.push({ t: 'warn', ic: '🏭', x: 'Hutang ' + (p.supplier || 'supplier') + ' jatuh tempo ' + tglIndo(p.jatuh_tempo) + ' (' + rp(num(p.total) - num(p.dibayar)) + ')' }); });
  const rv = Q.filter(x => x.state === 'REVIEW').length; if (rv) a.unshift({ t: 'bad', ic: '📤', x: rv + ' data gagal terkirim — periksa antrean' });
  return a;
}
function aggLocal(list) {
  const a = { n: 0, omzet: 0, hpp: 0, total: 0, diskon: 0, kredit: 0, byMetode: {}, byJam: {}, byBarang: {}, byTipe: {} };
  list.forEach(t => {
    if (t.status === 'VOID') return; const om = num(t.total) - num(t.pajak);
    a.n++; a.omzet += om; a.total += num(t.total); a.hpp += num(t.hpp); a.diskon += num(t.diskon); if (t.metode_bayar === 'Kredit') a.kredit += num(t.total);
    a.byMetode[t.metode_bayar] = (a.byMetode[t.metode_bayar] || 0) + num(t.total);
    const j = String(t.tanggal_waktu).substr(11, 2); a.byJam[j] = (a.byJam[j] || 0) + om; a.byTipe[t.tipe] = (a.byTipe[t.tipe] || 0) + om;
    (t.items || []).forEach(l => { const k = l.id_barang || ('~' + l.nama), r = a.byBarang[k] = a.byBarang[k] || { nama: l.nama, sat: l.sat, qty: 0, omzet: 0, hpp: 0 }; r.qty += num(l.qty); r.omzet += num(l.subtotal); r.hpp += num(l.hpp); });
  });
  a.laba = a.omzet - a.hpp; return a;
}
function waLink(telp, text) { let n = String(telp || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '62' + n.slice(1); return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text); }
function waNota(t) {
  const c = cfg(); let s = '*' + c.namaUsaha + '*\nNota ' + (t.no_nota || '-') + ' · ' + String(t.tanggal_waktu).substr(0, 16) + '\n\n';
  (t.items || []).forEach(l => { s += l.nama + '\n  ' + qfmt(l.qty) + ' ' + (l.sat || '') + ' × ' + rpn(l.harga) + ' = ' + rpn(l.subtotal) + '\n'; });
  s += '\n' + (num(t.diskon) ? 'Diskon: ' + rp(t.diskon) + '\n' : '') + 'Total: *' + rp(t.total) + '* (' + t.metode_bayar + ')';
  if (t.metode_bayar === 'Kredit') s += '\nJatuh tempo: ' + tglIndo(t.jatuh_tempo);
  return s + '\n\n' + (c.rekening ? 'Transfer: ' + c.rekening + '\n' : '') + c.footer;
}
