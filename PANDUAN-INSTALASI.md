# PASUNDAN SETIA SEJAHTERA — Panduan Instalasi (v1.0.0)

Kasir · Stok Barang · Harga Eceran/Grosir/Proyek · Penjualan Kredit (Piutang) · Nota & Kuitansi Dot Matrix · Barang Masuk · Biaya · Laporan Email · Backup · Mode Offline
Distributor Plafon PVC & Baja Ringan — Jl. Lintas Pantai Timur Sumatera SB 9 Sidobinangun, Seputih Banyak, Lampung Tengah
Lisensi / hak cipta © **Arraihan Academy**

Aplikasi terdiri dari dua bagian:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs` + `appsscript.json` (berkas terpisah, bukan di ZIP) | Google Apps Script |
| **Frontend** | ZIP `pasundan-setia-sejahtera` (`index.html`, `css/`, `js/`, `icons/`, `sw.js`, …) | GitHub Pages |

**Penyimpanan di Google Drive Anda (otomatis dibuat):**
- `📁 PASUNDAN SETIA SEJAHTERA` → database `🗃️ DB_PasundanSetiaSejahtera` (+ hasil ekspor Excel & arsip)
- `📁 PASUNDAN SETIA SEJAHTERA — BACKUP` → 7 salinan backup harian terbaru

---

## BAGIAN A — Pasang Backend (±5 menit)

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `PSS API`.
2. Hapus seluruh isi `Code.gs`, lalu **tempel isi `Kode.gs`**.
3. ⚙ **Project Settings** → centang **Show "appsscript.json" manifest file in editor**. Buka `appsscript.json`, **ganti seluruh isinya** dengan berkas `appsscript.json` yang diberikan. Simpan.
4. Pilih fungsi **`setupAppEnvironment`** → **Run** → **Review permissions** → pilih akun → *Advanced* → *Go to … (unsafe)* → **Allow**.
5. Buka **Execution log**. **Catat dua hal yang hanya tampil sekali:**
   - 👤 `ID karyawan: owner` dan `PIN: ........` (wajib ganti PIN saat login pertama)
   - 🔐 `Nama pengguna: darurat` dan `Kata sandi: ................` (akses darurat bila semua akun terkunci)
6. (Opsional, hanya uji coba) jalankan **`isiDataDemo`** → 7 barang contoh + 2 pelanggan. Harga hanya contoh; hapus/ubah sebelum dipakai sungguhan.
7. **Deploy → New deployment → ⚙ Web app** → *Execute as*: **Me** · *Who has access*: **Anyone** → **Deploy** → salin **Web app URL** berakhiran `/exec`.

> Setiap kali `Kode.gs` diubah: **Deploy → Manage deployments → ✏ → Version: New version → Deploy**. URL tidak berubah.

---

## BAGIAN B — Isi alamat backend di frontend

1. Ekstrak `pasundan-setia-sejahtera.zip`. Folder hasil ekstraksi **`pasundan-setia-sejahtera`** adalah folder proyek (langsung berisi `index.html`).
2. Buka **`js/config.js`** dengan Notepad, ganti `GANTI_DENGAN_URL_EXEC`:

```js
GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
```

---

## BAGIAN C — Pasang Frontend di GitHub Pages (lewat terminal)

> ⚠️ **Jangan** memakai *Add file → Upload files* di web GitHub — struktur folder (`css/`, `js/`) rusak dan situs 404.

**C1. Install Git** — Windows: <https://git-scm.com/download/win> (pengaturan default). Cek: `git --version`.
**C2. Akun GitHub** — daftar di <https://github.com>.
**C3. Identitas Git (sekali saja)**
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@akun-github-anda.com"
```
**C4. Buat repository** — github.com → **+** → **New repository** → nama `pasundan-setia-sejahtera` → **Public** → *jangan* centang README/.gitignore/license → Create.

**C5. Masuk ke folder yang BENAR dan periksa isinya**

