# MAVİ KADRAJ FOTOĞRAF ARŞİVİ SEO RAPORU

18 Eylül 2026 — Yerel çalışma. Commit, push, deploy ve Search Console işlemi yapılmadı.

## A — Mimari

Framework: Yok; HTML/CSS ve vanilla JavaScript. Proje version: 1.0.0. React version: uygulanamaz. Node: 22.23.2; package engines >=22. Dependency yok.

Rendering: Önceden CSR; artık build sırasında statik ön üretim (SSG), ardından mevcut JS filtreleme. Routing: ana sayfa, 26 fiziksel kategori landing page; özel koleksiyonlar mevcut query parametresini kullanıyor.

Build: `npm run build`, `scripts/build-site.cjs`. Hosting: vercel.json, framework null, outputDirectory .site, api/ sunucu fonksiyonları. Canlı deployment içeriğinin yerelle eşleştiği doğrulanamadı.

Data/image/category source: images/KONULAR ve images/ŞEHİRLER klasörleri. Kaynak gallery-data.js güncelleme betiğinin çıktısı; production build klasörleri yeniden tarar. Metadata: dosya adı, klasör kategorisi, alt kategori, etiketler; isteğe bağlı photo-tags.json şu anda yok. Fotoğraf URL: mevcut `new URL(item.path, document.baseURI).href`; kategori sayfalarında base / eklenerek aynı kök fotoğraf yolları korunuyor.

Image component: native img; thumbnail varsa thumbnails/, önizleme ve kopyalama images/ aslına gider. Lazy loading ve async decoding zaten vardı. Canonical, OG, structured data ve sitemap önceden yoktu. Robots yalnızca API'yi engelliyordu.

## B — Envanter

Genel arşiv: Gerçek kategori 26; kaynak kayıt 1411; fiziksel orijinal 1409; production UI toplamı 1409; public URL üretilebilen kaynak kayıt 1411; fiziksel olarak karşılığı olan public URL 1409; yerel production HTTP ile erişilebilir 1409. Ana sayfa grid'inde toplamın tamamı yerine mevcut seçilmiş 50 kart bulunur.

Eksik genel dosyalar:

- images/KONULAR/Göller ve Akarsular/IMG_4638.JPG
- images/ŞEHİRLER/Bolu/Atatürk Orman Parkı/IMG_4597.JPG

Sahipsiz genel orijinal: 0. Case uyuşmazlığı: 0. Kaynak kayıtlar değiştirilmedi; eksik dosyalar UI üretiminde mevcut build taramasına göre zaten dışarıda kalıyordu. Sitemap'e alınmadılar.

1409/1410/1411 farkı: Kaynak JS listesi 1411; Git HEAD'de izlenen orijinal 1410; mevcut disk 1409. IMG_4597.JPG silinmesi çalışma başlamadan Git durumunda mevcuttu. IMG_4638.JPG kaynakta var, diskte yok; bakılan Git geçmişinde bu yol için kayıt çıkmadı. Bu ölçümler farklı sayıların teknik nedenini gösterir; geçmiş canlı UI sayılarının her birinin hangi deployment'a ait olduğu kanıtlanamadı.

Özel envanter ayrı: gallery-private-data.js içinde 18 kayıt, karşılık gelen eski images/ orijinalleri yerelde yok; private-web/ içinde 18 korumalı web kopyası var. API gerçek listesini private-web üzerinden üretir. Genel+özel metadata toplamı 1429; images/ fiziksel orijinal toplamı 1409. Özel web kopyaları orijinal/public sayıya dahil edilmedi, SEO sayfası veya sitemap'e eklenmedi. Hiçbir kayıt/dosya silinmedi.

## C — SEO

Ana title: Mavi Kadraj Fotoğraf Arşivi | Konular ve Şehirler

Description: Mavi Kadraj Fotoğraf Arşivi’nde konu ve şehir kategorilerindeki fotoğrafları keşfedin, önizlemeleri inceleyin ve fotoğraf bağlantılarını kopyalayın.

Canonical: https://arsiv.mavikadraj.com.tr/

OG: title, description, url, image, type, locale, site_name; Twitter summary_large_image/title/description/image. OG için mevcut arşiv fotoğrafı kullanıldı; yeni görsel üretilmedi. Schema: ana sayfada WebSite ve CollectionPage, kategoride CollectionPage ve BreadcrumbList. Hayali fotoğraf/lisans/lokasyon bilgisi yok.

