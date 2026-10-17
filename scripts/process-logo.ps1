Add-Type -AssemblyName System.Drawing

$srcPath = "D:\Peppakuu\Our Project\aeggpepp-workspace\src\Aeggpepp_Logo.jpeg"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$origImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Original Image size: $($origImg.Width) x $($origImg.Height)"

function Create-Square-Icon {
    param (
        [System.Drawing.Image]$source,
        [int]$targetSize,
        [string]$outputPath,
        [string]$bgColorHex = "#09090b"
    )
    
    $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background color
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml($bgColorHex)
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $graphics.FillRectangle($brush, 0, 0, $targetSize, $targetSize)
    $brush.Dispose()

    # Scale and center
    $scale = [Math]::Min($targetSize / $source.Width, $targetSize / $source.Height)
    $destWidth = [int]($source.Width * $scale)
    $destHeight = [int]($source.Height * $scale)
    $destX = [int](($targetSize - $destWidth) / 2)
    $destY = [int](($targetSize - $destHeight) / 2)

    $graphics.DrawImage($source, $destX, $destY, $destWidth, $destHeight)
    $graphics.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $outputPath ($targetSize x $targetSize)"
}

function Create-Cropped-Square-Icon {
    param (
        [System.Drawing.Image]$source,
        [int]$targetSize,
        [string]$outputPath
    )
    
    $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Scale to cover (crop)
    $scale = [Math]::Max($targetSize / $source.Width, $targetSize / $source.Height)
    $destWidth = [int]($source.Width * $scale)
    $destHeight = [int]($source.Height * $scale)
    $destX = [int](($targetSize - $destWidth) / 2)
    $destY = [int](($targetSize - $destHeight) / 2)

    $graphics.DrawImage($source, $destX, $destY, $destWidth, $destHeight)
    $graphics.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created (Cover): $outputPath ($targetSize x $targetSize)"
}

# 1. Web Public Icons
Create-Cropped-Square-Icon -source $origImg -targetSize 512 -outputPath "D:\Peppakuu\Our Project\aeggpepp-workspace\public\logo.png"
Create-Cropped-Square-Icon -source $origImg -targetSize 192 -outputPath "D:\Peppakuu\Our Project\aeggpepp-workspace\public\icon.png"
Create-Cropped-Square-Icon -source $origImg -targetSize 180 -outputPath "D:\Peppakuu\Our Project\aeggpepp-workspace\public\apple-touch-icon.png"

# 2. Mobile Assets
Create-Cropped-Square-Icon -source $origImg -targetSize 1024 -outputPath "D:\Peppakuu\Our Project\aeggpepp-workspace\mobile\assets\icon.png"
Create-Square-Icon -source $origImg -targetSize 432 -outputPath "D:\Peppakuu\Our Project\aeggpepp-workspace\mobile\assets\android-icon-foreground.png" -bgColorHex "#09090b"
Create-Square-Icon -source $origImg -targetSize 1024 -outputPath "D:\Peppakuu\Our Project\aeggpepp-workspace\mobile\assets\splash-icon.png" -bgColorHex "#09090b"
Create-Cropped-Square-Icon -source $origImg -targetSize 48 -outputPath "D:\Peppakuu\Our Project\aeggpepp-workspace\mobile\assets\favicon.png"

$origImg.Dispose()
Write-Host "Logo processing complete!"
