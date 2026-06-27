Add-Type -AssemblyName System.Drawing

function New-QuestNoteIcon {
    param([string]$Path, [int]$Size)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(26, 26, 46))

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(79, 70, 229),
        [System.Drawing.Color]::FromArgb(124, 58, 237),
        45.0
    )

    $margin = [int]($Size * 0.1)
    $diameter = [int]($Size * 0.8)
    $g.FillEllipse($brush, $margin, $margin, $diameter, $diameter)

    $fontSize = [single]($Size * 0.35)
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString('Q', $font, [System.Drawing.Brushes]::White, $textRect, $sf)

    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $brush.Dispose()
    $font.Dispose()
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
New-QuestNoteIcon -Path (Join-Path $root 'assets\icons\icon-192.png') -Size 192
New-QuestNoteIcon -Path (Join-Path $root 'assets\icons\icon-512.png') -Size 512
Write-Host 'Icons created successfully'
