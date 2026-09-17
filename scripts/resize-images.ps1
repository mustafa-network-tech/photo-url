param([int]$MaxSize = 1600, [int]$Quality = 78, [int]$Limit = 0)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Join-Path (Split-Path -Parent $PSScriptRoot) 'images'
$files = @(Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object { $_.Extension.ToLowerInvariant() -in @('.jpg','.jpeg') })
if ($Limit -gt 0) { $files = @($files | Sort-Object Length -Descending | Select-Object -First $Limit) }
$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$parameters = [Drawing.Imaging.EncoderParameters]::new(1)
$parameters.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality,[long]$Quality)
$count = 0
try {
  foreach ($file in $files) {
    $temp = $file.FullName + '.resize-tmp'
    $image = [Drawing.Image]::FromFile($file.FullName)
    try {
      if ($image.PropertyIdList -contains 274) {
        $orientation = [BitConverter]::ToUInt16($image.GetPropertyItem(274).Value,0)
        $rotation = switch ($orientation) { 2 { 'RotateNoneFlipX' } 3 { 'Rotate180FlipNone' } 4 { 'Rotate180FlipX' } 5 { 'Rotate90FlipX' } 6 { 'Rotate90FlipNone' } 7 { 'Rotate270FlipX' } 8 { 'Rotate270FlipNone' } default { 'RotateNoneFlipNone' } }
        $image.RotateFlip([Drawing.RotateFlipType]::$rotation)
      }
      $ratio = [Math]::Min(1.0,$MaxSize / [double][Math]::Max($image.Width,$image.Height))
      $bitmap = [Drawing.Bitmap]::new([Math]::Max(1,[int]($image.Width*$ratio)),[Math]::Max(1,[int]($image.Height*$ratio)))
      try {
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        try {
          $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.DrawImage($image,0,0,$bitmap.Width,$bitmap.Height)
        } finally { $graphics.Dispose() }
        $bitmap.Save($temp,$codec,$parameters)
      } finally { $bitmap.Dispose() }
    } finally { $image.Dispose() }
    try {
      if ((Get-Item -LiteralPath $temp).Length -lt $file.Length) {
        if ($file.IsReadOnly) { $file.IsReadOnly = $false }
        [IO.File]::Copy($temp,$file.FullName,$true)
      }
    } finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp } }
    $count++
    if ($count % 100 -eq 0) { Write-Host "$count / $($files.Count)" }
  }
} finally { $parameters.Dispose() }
Write-Host "Completed: $count JPEG files."
