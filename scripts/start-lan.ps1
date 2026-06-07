# Запуск Expo по локальной сети (быстрее tunnel)
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "`n=== IP-адреса этого ПК (для Expo Go) ===" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object InterfaceAlias, IPAddress |
  Format-Table -AutoSize

Write-Host "Телефон и ПК должны быть в одной Wi-Fi сети." -ForegroundColor Yellow
Write-Host "Запуск Metro (LAN)...`n" -ForegroundColor Green

npx expo@54 start --lan -c
