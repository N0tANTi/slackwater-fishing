[CmdletBinding()]
param(
    [switch]$Demo,
    [switch]$PrepareOnly,
    [switch]$Rebuild,
    [string]$Blender
)
$ErrorActionPreference = 'Stop'
function Get-ProjectHash([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try {
        return [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
    } finally {
        $hasher.Dispose()
        $stream.Dispose()
    }
}
$root = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $root
try {
    $kit = Join-Path $root '.local'
    $engine = Join-Path $kit 'raea/bin/raea.exe'
    $package = 'raea-0.1.9-windows-x86_64.zip'
    $expected = '5d4d85da8e41c677e59a1e3fcf50189f9ef21b2be6c4727064bfb45b598cff67'
    [void](New-Item -ItemType Directory -Force -Path $kit)
    $lockFile = Join-Path $kit 'setup.lock'
    $deadline = [DateTime]::UtcNow.AddMinutes(15)
    do {
        try { $setupLock = [IO.File]::Open($lockFile, 'OpenOrCreate', 'ReadWrite', 'None') }
        catch [IO.IOException] {
            if ([DateTime]::UtcNow -gt $deadline) { throw 'Another setup process still holds the project lock.' }
            Start-Sleep -Milliseconds 400
        }
    } until ($setupLock)
    if (!(Test-Path -LiteralPath $engine)) {
        $zip = Join-Path $kit $package
        if (!(Test-Path -LiteralPath $zip) -or (Get-ProjectHash $zip) -ne $expected) {
            $part = Join-Path $kit ($package + '.part')
            & curl.exe -fLsS --retry 2 ('https://github.com/shinyobjectz/raea/releases/download/v0.1.9/' + $package) -o $part
            if ($LASTEXITCODE -ne 0) { throw 'Could not download RAEA 0.1.9.' }
            if ((Get-ProjectHash $part) -ne $expected) { throw 'RAEA checksum failed.' }
            Move-Item -Force -LiteralPath $part -Destination $zip
        }
        $stage = Join-Path $kit ('unpack-' + [guid]::NewGuid().ToString('N'))
        [void](New-Item -ItemType Directory -Path $stage)
        & tar.exe -xf $zip -C $stage
        if ($LASTEXITCODE -ne 0) { throw ('Could not unpack RAEA in ' + $stage) }
        $unpacked = (Resolve-Path -LiteralPath (Join-Path $stage 'raea')).Path
        $dest = [IO.Path]::GetFullPath((Join-Path $kit 'raea'))
        if ([IO.Path]::GetDirectoryName($unpacked) -ne $stage -or [IO.Path]::GetDirectoryName($dest) -ne $kit) {
            throw 'Unexpected runtime extraction path.'
        }
        if (Test-Path -LiteralPath $dest) { throw ('An incomplete runtime already exists at ' + $dest) }
        Move-Item -LiteralPath $unpacked -Destination $dest
        [IO.Directory]::Delete($stage)
    }
    $required = @('bed.glb','lagoon.glb','skiff.glb','oar.glb','carp.glb','perch.glb','koi.glb','minnow.glb','ray.glb','otter.glb','wave-normal.png',
                  'fisher-rest.glb','fisher-hold.glb','fisher-cast.glb','fisher-row.glb','bgm.wav','lake.wav','cast.wav','plop.wav','strike.wav','land.wav')
    $missing = $required | Where-Object { !(Test-Path -LiteralPath (Join-Path 'media' $_)) }
    $stamp = Join-Path $kit 'assets.revision'
    $inputs = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.py' | Sort-Object Name
    $revision = (($inputs | ForEach-Object { (Get-ProjectHash $_.FullName) }) -join ';')
    $built = if (Test-Path -LiteralPath $stamp) { (Get-Content -Raw -LiteralPath $stamp).Trim() } else { '' }
    if ($Rebuild -or $missing -or $built -ne $revision) {
        if (!$Blender) {
            $found = Get-Command blender.exe -ErrorAction SilentlyContinue
            if ($found) { $Blender = $found.Source } else {
                $install = Join-Path $env:ProgramFiles 'Blender Foundation'
                if (Test-Path -LiteralPath $install) {
                    $Blender = Get-ChildItem -LiteralPath $install -Directory | Sort-Object Name -Descending |
                        ForEach-Object { Join-Path $_.FullName 'blender.exe' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
                }
            }
        }
        if (!$Blender) { throw 'Install Blender 5.2 or pass -Blender C:\path\to\blender.exe to generate the models.' }
        Set-Content -LiteralPath $stamp -Value 'building' -Encoding ascii
        & $Blender --background --factory-startup --python-exit-code 1 --python tools/build_media.py
        if ($LASTEXITCODE -ne 0) { throw 'Blender asset generation failed.' }
        Set-Content -LiteralPath $stamp -Value $revision -Encoding ascii
    }
    Copy-Item -LiteralPath 'shaders/lagoon.wesl' -Destination 'media/lagoon.wesl' -Force
    $setupLock.Dispose()
    $setupLock = $null
    if (!$PrepareOnly) {
        $scene = if ($Demo) { 'demo.tsx' } else { 'game.tsx' }
        if ($Demo) { & $engine play $scene --seconds end } else { & $engine play $scene }
        if ($LASTEXITCODE -ne 0) { throw ('RAEA exited with code ' + $LASTEXITCODE) }
    }
} finally {
    if ($setupLock) { $setupLock.Dispose() }
    Pop-Location
}
