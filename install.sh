#!/usr/bin/env bash
#
# Установщик контент-фабрики IKIGAI PROMOTION для macOS и Linux.
#
#   bash install.sh                                   # проект — папка над комплектом
#   bash install.sh --project ~/Claude/content-factory
#   bash install.sh --force                           # перезаписать навыки нашими версиями
#   bash install.sh --deps                            # заодно поставить зависимости движка
#
# Ничего не перезаписывает молча. Навык с таким же именем пропускается, список
# пропущенного печатается в конце. Личные файлы (CLAUDE.md, .env, .mcp.json)
# создаются только когда их ещё нет, и не трогаются никогда — даже с --force.

set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT=""
FORCE=0
DEPS=0

while [ $# -gt 0 ]; do
  case "$1" in
    --project) PROJECT="${2:-}"; shift 2 ;;
    --project=*) PROJECT="${1#*=}"; shift ;;
    --force) FORCE=1; shift ;;
    --deps)  DEPS=1; shift ;;
    -h|--help) sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Неизвестный ключ: $1"; exit 1 ;;
  esac
done

C_OK=$'\033[32m'; C_SKIP=$'\033[90m'; C_WARN=$'\033[33m'; C_HEAD=$'\033[36m'; C_ERR=$'\033[31m'; C_OFF=$'\033[0m'
step() { printf '\n%s%s%s\n' "$C_HEAD" "$1" "$C_OFF"; }
ok()   { printf '  %s+ %s%s\n' "$C_OK" "$1" "$C_OFF"; }
skip() { printf '  %s= %s%s\n' "$C_SKIP" "$1" "$C_OFF"; }
warn() { printf '  %s! %s%s\n' "$C_WARN" "$1" "$C_OFF"; }
fail() { printf '\n%sОстановился: %s%s\n' "$C_ERR" "$1" "$C_OFF"; exit 1; }

# ── Проверка, что скрипт запущен из папки комплекта ───────────────────────────
SKILLS_SRC="$KIT/plugins/content-factory/skills"
[ -f "$KIT/engine/package.json" ] && [ -d "$SKILLS_SRC" ] || \
  fail "это не папка комплекта. Запускайте install.sh из той папки, где лежат engine/ и plugins/."

# ── Куда ставим ───────────────────────────────────────────────────────────────
[ -n "$PROJECT" ] || PROJECT="$(dirname "$KIT")"
mkdir -p "$PROJECT" || fail "не могу создать папку проекта $PROJECT"
PROJECT="$(cd "$PROJECT" && pwd)"

if [ "$PROJECT" = "$KIT" ]; then
  warn "проект и комплект — одна и та же папка. Так тоже можно, но при обновлении движка"
  warn "ваши настройки окажутся вперемешку с нашими файлами. Обычная раскладка: комплект"
  warn "в <проект>/factory, настройки — рядом с ним."
fi

echo
echo "Контент-фабрика IKIGAI PROMOTION"
echo "  комплект: $KIT"
echo "  проект:   $PROJECT"

CREATED=0
SKIPPED_LIST=""
SKIPPED=0

# ── Навыки ────────────────────────────────────────────────────────────────────
step "Навыки -> .claude/skills"
mkdir -p "$PROJECT/.claude/skills"

for dir in "$SKILLS_SRC"/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  dest="$PROJECT/.claude/skills/$name"
  if [ -e "$dest" ] && [ "$FORCE" -eq 0 ]; then
    skip "$name — уже стоит, не трогаю"
    SKIPPED=$((SKIPPED + 1)); SKIPPED_LIST="$SKIPPED_LIST${SKIPPED_LIST:+, }$name"
    continue
  fi
  rm -rf "$dest"
  cp -R "$dir" "$dest"
  ok "$name"
  CREATED=$((CREATED + 1))
done

# ── Личные файлы: создаём, только если их нет ─────────────────────────────────
step "Заготовки настроек"

