# Runs the release build as a development (loose) package, like a Start menu launch.
# `winapp run` (0.7.1) fails to register with 0x8007007B, so we use Windows' own cmdlets. Needs Developer Mode.
$ErrorActionPreference = "Stop"
$layout = "msix\AppX"
$manifest = "$layout\appxmanifest.xml"

# The running exe is locked, and single-instance would swallow the new launch.
Get-Process meetwise -ErrorAction SilentlyContinue | ForEach-Object { $_.Kill(); $_.WaitForExit() }

$installed = Get-AppxPackage SandeepMenon.meetwise
$manifestChanged = -not (Test-Path $manifest) -or
    (Get-FileHash Package.appxmanifest).Hash -ne (Get-FileHash $manifest).Hash

# A registered loose package runs straight from this folder, so new files need no re-registration.
New-Item -ItemType Directory -Force $layout | Out-Null
Copy-Item src-tauri\target\release\meetwise.exe $layout -Force
Copy-Item Assets $layout -Recurse -Force

# Windows reads the manifest only when registering, and in Developer Mode it won't re-register
# the same version. So a changed manifest means removing the package first, which deletes its saved zones.
if (-not $installed -or $manifestChanged) {
    if ($installed) { Remove-AppxPackage $installed.PackageFullName }
    Copy-Item Package.appxmanifest $manifest -Force
    Add-AppxPackage -Register $manifest
}

$package = Get-AppxPackage SandeepMenon.meetwise
Start-Process "shell:AppsFolder\$($package.PackageFamilyName)!meetwise"