Robots: API dışında public kaynaklar açık, production sitemap referansı var. Public sayfalarda index,follow. Özel koleksiyon query URL'lerinde JS robots değerini noindex,follow yapar; ilk HTML aynı public şablondur. Sunucu tarafı query noindex ayrıca uygulanmadı; bu sınır production öncesi değerlendirilmelidir. Sitemap'te query/search/private URL yok.

## D — Kategori SEO

Toplam 26 gerçek kategori; 26 SEO route; 26 indexlenebilir landing page. Slug çakışması 0; gelecek çakışmada build otomatik seçim yapmak yerine hata verir.

Örnekler: /kategori/gunbatimi/, /kategori/bolu/, /kategori/can-dostlar/, /kategori/gokceada/.

Her sayfada benzersiz title/description/canonical/OG, tek H1, kategori görselleri, ana arşiv bağlantısı ve breadcrumb var. Ana sayfadaki Tümünü gör bağlantıları normal tıklamada eski JS filtre davranışını korur; yeni sekme/JS kapalı kullanımda gerçek route'a gider. Bütün kategoriler için main sonunda sade HTML linkleri eklendi. Tekil fotoğraf SEO sayfası oluşturulmadı.

## E — Google Görseller

Yöntem: standart sitemap image extension. Gerçek public fotoğraf 1409; sitemap'te 1409 benzersiz fotoğraf; genel kaynak kayda göre hariç kalan 2. Neden: fiziksel dosya eksik. Özel kayıtlar public SEO kapsamı dışında.

Kategori başına en yüksek image sayısı 323; her URL için 1000 sınırı aşılmıyor. Yalnızca image:loc kullanılır. Yöntem Google'ın resmi dokümanıyla uyumludur: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps

## F — Rendering

İlk HTML: ana sayfada 50 seçilmiş fotoğraf kartı, 26 gerçek kategori bağlantısı, 1409/26 sayaçları. Kategorilerde ilgili koleksiyonun tüm fiziksel fotoğraf kartları ve kategori sayaçları var. JS başladıktan sonra kategori grid'i mevcut 36'lık progressive loading davranışına döner. SSR sunucusu/framework dönüşümü yapılmadı; statik ön üretim kullanıldı.

## G — URL Stabilitesi

Fotoğraf yolları/dosya adları korundu; kopyalama URL üretimi değiştirilmedi. Kategori base / ile bütün build kayıtlarının kök URL eşitliği otomatik doğrulandı. Hero'daki vercel.app kaynak referansları aynı fotoğraf yollarıyla aynı origin üzerinden yüklenir; eski dosyalar/URL yolları değiştirilmedi.

URL kopyalama ve lightbox kod akışı incelendi; gerçek pano, lightbox açma/kapatma ve mobil etkileşim testi yapılamadı. Tarayıcı aracı bağlantı sunmadı; Windows computer-use mevcut Chrome URL'sini güvenle belirleyemediği için durdu. Çalışıyor sonucu verilmemektedir.

## H — Broken Links

Sitemap içindeki 1409 fotoğraf, 1409 thumbnail, 27 sayfa, 6 hero resmi ve temel CSS/JS kaynakları yerel HTTP 200. Kaynakta eksik 2 fotoğraf mevcut; sitemap dışında. Oluşturulan sayfalarda 404 yok; uydurma kategori adresi gerçek 404 döner. Yanlış canonical domain ve case problemi yok.

Ana marka sitesi ve kişisel site web aracıyla okunabildi; kişisel site /tr adresine yönleniyor. Instagram ve canlı arşiv web aracıyla okunamadı; bunu 404 olarak yorumlamıyoruz. Canlı HTTP durumu/deployment davranışı ayrıca doğrulanmalıdır.

## I — Performans

Ana sayfa 50 kart gösterir; 1409 orijinal aynı anda DOM'a eklenmez. 1409/1409 thumbnail mevcut; galeri thumbnail kullanır. Kartlar lazy, async decoding; hero high priority ve eager. Hero mevcut davranışla kalan 5 görseli sıralı önceden yükler. 1409 kart için thumbnail dosya başlığından width/height okunarak ilk HTML ve client kartlarına eklendi; orijinallere yazılmaz. 4:3 kart alanı/crop CSS'i korunur.

