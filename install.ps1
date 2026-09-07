#Requires -Version 5.1
<#
.SYNOPSIS
    Установщик контент-фабрики IKIGAI PROMOTION для Windows.

.DESCRIPTION
    Раскладывает комплект по местам рабочей папки: навыки — в .claude\skills,
    заготовки настроек — в корень, ключи — рядом с движком.

    Ничего не перезаписывает молча. Навык с таким же именем пропускается, список
    пропущенного печатается в конце. Ваши личные файлы (CLAUDE.md, .env, .mcp.json)
    создаются только когда их ещё нет, и не трогаются никогда — даже с -Force.

.PARAMETER Project
    Ваша рабочая папка. По умолчанию — папка НАД комплектом: после клонирования
    движок лежит в <проект>\factory, значит проект — это её родитель.

.PARAMETER Force
    Перезаписать навыки, которые уже стоят. На CLAUDE.md, .env и .mcp.json не влияет.

.PARAMETER Deps
    Заодно поставить зависимости движка (npm ci). Нужен интернет и пара минут.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1 -Project C:\Claude\content-factory
#>
[CmdletBinding()]
param(
    [string]$Project,
    [switch]$Force,
    [switch]$Deps
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Kit = $PSScriptRoot

function Write-Step { param([string]$Text) Write-Host "`n$Text" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "  + $Text" -ForegroundColor Green }
function Write-Skip { param([string]$Text) Write-Host "  = $Text" -ForegroundColor DarkGray }
function Write-Warn { param([string]$Text) Write-Host "  ! $Text" -ForegroundColor Yellow }
function Fail       { param([string]$Text) Write-Host "`nОстановился: $Text" -ForegroundColor Red; exit 1 }

# ── Проверка, что скрипт запущен из папки комплекта ───────────────────────────
$skillsSource = Join-Path $Kit 'plugins\content-factory\skills'
if (-not (Test-Path (Join-Path $Kit 'engine\package.json')) -or -not (Test-Path $skillsSource)) {
    Fail "это не папка комплекта. Запускайте install.ps1 из той папки, где лежат engine\ и plugins\."
}

# ── Куда ставим ───────────────────────────────────────────────────────────────
if (-not $Project) { $Project = Split-Path -Parent $Kit }
if (-not (Test-Path $Project)) {
    try { New-Item -ItemType Directory -Path $Project -Force | Out-Null }
    catch { Fail "не могу создать папку проекта $Project" }
}
$Project = (Resolve-Path $Project).Path

if ($Project -eq $Kit) {
    Write-Warn "проект и комплект — одна и та же папка. Так тоже можно, но при обновлении движка"
    Write-Warn "ваши настройки окажутся вперемешку с нашими файлами. Обычная раскладка: комплект"
    Write-Warn "в <проект>\factory, настройки — рядом с ним."
}

Write-Host ""
Write-Host "Контент-фабрика IKIGAI PROMOTION" -ForegroundColor White
Write-Host "  комплект: $Kit"
Write-Host "  проект:   $Project"

$created = New-Object System.Collections.ArrayList
$skipped = New-Object System.Collections.ArrayList

# ── Навыки ────────────────────────────────────────────────────────────────────
Write-Step "Навыки -> .claude\skills"
$skillsTarget = Join-Path $Project '.claude\skills'
New-Item -ItemType Directory -Path $skillsTarget -Force | Out-Null

foreach ($skill in Get-ChildItem -Path $skillsSource -Directory | Sort-Object Name) {
    $dest = Join-Path $skillsTarget $skill.Name
    if ((Test-Path $dest) -and -not $Force) {
        Write-Skip "$($skill.Name) — уже стоит, не трогаю"
        [void]$skipped.Add($skill.Name)
        continue
    }
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Copy-Item $skill.FullName $dest -Recurse -Force
    Write-Ok $skill.Name
    [void]$created.Add($skill.Name)
}

# ── Личные файлы: создаём, только если их нет ─────────────────────────────────
Write-Step "Заготовки настроек"

$personal = @(
    @{ From = Join-Path $Kit 'CLAUDE.md.template';   To = Join-Path $Project 'CLAUDE.md';        What = 'CLAUDE.md — правила вашего бренда, Claude читает их в каждой сессии' },
    @{ From = Join-Path $Kit '.mcp.json.example';    To = Join-Path $Project '.mcp.json';        What = '.mcp.json — подключение fal (ключ впишете сами)' },
    @{ From = Join-Path $Kit 'engine\.env.example';  To = Join-Path $Kit 'engine\.env';          What = 'engine\.env — ключи, остаются только на вашей машине' }
)

foreach ($f in $personal) {
    $name = Split-Path $f.To -Leaf
    if (-not (Test-Path $f.From)) { Write-Warn "$name — нет заготовки $($f.From), пропускаю"; continue }
    if (Test-Path $f.To) {
        Write-Skip "$name — уже есть, ваш файл не трогаю"
        [void]$skipped.Add($name)
        continue
    }
    Copy-Item $f.From $f.To -Force
    Write-Ok $f.What
    [void]$created.Add($name)
}

# ── Что стоит на машине ───────────────────────────────────────────────────────
Write-Step "Что стоит на машине"

function Get-ToolVersion {
    param([string]$Command, [string]$VersionArg)
    $exe = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $exe) { return $null }
    try {
        $raw = & $Command $VersionArg 2>&1 | Select-Object -First 1
        return ($raw | Out-String).Trim()
    } catch { return 'есть' }
}

