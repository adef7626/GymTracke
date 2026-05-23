# ==========================================================================
# DHRUVISH ADRENALINE - PWA ICON GENERATOR
# Uses native .NET System.Drawing in PowerShell to produce premium PNG icons
# ==========================================================================

Add-Type -AssemblyName System.Drawing

$targetDir = "C:\Users\PC\.gemini\antigravity\scratch\dhruvish-adrenaline\icons"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

function Generate-Icon ($size, $fileName) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Enable high-quality rendering
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # 1. Background Gradient (Cyber Dark Theme)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
        $rect,
        [System.Drawing.Color]::FromArgb(255, 3, 4, 12),
        [System.Drawing.Color]::FromArgb(255, 21, 27, 54),
        45.0
    )
    $g.FillRectangle($brushBg, $rect)

    # 2. Glowing Outer Circle
    $margin = $size * 0.08
    $circleSize = $size - ($margin * 2)
    $circlePen = New-Object System.Drawing.Pen (
        [System.Drawing.Color]::FromArgb(180, 255, 140, 26),
        ($size * 0.025)
    )
    $g.DrawEllipse($circlePen, $margin, $margin, $circleSize, $circleSize)

    # 3. Inner Design - Glowing Adrenaline Dumbbell & Lightning Bolt
    # Center coordinates
    $cx = $size / 2
    $cy = $size / 2

    # Draw dumbbell shafts & plates
    $plateWidth = $size * 0.07
    $plateHeight = $size * 0.4
    $barLength = $size * 0.5
    $barHeight = $size * 0.06

    $orangeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 140, 26))
    $cyanBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 229, 255))
    
    # Rotate slightly for dynamic athletic look
    $g.TranslateTransform($cx, $cy)
    $g.RotateTransform(-25)

    # Draw bar
    $g.FillRectangle(
        $orangeBrush,
        -$barLength/2,
        -$barHeight/2,
        $barLength,
        $barHeight
    )

    # Draw left plates (stacked)
    $g.FillRectangle($cyanBrush, -$barLength/2 - $plateWidth, -$plateHeight/2, $plateWidth, $plateHeight)
    $g.FillRectangle($orangeBrush, -$barLength/2 - ($plateWidth * 2) - ($size*0.01), -($plateHeight*0.8)/2, $plateWidth, ($plateHeight*0.8))

    # Draw right plates (stacked)
    $g.FillRectangle($cyanBrush, $barLength/2, -$plateHeight/2, $plateWidth, $plateHeight)
    $g.FillRectangle($orangeBrush, $barLength/2 + $plateWidth + ($size*0.01), -($plateHeight*0.8)/2, $plateWidth, ($plateHeight*0.8))

    # Draw central "A" (Adrenaline Symbol)
    $g.ResetTransform()
    
    # Draw lightning bolt over the center
    # Set coordinates for lightning polygon
    $scale = $size / 512
    $points = @(
        (New-Object System.Drawing.PointF ($cx + 10*$scale), ($cy - 90*$scale)),
        (New-Object System.Drawing.PointF ($cx - 50*$scale), ($cy + 10*$scale)),
        (New-Object System.Drawing.PointF ($cx - 10*$scale), ($cy + 10*$scale)),
        (New-Object System.Drawing.PointF ($cx - 20*$scale), ($cy + 90*$scale)),
        (New-Object System.Drawing.PointF ($cx + 40*$scale), ($cy - 10*$scale)),
        (New-Object System.Drawing.PointF ($cx + 0*$scale), ($cy - 10*$scale))
    )
    
    # Draw central glowing bolt
    $boltBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillPolygon($boltBrush, $points)

    # Save output
    $outputPath = Join-Path $targetDir $fileName
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Dispose resources
    $boltBrush.Dispose()
    $cyanBrush.Dispose()
    $orangeBrush.Dispose()
    $circlePen.Dispose()
    $brushBg.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "Generated $fileName successfully!"
}

# Generate 192px and 512px launcher assets
Generate-Icon 192 "icon-192.png"
Generate-Icon 512 "icon-512.png"
