$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$imagesRoot = Join-Path $projectRoot "images"
$extensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")
$publicItems = @()
$privateItems = @()
$tagsPath = Join-Path $projectRoot "photo-tags.json"
$tags = if (Test-Path -LiteralPath $tagsPath) { Get-Content -LiteralPath $tagsPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
Get-ChildItem -LiteralPath $imagesRoot -Recurse -File | Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } | Sort-Object FullName | ForEach-Object {
  $relative = $_.FullName.Substring($imagesRoot.Length).TrimStart("\").Replace("\", "/")
  $parts = $relative.Split("/")
  if ($parts.Length -lt 2) { return }
  $root = $parts[0].Replace("İ","i").ToLowerInvariant()
  $collection = switch ($root) {
    "konular" { "konular" }
    "şehirler" { "sehirler" }
    "sehirler" { "sehirler" }
    "doga" { "doga" }
    "doğa" { "doga" }
    "gonul-pusulasi" { "gonul-pusulasi" }
    "gönül pusulası" { "gonul-pusulasi" }
    "duygusal" { "duygusal" }
    default { $null }
  }
  if (-not $collection) { return }
  $category = if ($parts.Length -gt 2) { $parts[1] } elseif ($collection -eq "doga") { "Doğa" } elseif ($collection -eq "gonul-pusulasi") { "Gönül Pusulası" } else { "Duygusal" }
  $detail = if ($parts.Length -gt 3) { ($parts[2..($parts.Length-2)] -join " / ") } else { "" }
  $path = "images/$relative"
  $thumb = "thumbnails/$relative.jpg"
  $itemTags = @($category,$detail)
  $label = $_.BaseName.Replace("_"," ")
  if ($tags -and $tags.PSObject.Properties[$path]) {
    $metadata = $tags.PSObject.Properties[$path].Value
    $itemTags += @($metadata.tags)
    if ($metadata.label) { $label = $metadata.label }
  }
  $item = [ordered]@{name=$_.Name;collection=$collection;category=$category;detail=$detail;label=$label;tags=@($itemTags | Where-Object { $_ } | Select-Object -Unique);path=$path}
  if (Test-Path -LiteralPath (Join-Path $projectRoot $thumb)) { $item.thumbnail = $thumb }
  if ($collection -in @("konular","sehirler")) { $publicItems += $item } else { $privateItems += $item }
}
# Kilitli koleksiyonların web kopyaları sunucuya özeldir; asıl fotoğraflara yazılmaz.
Add-Type -AssemblyName System.Drawing
foreach ($item in $privateItems) {
  $sourcePath = Join-Path $projectRoot $item.path
  $privatePath = Join-Path $projectRoot ($item.path.Replace("images/","private-web/"))
  [IO.Directory]::CreateDirectory((Split-Path -Parent $privatePath)) | Out-Null
  $sourceInfo = Get-Item -LiteralPath $sourcePath
  if ((Test-Path -LiteralPath $privatePath) -and (Get-Item -LiteralPath $privatePath).LastWriteTimeUtc -ge $sourceInfo.LastWriteTimeUtc) { continue }
  if ($sourceInfo.Extension.ToLowerInvariant() -in @(".jpg",".jpeg")) {
    $image = [Drawing.Image]::FromFile($sourcePath)
    try {
      $ratio = [Math]::Min(1.0,2000.0/[Math]::Max($image.Width,$image.Height))
      $bitmap = New-Object Drawing.Bitmap ([Math]::Max(1,[int]($image.Width*$ratio))),([Math]::Max(1,[int]($image.Height*$ratio)))
      try {
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        try { $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($image,0,0,$bitmap.Width,$bitmap.Height) } finally { $graphics.Dispose() }
        $bitmap.Save($privatePath,[Drawing.Imaging.ImageFormat]::Jpeg)
      } finally { $bitmap.Dispose() }
    } finally { $image.Dispose() }
  } else { [IO.File]::Copy($sourcePath,$privatePath,$true) }
  if ((Get-Item -LiteralPath $privatePath).Length -ge 4000000) { throw "Kilitli görsel web için fazla büyük: $privatePath. 4 MB altına küçültün." }
}
function Write-Gallery($filename,$variable,$items) {
  $json = ConvertTo-Json -InputObject @($items) -Depth 5
  $content = "// Klasör taramasından oluşturulur; fotoğraflar değiştirilmez.`nwindow.$variable = $json;`n"
  [IO.File]::WriteAllText((Join-Path $projectRoot $filename),$content,[Text.UTF8Encoding]::new($false))
}
Write-Gallery "gallery-data.js" "GALLERY_IMAGES" $publicItems
Write-Gallery "gallery-private-data.js" "PRIVATE_GALLERY_IMAGES" $privateItems
Write-Host "$($publicItems.Count) genel, $($privateItems.Count) bağlantıyla erişilen görsel güncellendi."
& node (Join-Path $PSScriptRoot "build-map-locations.cjs")
if ($LASTEXITCODE -ne 0) { throw "Harita konumları üretilemedi." }
