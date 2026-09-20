# Fotoğraf Arşivim

## Fotoğraf Haritası (/harita)

`/harita`, mevcut statik HTML/CSS/JavaScript mimarisini kullanır. Google Maps yalnızca bu sayfada, resmi async script yükleme yöntemiyle açılır. Türkiye viewport merkezi 39,35'tir; fotoğraf konumu değildir. Konum arama ve kategoriler pasiftir. Fotoğraf katmanı yalnızca ŞEHİRLER dosyalarının doğrulanmış EXIF GPS verisini kabul eder; geocoding veya koordinat tahmini yapılmaz.

Vercel → Settings → Environment Variables bölümünde **PUBLIC_GOOGLE_MAPS_API_KEY** ekleyin ve yeniden deploy edin. Build bu tek public değeri `.site/map-config.js` dosyasına yazar; diğer ortam değişkenlerini dışarı aktarmaz. Yerel geliştirmede aynı değişkeni kabuk ortamında tanımlayıp `npm run dev` çalıştırın. `.env` otomatik okunmaz. Anahtar yoksa açıklayıcı yapılandırma mesajı gösterilir ve Google'a istek yapılmaz.

Google Cloud projesinde faturalandırma yapılandırılmalı ve yalnızca **Maps JavaScript API** etkinleştirilmelidir. Anahtarda Application restrictions → Websites (HTTP referrers) altında `https://arsiv.mavikadraj.com.tr/*` tanımlayın. API restrictions → Restrict key altında yalnızca Maps JavaScript API seçin. Yerel geliştirme için tercihen ayrı anahtarda `http://localhost:8767/*`, `http://127.0.0.1:8767/*` ve production çıktı testi için `http://127.0.0.1:8768/*` kullanın. Vercel preview gerekiyorsa yalnızca kendi preview alan adınızı ekleyin; genel `*.vercel.app` izni vermeyin. Tarayıcı anahtarı görünürdür; koruma domain/API kısıtlarıyla sağlanır. Kota ve bütçe uyarılarını Google Cloud'da yapılandırın.

`harita/photo-map.js` viewport'u, `harita/photo-layer.js` fotoğraf noktalarını yönetir. Google Maps Data katmanında 48 piksellik dünya koordinatı hücreleriyle hafif gruplama yapılır; yakınlaşınca noktalar ayrılır, aynı koordinattaki fotoğraflar popup içindeki Önceki/Sonraki ile erişilebilir kalır. Hücre sınırlarına yakın noktalar ayrı gruplarda olabilir. Görsel yalnızca popup açıldığında yüklenir; mevcut thumbnail tercih edilir. Ayrı fotoğraf detay route'u olmadığından Fotoğrafı Aç mevcut orijinal public görsel URL'sini kullanır. Buraya Git, seçilen fotoğrafın gerçek GPS değerlerinden `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` üretir. Yeni API/paket/map ID gerekmez.

### ŞEHİRLER GPS envanteri

Mevcut fiziksel dosya sayısı **237**, geçerli GPS **0**, GPS olmayan **237**, geçersiz/okunamayan GPS **0**, fotoğraf/nokta sayısı **0**. Bu dosyaların tamamında EXIF kaydı yoktur. GPS içeren orijinaller sağlanmadan gerçek çekim noktaları eklenemez. Önceden silinmiş `Bolu/Atatürk Orman Parkı/IMG_4597.JPG` fiziksel envantere dahil değildir; dosya geri getirilmedi veya değiştirilmedi.

`python scripts/extract-city-gps.py` yalnızca `images/ŞEHİRLER/` içindeki dosyaları okur. Yerelde mevcut Pillow 12.3.0 kullanıldı; Vercel build'ine Python bağımlılığı eklenmedi. GPSInfo IFD (34853) içindeki GPSLatitude (2), GPSLatitudeRef (1), GPSLongitude (4), GPSLongitudeRef (3) okunur. DMS ve yarımküre işaretleri doğrulanır; eksik referanslar, aralık dışı değerler, okunamayan kayıtlar ve şüpheli 0,0 atlanır. EXIF veya görsel dosyalarına yazılmaz.

Dosya bazında yollar, public URL'ler, klasör bilgisi, ham GPS alanları ve SHA-256 özetleri `reports/city-gps-inventory.json` içinde tutulur; bu rapor yayın çıktısına kopyalanmaz. Harita veri seti `harita/city-photos.js` içindedir ve şu anda boş dizidir. Dosyalar değiştiğinde çıkarıcıyı tekrar çalıştırıp envanterle veri setini birlikte commit edin. `python scripts/extract-city-gps.py --check` kaynakları tekrar okuyarak veri setini ve dosya özetlerini doğrular.

GPS dönüşümü testleri: `python -B scripts/verify-city-gps.py`. Katman/popup/yol tarifi testleri: `node scripts/verify-photo-layer.cjs`. Test koordinatları yalnızca izole testlerde kullanılır; haritaya yayınlanmaz. Gerçek GPS kaydı bulunmadığından gerçek fotoğraf/marker örneklemesi yapılamadı; popup ve Google nesneleri testlerde taklit edildi.

Kontrol: `npm run build`, ardından `node scripts/serve-production.cjs`; ayrı terminalde `node scripts/verify-map.cjs`, `node scripts/verify-seo.cjs` ve `node scripts/verify-category-navigation.cjs`. Harita testi Google API'yi taklit ederek hata durumlarını kontrol eder; gerçek API anahtarıyla tarayıcıdaki masaüstü/mobil ve Google yükleme kontrolünün yerine geçmez.

Resmi kaynaklar: [Google Maps yükleme](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [API güvenliği](https://developers.google.com/maps/api-security-best-practices).

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