$tools = @(
    @{ Name = 'node';   Arg = '--version'; Need = $true;  Why = 'без него движок не запустится' },
    @{ Name = 'npm';    Arg = '--version'; Need = $true;  Why = 'ставит зависимости движка' },
    @{ Name = 'git';    Arg = '--version'; Need = $true;  Why = 'без него Claude Code не работает локально' },
    @{ Name = 'ffmpeg'; Arg = '-version';  Need = $true;  Why = 'нарезка и склейка видео' },
    @{ Name = 'yt-dlp'; Arg = '--version'; Need = $false; Why = 'скачивание роликов-доноров, можно без него' }
)

$missing = New-Object System.Collections.ArrayList
foreach ($t in $tools) {
    $v = Get-ToolVersion -Command $t.Name -VersionArg $t.Arg
    if ($v) {
        Write-Ok ("{0,-8} {1}" -f $t.Name, $v)
    } elseif ($t.Need) {
        Write-Warn ("{0,-8} НЕТ — {1}" -f $t.Name, $t.Why)
        [void]$missing.Add($t.Name)
    } else {
        Write-Skip ("{0,-8} нет — {1}" -f $t.Name, $t.Why)
    }
}

$nodeRaw = Get-ToolVersion -Command 'node' -VersionArg '--version'
if ($nodeRaw -and ($nodeRaw -match 'v(\d+)')) {
    if ([int]$Matches[1] -lt 20) { Write-Warn "нужен Node 20 или новее, у вас $nodeRaw" }
}

# ── Зависимости движка ────────────────────────────────────────────────────────
if ($Deps) {
    Write-Step "Зависимости движка"
    if ($missing -contains 'npm') {
        Write-Warn "npm не найден — пропускаю. Поставьте Node.js и запустите install.ps1 -Deps ещё раз."
    } else {
        Push-Location (Join-Path $Kit 'engine')
        try {
            if (Test-Path 'package-lock.json') { npm ci } else { npm install }
            if ($LASTEXITCODE -eq 0) { Write-Ok "поставлены" } else { Write-Warn "npm вернул ошибку — смотрите вывод выше" }
        } finally { Pop-Location }
    }
}

# ── Итог ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Готово." -ForegroundColor White
Write-Host "  разложено:  $($created.Count)"
Write-Host "  пропущено:  $($skipped.Count)$(if ($skipped.Count) { ' — ' + ($skipped -join ', ') })"

if ($skipped.Count -and -not $Force) {
    Write-Host ""
    Write-Host "Пропущенное — это то, что у вас уже стоит. Чтобы перезаписать НАВЫКИ нашими версиями:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\install.ps1 -Force"
    Write-Host "CLAUDE.md, .env и .mcp.json не перезаписываются никогда — это ваши файлы."
}

if ($missing.Count) {
    Write-Host ""
    Write-Warn "не хватает: $($missing -join ', ')"
    Write-Host "  Откройте проект во вкладке Code и попросите Claude: «доустанови то, чего не хватает»."
    Write-Host "  Подробно — SETUP.md, шаг 2."
}

Write-Host ""
Write-Host "Дальше:" -ForegroundColor White
Write-Host "  1. Впишите ключи в engine\.env — какие именно и зачем, написано внутри файла."
Write-Host "  2. Заполните CLAUDE.md под свой бренд — Claude поможет, если попросить."
Write-Host "  3. Откройте ПЕРВЫЙ-ЗАПУСК.md — три задачи на пятнадцать минут."
Write-Host ""