Folder kerja adalah **folder `pasundan-setia-sejahtera` hasil ekstraksi** (yang langsung berisi `index.html`) — bukan folder di atasnya, bukan di dalamnya.
```powershell
cd "C:\Users\NAMA\Downloads\pasundan-setia-sejahtera"
dir
```
Harus terlihat: `index.html`, `sw.js`, `manifest.webmanifest`, folder `css`, `js`, `icons`. Tidak boleh ada berkas `.gs`. Jika hanya terlihat satu folder bernama sama, masuk satu level (`cd pasundan-setia-sejahtera`).

**C6. Push pertama** (satu per satu)
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/pasundan-setia-sejahtera.git
git push -u origin main
```
Saat diminta *Password*, tempel **Personal Access Token** (bukan password akun): GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate → centang **repo** → salin `ghp_...`. Saat paste token layar tampak kosong — normal; tekan Enter.

**C7. Aktifkan Pages** — repo → **Settings → Pages** → *Deploy from a branch* → **main** / **(root)** → **Save**. Tunggu 1–2 menit: `https://USERNAME.github.io/pasundan-setia-sejahtera/`

**C8. Memperbarui aplikasi** (di folder yang sama)
```bash
git add .
git commit -m "Pembaruan"
git push
```
Jika berkas aplikasi diubah, naikkan `VER` di `sw.js` (mis. `pss-v1.0.1`) agar perangkat mengambil versi baru.

---

## BAGIAN D — Pemakaian pertama

1. Buka alamat situs → login `owner` + PIN dari log → **ganti PIN**.
2. **Pengaturan → Usaha**: nama, telepon/WA, rekening pembayaran, pajak (0 = tanpa pajak), batas diskon kasir, jatuh tempo kredit.
3. **Pengaturan → Usaha → Cetak printer dot matrix**: pilih ukuran kertas dot matrix, kolom, baris (lihat Bagian E) → **Tes cetak**.
4. **Pengaturan → Pengguna**: buat akun Kasir (PIN min. 6 karakter).
5. **Barang & Stok**: isi barang (atau **Impor** dari Excel/CSV): satuan dasar (lembar/batang/pcs), satuan besar bila ada (1 dus = 10 lembar), **harga eceran / grosir / proyek**, harga beli, stok awal, stok minimum.
6. **Pelanggan**: tambahkan langganan/kontraktor → atur **level harga**, **boleh kredit**, dan **limit kredit** (hanya Owner).
7. Pasang sebagai aplikasi: menu browser → *Install app / Tambahkan ke layar utama*.

**Peran:** *Owner* semua fitur · *Kasir*: kasir, nota sendiri, terima pembayaran piutang, tambah pelanggan, catat barang masuk/biaya/barang rusak — **tidak** bisa void, ubah barang/harga, opname, atur kredit pelanggan, lihat laporan atau harga beli.

