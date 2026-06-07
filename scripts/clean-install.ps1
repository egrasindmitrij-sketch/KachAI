# Очистка + установка KachAI (Expo SDK 54)
#   cd kachai
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\clean-install.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Удаляем node_modules, .expo, package-lock.json..." -ForegroundColor Cyan
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path ".expo") { Remove-Item -Recurse -Force ".expo" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

Write-Host "==> npm install..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "==> expo install --fix (SDK 54)..." -ForegroundColor Cyan
npx expo@54 install --fix
if ($LASTEXITCODE -ne 0) { throw "expo install --fix failed" }

npm run verify

Write-Host ""
Write-Host "Готово. Запуск:" -ForegroundColor Green
Write-Host "  npm run start:clear" -ForegroundColor Green