copy_personal() {
  local from="$1" to="$2" what="$3"
  local name; name="$(basename "$to")"
  if [ ! -f "$from" ]; then warn "$name — нет заготовки $from, пропускаю"; return; fi
  if [ -e "$to" ]; then
    skip "$name — уже есть, ваш файл не трогаю"
    SKIPPED=$((SKIPPED + 1)); SKIPPED_LIST="$SKIPPED_LIST${SKIPPED_LIST:+, }$name"
    return
  fi
  cp "$from" "$to"
  ok "$what"
  CREATED=$((CREATED + 1))
}

copy_personal "$KIT/CLAUDE.md.template"  "$PROJECT/CLAUDE.md"  "CLAUDE.md — правила вашего бренда, Claude читает их в каждой сессии"
copy_personal "$KIT/.mcp.json.example"   "$PROJECT/.mcp.json"  ".mcp.json — подключение fal (ключ впишете сами)"
copy_personal "$KIT/engine/.env.example" "$KIT/engine/.env"    "engine/.env — ключи, остаются только на вашей машине"

# ── Что стоит на машине ───────────────────────────────────────────────────────
step "Что стоит на машине"

MISSING=""
check_tool() {
  local cmd="$1" arg="$2" need="$3" why="$4" v=""
  if command -v "$cmd" >/dev/null 2>&1; then
    v="$("$cmd" "$arg" 2>&1 | head -1 || true)"
    ok "$(printf '%-8s %s' "$cmd" "$v")"
  elif [ "$need" = "yes" ]; then
    warn "$(printf '%-8s НЕТ — %s' "$cmd" "$why")"
    MISSING="$MISSING${MISSING:+, }$cmd"
  else
    skip "$(printf '%-8s нет — %s' "$cmd" "$why")"
  fi
}

check_tool node   --version yes 'без него движок не запустится'
check_tool npm    --version yes 'ставит зависимости движка'
check_tool git    --version yes 'без него Claude Code не работает локально'
check_tool ffmpeg -version  yes 'нарезка и склейка видео'
check_tool yt-dlp --version no  'скачивание роликов-доноров, можно без него'

if command -v node >/dev/null 2>&1; then
  major="$(node --version | sed 's/^v\([0-9]*\).*/\1/')"
  [ "$major" -ge 20 ] 2>/dev/null || warn "нужен Node 20 или новее, у вас $(node --version)"
fi

# ── Зависимости движка ────────────────────────────────────────────────────────
if [ "$DEPS" -eq 1 ]; then
  step "Зависимости движка"
  if ! command -v npm >/dev/null 2>&1; then
    warn "npm не найден — пропускаю. Поставьте Node.js и запустите bash install.sh --deps ещё раз."
  else
    ( cd "$KIT/engine" && { [ -f package-lock.json ] && npm ci || npm install; } ) \
      && ok "поставлены" || warn "npm вернул ошибку — смотрите вывод выше"
  fi
fi

# ── Итог ──────────────────────────────────────────────────────────────────────
echo
echo "Готово."
echo "  разложено:  $CREATED"
echo "  пропущено:  $SKIPPED${SKIPPED_LIST:+ — $SKIPPED_LIST}"

if [ "$SKIPPED" -gt 0 ] && [ "$FORCE" -eq 0 ]; then
  echo
  echo "Пропущенное — это то, что у вас уже стоит. Чтобы перезаписать НАВЫКИ нашими версиями:"
  echo "  bash install.sh --force"
  echo "CLAUDE.md, .env и .mcp.json не перезаписываются никогда — это ваши файлы."
fi

if [ -n "$MISSING" ]; then
  echo
  warn "не хватает: $MISSING"
  echo "  Откройте проект во вкладке Code и попросите Claude: «доустанови то, чего не хватает»."
  echo "  Подробно — SETUP.md, шаг 2."
fi

echo
echo "Дальше:"
echo "  1. Впишите ключи в engine/.env — какие именно и зачем, написано внутри файла."
echo "  2. Заполните CLAUDE.md под свой бренд — Claude поможет, если попросить."
echo "  3. Откройте ПЕРВЫЙ-ЗАПУСК.md — три задачи на пятнадцать минут."
echo
