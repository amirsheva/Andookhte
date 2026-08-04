<#
    Build deployment-ready output on your own machine.

    Why here and not on the server: the Iranian server has no NuGet access,
    and with 1GB RAM the compile step can get silently killed. Your machine
    has neither problem.

    Usage:
        .\publish.ps1 -ApiUrl "http://95.38.188.15:8080/api"

    Output goes into the deploy/ folder. Take that folder via FileZilla
    to the server, next to docker-compose.prebuilt.yml.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host "`n[1/3] Cleaning previous output" -ForegroundColor Cyan
$deploy = Join-Path $root 'deploy'
if (Test-Path $deploy) { Remove-Item $deploy -Recurse -Force }
New-Item -ItemType Directory -Path $deploy | Out-Null

Write-Host "[2/3] Building backend" -ForegroundColor Cyan
dotnet publish (Join-Path $root 'src\Andookhte.Api\Andookhte.Api.csproj') `
    -c Release `
    -o (Join-Path $deploy 'api') `
    /p:UseAppHost=false
if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }

Write-Host "[3/3] Building frontend with API URL $ApiUrl" -ForegroundColor Cyan
Push-Location (Join-Path $root 'andookhte-web')
try {
    # API URL gets baked into the bundle at build time, not at runtime
    $env:VITE_API_BASE_URL = $ApiUrl

    if (-not (Test-Path 'node_modules')) { npm ci }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
}
finally {
    Pop-Location
    Remove-Item Env:\VITE_API_BASE_URL -ErrorAction SilentlyContinue
}

Write-Host "`nDone." -ForegroundColor Green
Write-Host "Take these to the server:" -ForegroundColor Green
Write-Host "  deploy/api/                     backend output"
Write-Host "  andookhte-web/dist/             frontend output"
Write-Host "  andookhte-web/nginx.conf"
Write-Host "  andookhte-web/security-headers.conf"
Write-Host "  andookhte-web/Dockerfile.prebuilt"
Write-Host "  src/Andookhte.Api/Dockerfile.prebuilt"
Write-Host "  docker-compose.prebuilt.yml"
Write-Host "  .env                            (create from .env.example)"
