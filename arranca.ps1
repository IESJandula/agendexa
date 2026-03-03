$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$mysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'

function Test-PortInUse {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
        return $null -ne $conn
    } catch {
        return $false
    }
}

Write-Host '==> Verificando servicio MySQL local...'
$mysqlService = Get-Service -Name 'MySQL84' -ErrorAction SilentlyContinue
if ($null -ne $mysqlService -and $mysqlService.Status -ne 'Running') {
    Start-Service -Name 'MySQL84'
    Write-Host 'MySQL84 iniciado.'
} elseif ($null -eq $mysqlService) {
    Write-Host 'No se encontró servicio MySQL84. Se intentará continuar con el servidor ya disponible.'
} else {
    Write-Host 'MySQL84 ya está en ejecución.'
}

if (Test-Path $mysqlExe) {
    Write-Host '==> Creando base si no existe...'
    & $mysqlExe -uroot -p1234 -e "CREATE DATABASE IF NOT EXISTS booksy_mvp;"
} else {
    Write-Host "No se encontró mysql.exe en: $mysqlExe"
    Write-Host 'Sáltalo o ajusta la ruta dentro de arranca.ps1.'
}

Write-Host '==> Aplicando migraciones Prisma...'
Set-Location $backendPath
npm run -s prisma -- migrate deploy 2>$null
if ($LASTEXITCODE -ne 0) {
    npx prisma migrate deploy
}

if (-not (Test-PortInUse -Port 3000)) {
    Write-Host '==> Iniciando backend en nueva terminal...'
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$backendPath'; npm run dev"
    )
} else {
    Write-Host 'Backend ya está corriendo en puerto 3000.'
}

if (-not (Test-PortInUse -Port 5173)) {
    Write-Host '==> Iniciando frontend en nueva terminal...'
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$frontendPath'; npm run dev"
    )
} else {
    Write-Host 'Frontend ya está corriendo en puerto 5173.'
}

Write-Host ''
Write-Host 'Listo. URLs:'
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  Backend:  http://localhost:3000/health'
