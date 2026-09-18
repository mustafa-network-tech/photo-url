# Fotoğraf Arşivim

## SEO production çıktısını kontrol etme

`npm run build` ana sayfayı ve gerçek kategorilerin `/kategori/<slug>/` sayfalarını ilk HTML içeriğiyle `.site` altında üretir. Canonical/OG domaini `https://arsiv.mavikadraj.com.tr` adresidir. `sitemap.xml`, kategori sayfalarına ilişkilendirilen Google image extension girdilerini içerir; eksik dosyalar kaynak kayıtlardan silinmez ve sitemap'e alınmaz. Slug çakışması build'i durdurur.

`node scripts/serve-production.cjs` ile çıktıyı `http://127.0.0.1:8768/` adresinde açın; ayrı kabukta `node scripts/verify-seo.cjs` çalıştırın. Sonuçlar `SEO-TEST-RESULTS.json` dosyasına yazılır. PowerShell npm execution policy hatası verirse `npm.cmd run build` kullanın. Mevcut `npm run dev` kaynak dosyaları ve korumalı API'yi çalıştırır; SEO route doğrulaması için production sunucusunu kullanın.

Mevcut yeşil/krem tasarım ve URL kopyalama özelliği korunur. Ana sayfa yalnızca KONULAR ve ŞEHİRLER klasörlerini gösterir.

## Görünür koleksiyonlar

- `images/KONULAR/<kategori>/<alt kategori>/fotoğraf.jpg`
- `images/ŞEHİRLER/<şehir>/<yer>/fotoğraf.jpg`

Ana sayfada en fazla altı konu başlığından üçer seçilmiş fotoğraf; her şehir/doğrudan fotoğraf içeren şehir alt klasöründen en fazla üç fotoğraf bulunur. Başlıkların “Tümünü gör” düğmesi, kategori ve alt kategori seçimi ve Türkçe karakter duyarsız arama tüm ilgili fotoğrafları açar. Sonuçlar 36'lık parçalar halinde gösterilir.

## Menüde ve genel aramada görünmeyen koleksiyonlar

- Doğa: `index.html?koleksiyon=doga`
- Gönül Pusulası: `index.html?koleksiyon=gonul-pusulasi`
- Mevcut eski Duygusal klasörü: `index.html?koleksiyon=duygusal`

Gönül Pusulası fotoğraflarını `images/gonul-pusulasi/` içine koyun. Bu klasör şu anda mevcut değildir; Doğa ile mevcut Duygusal dosyaları birbirine karıştırılmadan korunmuştur.

Doğa ve Gönül Pusulası menüde kilitli bağlantılar olarak görünür; görselleri genel veri listesinde, sayıda, aramada veya ana sayfada bulunmaz. Vercel sürümünde özel liste ve görseller yalnızca şifre doğrulandıktan sonra sunucu tarafından gönderilir. Oturum çerezi HttpOnly ve üretimde Secure olarak ayarlanır; oturum 8 saattir. Özel klasörler statik yayın çıktısına alınmaz. Mevcut GitHub Pages/halka açık GitHub deposundaki eski kopyalar bu korumadan etkilenmez. İstenen hero resmi halka açık GitHub URL’sinden yüklenir.

## Yeni fotoğraf ekleme

Fotoğrafı doğru klasöre ekleyip `scripts/update-gallery.cmd` çalıştırın. Galeri verileri, alt kategori listeleri ve sayılar yenilenir. Fotoğraflar taşınmaz veya yeniden adlandırılmaz. Türkçe/boşluk içeren mevcut URL'ler korunur.

İsteğe bağlı `photo-tags.json` dosyasında fotoğrafın yoluna şehir/konu etiketleri ve açıklama eklenebilir:

```json
{"images/KONULAR/Günbatımı/ornek.jpg":{"label":"Gökçeada'da günbatımı","tags":["Gökçeada","Deniz","Günbatımı"]}}
```

Klasör adları otomatik aranır. Bir konu fotoğrafının şehir bilgisi dosyada/etiketlerde yoksa konum tahmin edilmez. Bu sürümde var olan genel görsellerin ayrı küçük önizlemeleri `thumbnails/` altında oluşturuldu; büyük önizleme ve kopyalanan URL her zaman asıl görsele gider. Sonradan eklenen görselin küçük önizlemesi yoksa asıl görsel kullanılır.

## Yayınlama

Yerel sürüm düzenlenmiştir; otomatik commit, push veya yayınlama yapılmamıştır. Güncellenen HTML, CSS, JavaScript, galeri verileri ve thumbnails klasörünü fotoğraflarla birlikte yayınlayın. Eski fotoğraf yollarının kullanıcı tarafından değiştirildiği yerlerde eski bağlantılar ayrıca korunmalıdır; bu düzenleme hiçbir görseli taşımaz.

## Vercel kurulumu ve kilitli alanlar

Framework Preset: Other. Build Command: `npm run build`. Output Directory: `.site` (`vercel.json` içinde tanımlı). Sunucu fonksiyonları `api/` altında.

Vercel Settings → Environment Variables bölümünde:

- `ARCHIVE_PASSWORD`: güçlü, sadece sizin bildiğiniz şifre.
- `ARCHIVE_SESSION_SECRET`: en az 32 karakterlik rastgele gizli anahtar; şifreden farklı olsun.

Bu iki değer boşsa özel alanlar kapalı kalır (503); varsayılan/açık şifre yoktur. Değerleri kod dosyalarına veya GitHub'a yazmayın. Yerel geliştirmede ortam değişkenlerini tanımlayıp `npm run dev` çalıştırın. `.env` otomatik yüklenmez; kabuk ortam değişkenleri kullanılır.

Görseller fiziksel konumlarını korur. Build yalnızca Konular/Şehirler ile küçük önizlemelerini `.site` içine kopyalar. Doğa/Gönül/Duygusal görsellerinin `private-web/` altındaki, en fazla 2000 piksel web kopyaları yalnızca korumalı API fonksiyonuna dahil edilir. Asıl fotoğraflar değişmez; yeni özel görseller için önce Windows galeri güncellemesini çalıştırın. Genel galerideki kopyalama asıl statik URL'yi; özel galerideki kopyalama oturum gerektiren API URL'sini verir. Özel URL başka bir sitede ziyaretçilere açık görsel olarak kullanılamaz.

Özel görselleri içeren GitHub deposu herkese açıksa, repo içinden erişim ayrıca devam eder; gerçek gizlilik için özel depo ve eski halka açık kopyaların ayrıca ele alınması gerekir. Hiçbir dosya otomatik silinmedi, uzak depoya gönderilmedi veya yayınlanmadı.

Vercel yapılandırması resmi dokümana göre hazırlanmıştır: https://vercel.com/docs/project-configuration/vercel-json . Sunucu fonksiyonunun toplam özel görsel paketi planın fonksiyon paket boyutu sınırına tabidir; büyük özel arşiv için korumalı nesne depolaması gerekir.
