param (
    [string]$InputPath,
    [string]$OutputPath
)

Add-Type -AssemblyName System.Drawing

try {
    $img = [System.Drawing.Bitmap]::FromFile($InputPath)
    
    # Define pure white
    $white = [System.Drawing.Color]::White
    
    # Make white pixels transparent
    $img.MakeTransparent($white)
    
    $img.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Host "Success"
} catch {
    Write-Error $_
}