### Alur harian kasir
1. Login → pilih shift → isi modal kas laci → **Buka shift**.
2. **Kasir**: ketuk barang → atur jumlah/satuan (lembar atau dus) → pilih **level harga** (Eceran/Grosir/Proyek) atau pilih **pelanggan** (level mengikuti pelanggan) → harga boleh dinego (kasir dibatasi %) → **＋ Ongkir/jasa** bila perlu → **Bayar** (Tunai/Transfer/QRIS/Debit/**Kredit**).
3. **Kredit**: pilih pelanggan yang diizinkan kredit, isi DP (opsional) dan jatuh tempo. Sisanya masuk menu **Piutang**.
4. Setelah bayar: **🖨️ Nota** atau **🧾 Kuitansi** (dot matrix), atau kirim lewat WhatsApp.
5. **Piutang → Terima bayar**: cicilan/pelunasan + cetak kuitansi (nomor kuitansi otomatis, ada terbilang).
6. Selesai kerja: **Tutup Shift / Keluar** → hitung uang fisik → sistem menunjukkan selisih (tunai penjualan + DP/cicilan tunai − biaya/belanja dari kas) → laporan terkirim ke email Owner.

### Mode offline
- Setelah login online **sekali** di sebuah perangkat, aplikasi, barang, pelanggan, dan piutang tersimpan di perangkat dan tetap terbuka tanpa internet.
- Saat offline: kasir (termasuk kredit), terima pembayaran piutang, tambah pelanggan, barang masuk, biaya, barang rusak, dan tutup shift tetap bisa. Indikator bawah: **Offline · N menunggu**. Stok & piutang di layar ikut berubah.
- Saat internet kembali, antrean terkirim otomatis dan **idempoten** (tidak ada nota/pembayaran ganda walau terkirim dua kali). Jika server menolak (mis. limit kredit terlampaui, stok diblokir), item ditandai **Perlu tinjau** di panel antrean (ikon 📤): coba lagi atau buang.
- Login offline hanya untuk akun yang pernah masuk di perangkat itu dan **hanya melanjutkan shift yang masih terbuka**. Shift baru harus dibuka saat online.
- Perlu internet: ubah barang/harga, laporan lama, void, pengaturan, email, backup, batalkan pembayaran.

### Aturan bisnis yang dijaga server
Harga level, total, pajak & HPP dihitung ulang server · stok terpotong otomatis (satuan besar dikonversi ke satuan dasar) · void mengembalikan stok · turun harga/diskon kasir dibatasi · nota ganda ditolak · pembayaran ganda ditolak · kredit hanya untuk pelanggan yang diizinkan & dalam limit · pembayaran piutang tidak boleh melebihi sisa · nota kredit yang sudah ada pembayaran tidak bisa di-void (batalkan pembayaran dulu) · harga beli memakai rata-rata bergerak · **stok boleh minus** kecuali *Blokir penjualan bila stok tidak cukup* diaktifkan.

---

## BAGIAN E — Cetak printer dot matrix (kertas continuous)

Cetak memakai teks monospasi (Courier) dengan lebar kolom tetap, sehingga rapi dan cepat di dot matrix (Epson LX/LQ, dll).

**Pengaturan → Usaha → Cetak printer dot matrix:**

| Kertas | Ukuran | Baris/halaman (6 lpi) | Kolom disarankan |
|---|---|---|---|
| Setengah halaman (nota/kuitansi) | 9,5 × 5,5 in | **33** | 80 (10 cpi) |
| Satu halaman | 9,5 × 11 in | **66** | 80 (10 cpi) atau 96 (12 cpi) |
| A4 lembar tunggal | A4 | 66 | 80 |

Nota yang panjang otomatis berlanjut ke halaman berikutnya dengan kop diulang dan penomoran *Hal 1/2*.

**Langkah di Windows (sekali per komputer):**
1. Install driver printer. Buka **Printer Properties → Preferences / Printing Preferences** → tambahkan **ukuran kertas khusus** yang sama dengan pilihan di aplikasi (mis. 9,5 × 5,5 in), mode **Draft** untuk cepat.
2. Di aplikasi tekan **Tes cetak**. Jika baris terpotong di kanan → kurangi kolom atau **margin kiri**; jika terlalu ke bawah → atur **margin atas**/baris per halaman.
3. Di dialog cetak browser: pilih printer, **Margins: None**, **Scale: 100%**, matikan *Headers and footers*.

**Cetak lebih cepat (disarankan bila printer lambat):** tekan **⬇ .TXT** di pratinjau, buka berkas dengan Notepad lalu cetak lewat driver **Generic / Text Only** — dot matrix mencetak teks langsung tanpa mode grafis.

---

## BAGIAN F — Impor data (Excel / CSV)

**Barang & Stok → ⬆ Impor** (atau Pengaturan → Data & Backup) → **Unduh template** → isi → **Periksa dulu (simulasi)** → **Impor**.
- Kolom: `nama, satuan, kategori, kode, stok, stok_min, harga_beli, harga, harga_grosir, harga_proyek, satuan2, isi2, supplier` (nama kolom fleksibel).
- Harga boleh `15000` atau `15.000`. Nama adalah kunci: impor ulang tidak membuat data ganda; centang *Perbarui yang sudah ada* untuk menimpa harga.
- Excel (.xlsx) memuat pustaka pembaca dari internet sekali; bila tidak tersedia, simpan sebagai CSV.

---

## BAGIAN G — Backup & pemulihan
- **Otomatis** tiap malam 02.00 → salinan `💾 BACKUP_PSS_tanggal_jam` di folder **`📁 PASUNDAN SETIA SEJAHTERA — BACKUP`** (disimpan **7 salinan terbaru**).
- **Backup sekarang**, **Ekspor Excel ke Drive** (folder utama), **Unduh CSV** laporan.
- **Pulihkan dari backup**: mengganti semua data dengan backup terbaru (ketik `PULIHKAN`). Gunakan hanya bila data rusak.
- **Arsip (opsional, ±setahun sekali)**: bila transaksi sudah sangat banyak, jalankan `arsipkanTransaksi(12)` di editor Apps Script **setelah jam tutup**; transaksi lebih lama dari 12 bulan dipindah ke file `🗄️ ARSIP_Transaksi…` di folder utama (backup dibuat dulu).

---

## BAGIAN H — Keamanan
- ID spreadsheet/folder, email owner, dan rahasia sesi disimpan di **Script Properties**, bukan di kode, Sheets, atau frontend.
- PIN disimpan sebagai hash bersalt; 5 percobaan salah → terkunci 10 menit. Login offline memakai hash PBKDF2 di perangkat (PIN tidak disimpan).
- Jangan membagikan spreadsheet `DB_PasundanSetiaSejahtera` (berisi hash PIN) maupun folder Drive-nya. Putus semua sesi: jalankan `rotasiSecretSesi`. Akses darurat baru: `resetAksesDarurat`.
- Frontend hanya memuat URL `/exec` (publik). Semua hak akses dicek ulang di server, bukan hanya di layar.

---

## BAGIAN I — Laporan email otomatis ke Owner

| Laporan | Kapan | Isi |
|---|---|---|
| **Tutup shift** | Setiap shift ditutup | Penjualan, laba kotor, rekonsiliasi kas (termasuk tagihan piutang tunai), **selisih**, barang terlaris |
| **Rekap harian** | Tiap hari (default 22.00) | Penjualan, HPP, laba, biaya, **laba bersih**, penjualan kredit, piutang tertagih & beredar, stok menipis |
| **Rekap mingguan** | Senin 07.00 | Isi seperti harian + tren, per kasir/metode/level, hutang supplier |
| **Rekap bulanan** | Tanggal 1, 07.00 | Isi sama untuk satu bulan |

**Mengaktifkan (sekali):** di Apps Script jalankan **`aktifkanLaporanEmail`** → Allow → **Deploy → Manage deployments → New version**. Lalu di aplikasi (Owner): **Pengaturan → Laporan Email** → isi email → centang laporan → **Simpan** → **Kirim email uji**. Cek folder Spam bila tidak masuk.

---

## BAGIAN J — Masalah umum
| Gejala | Penyebab / solusi |
|---|---|
| "Konfigurasi belum lengkap" | `GAS_URL` di `js/config.js` belum diisi → isi, lalu `git add . && git commit -m x && git push` |
| Halaman putih / CSS 404 | Struktur folder salah saat push → `index.html` harus di root repo, `css/` & `js/` utuh |
| "Respons server tidak valid" | Deployment harus *Execute as: Me* & *Anyone*; setelah ubah kode → *New version* |
| "Database belum dibuat" | Jalankan `setupAppEnvironment` di editor Apps Script |
| Perangkat tidak memuat versi baru | Naikkan `VER` di `sw.js`, push, muat ulang 2 kali |
| Cetak terpotong / kebanyakan halaman | Samakan ukuran kertas di driver & aplikasi; margin: None; skala 100%; sesuaikan kolom/baris/margin |
| "Penjualan kredit wajib memilih pelanggan" | Pilih pelanggan terdaftar di kasir; Owner harus mencentang *Boleh beli kredit* di data pelanggan |
| Item antrean "Perlu tinjau" | Buka 📤 → baca alasan (mis. limit kredit) → Coba lagi atau Buang |
| Lupa PIN Owner | **Akses darurat** di halaman login, lalu reset PIN di Pengaturan → Pengguna |

© Arraihan Academy — seluruh hak cipta dilindungi.
