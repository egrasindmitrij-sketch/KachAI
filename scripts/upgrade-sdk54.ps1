# Принудительное обновление до Expo SDK 54
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Текущий expo в package.json:" -ForegroundColor Cyan
Select-String -Path "package.json" -Pattern '"expo"'

if (Test-Path "node_modules\expo\package.json") {
  $old = (Get-Content "node_modules\expo\package.json" | ConvertFrom-Json).version
  Write-Host "Установленный expo в node_modules: $old" -ForegroundColor Yellow
}

Write-Host "`n==> Очистка..." -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

Write-Host "==> npm install..." -ForegroundColor Cyan
npm install

Write-Host "==> expo@54 install --fix..." -ForegroundColor Cyan
npx expo@54 install --fix

$ver = node -e "console.log(require('expo/package.json').version)"
Write-Host "`nУстановлен expo: $ver" -ForegroundColor Green
if ($ver -notmatch "^54\.") {
  Write-Host "ОШИБКА: всё ещё не SDK 54. Пришли вывод npm install." -ForegroundColor Red
  exit 1
}

Write-Host "`nЗапуск: npm run start:clear" -ForegroundColor Green
