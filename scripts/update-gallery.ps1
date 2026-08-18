$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$imagesRoot = Join-Path $projectRoot "images"
$extensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")

$items = Get-ChildItem -LiteralPath $imagesRoot -Recurse -File |
  Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object FullName |
  ForEach-Object {
    # Windows PowerShell 5.1'de Path.GetRelativePath bulunmadığı için
    # images klasörünün tam yolunu dosya yolundan güvenli biçimde çıkarırız.
    $relative = $_.FullName.Substring($imagesRoot.Length).TrimStart("\").Replace("\", "/")
    $parts = $relative.Split("/")
    $category = if ($parts.Length -gt 1) { $parts[0] } else { "diger" }
    [ordered]@{
      name = $_.Name
      category = $category
      path = "images/$relative"
    }
  }

$json = @($items) | ConvertTo-Json -Depth 3
$content = "// Bu dosya scripts/update-gallery.ps1 tarafından otomatik oluşturulur.`nwindow.GALLERY_IMAGES = $json;`n"
$outputPath = Join-Path $projectRoot "gallery-data.js"
[System.IO.File]::WriteAllText($outputPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "$(@($items).Count) fotoğraf gallery-data.js dosyasına eklendi."