Responsive CSS mevcut; yeni srcset varyantı/format dönüşümü yapılmadı. Kategori ilk HTML'si tüm ilgili kartları içerir (en büyük 323), JS sonrası ilk 36 kart; bunun HTML/DOM geçiş maliyeti ve native lazy-loading request zamanlaması tarayıcıda ölçülmedi. JS veri listesi tüm public kayıtları içerir. LCP/CLS/istek sayısı/bundle transfer ölçümü yapılmadı. Riskli virtualization/gallery refactor uygulanmadı.

## J — Dosyalar

Değiştirilen: README.md, app.js, gallery-model.js, hero-slider.js, index.html, scripts/build-site.cjs, styles.css. CSS farkı yalnızca gerçek linke dönüşen Tümünü gör yazısının alt çizgisini kaldırır.

Yeni: scripts/seo-site.cjs, scripts/image-size.cjs, scripts/serve-production.cjs, scripts/verify-seo.cjs, SEO-TEST-RESULTS.json, SEO-RAPORU.md.

Üretilen .site: ana/kategori HTML, sitemap.xml, robots.txt, seo-inventory.json ve mevcut assets/data. .site Git tarafından ignore edilir ve build sırasında yeniden üretilir.

Bu çalışmada silinen orijinal/kayıt: yok. Git'te görünen IMG_4597.JPG silinmesi önceden mevcuttu. Kullanıcının değişikliği geri alınmadı. Build'in mevcut .site temizleme davranışı yalnızca türetilmiş yayın çıktısında gerçekleşir.

## K — Test

Production build: npm.cmd run build başarılı. TypeScript: projede yok. Lint: mevcut script/config yok. Mevcut test suite: yok; yeni framework kurulmadı. Node --check kontrolleri başarılı. Yeni bağımlılıksız verify-seo.cjs başarılı. git diff ve git diff --check incelendi; whitespace hatası yok (Git yalnızca LF/CRLF normalizasyon uyarısı verdi).

Sitemap: HTTP 200; application/xml; HTML değil; System.Xml gerçek XML parser ile geçerli namespace yapısı doğrulandı; 27 URL, 1409 image. localhost/vercel.app/preview yok; tüm sitemap sayfa/görselleri yerel HTTP 200. XML/JSON-LD ve canonical tek-H1 kontrolleri başarılı.

Robots: HTTP 200; text/plain; doğru sitemap reference; API dışında genel arşiv engellenmiyor. Test ayrıntıları SEO-TEST-RESULTS.json içinde.

Görsel regresyon, desktop/tablet/mobile, gerçek pano, lightbox, JS kapalı etkileşim ve canlı Vercel route/content-type testi tamamlanamadı. Yerel statik test sunucusu Vercel API/deployment emülasyonu değildir. Production hazır onayı bu sınırlamalarla verilmedi.

## L — Production Öncesi Kontrol

- Yerel production galerisini desktop/tablet/mobile boyutlarda karşılaştırın: hero, crop, kartlar, footer, yatay taşma, uzun URL ve kategori bağlantıları.
- Normal Tümünü gör filtrelemesini, yeni sekmede kategori açmayı, arama/alt kategori/36'lık devam yüklemeyi kontrol edin.
- Ana ve kategori sayfasında URL kopyalayın; beklenen kök fotoğraf URL'sini doğrulayın; lightbox ve X/kapatma kontrol edin.
- Eksik iki genel orijinalin durumunu ve özel orijinal/web-kopya farkını karar vererek inceleyin; bu çalışma otomatik veri onarımı yapmadı.
- Özel query URL'lerinin noindex yaklaşımını ve korumalı API oturum davranışını kontrol edin.
- Deploy kararı ayrı onay gerektirir. Onaylı deploy sonrasında canlı /, kategori, /robots.txt ve /sitemap.xml için HTTP/Content-Type/XML/canonical/index kontrollerini tekrar yapın; preview indexlenmesini kontrol edin.
- Canlı XML doğrulandıktan sonra arşiv sitemap'ini Search Console'a kendiniz gönderin. Bu çalışma Search Console'a girmedi.
