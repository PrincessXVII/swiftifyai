#!/usr/bin/env bash
# Копирует нужные OTF из установщиков Apple в public/fonts/
# Смонтируйте DMG и найдите SF Pro Fonts.pkg / SF Compact Fonts.pkg
#
# Вручную:
#   SF_PRO_PKG=/path/to/SF\ Pro\ Fonts.pkg \
#   SF_COMPACT_PKG=/path/to/SF\ Compact\ Fonts.pkg \
#   ./scripts/sync-sf-fonts-from-pkg.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

resolve_pkg() {
  local filename="$1"
  local env_var="$2"
  local from_env
  from_env="$(printenv "$env_var" 2>/dev/null || true)"
  if [[ -n "$from_env" && -f "$from_env" ]]; then
    echo "$from_env"
    return 0
  fi
  local candidates=(
    "/Volumes/SFProFonts/${filename}"
    "/Volumes/SF Pro Fonts/${filename}"
    "/Volumes/SFCompactFonts/${filename}"
    "/Volumes/SF Compact Fonts/${filename}"
  )
  for p in "${candidates[@]}"; do
    [[ -f "$p" ]] && echo "$p" && return 0
  done
  local found
  found="$(find /Volumes -maxdepth 6 -name "$filename" -type f 2>/dev/null | head -1 || true)"
  [[ -n "$found" ]] && echo "$found" && return 0
  return 1
}

copy_pro() {
  local pkg_path="$1"
  local expand="$WORKDIR/sf-pro"
  echo "Распаковка: $pkg_path"
  pkgutil --expand-full "$pkg_path" "$expand"
  mkdir -p "$ROOT/public/fonts/sf-pro"
  while IFS= read -r -d '' f; do
    cp "$f" "$ROOT/public/fonts/sf-pro/"
  done < <(find "$expand" -type f \( \
    -name 'SF-Pro-Text-Regular.otf' -o -name 'SF-Pro-Text-Medium.otf' -o \
    -name 'SF-Pro-Text-Semibold.otf' -o -name 'SF-Pro-Text-Bold.otf' -o \
    -name 'SF-Pro-Display-Regular.otf' -o -name 'SF-Pro-Display-Semibold.otf' \
  \) -print0)
  echo "SF Pro → public/fonts/sf-pro/ ($(ls -1 "$ROOT/public/fonts/sf-pro" | wc -l | tr -d ' ') файлов)"
}

copy_compact() {
  local pkg_path="$1"
  local expand="$WORKDIR/sf-compact"
  echo "Распаковка: $pkg_path"
  pkgutil --expand-full "$pkg_path" "$expand"
  mkdir -p "$ROOT/public/fonts/sf-compact"
  while IFS= read -r -d '' f; do
    cp "$f" "$ROOT/public/fonts/sf-compact/"
  done < <(find "$expand" -type f \( \
    -name 'SF-Compact-Text-Regular.otf' -o -name 'SF-Compact-Text-Medium.otf' -o \
    -name 'SF-Compact-Text-Semibold.otf' -o -name 'SF-Compact-Text-Bold.otf' \
  \) -print0)
  echo "SF Compact → public/fonts/sf-compact/ ($(ls -1 "$ROOT/public/fonts/sf-compact" | wc -l | tr -d ' ') файлов)"
}

PRO_PKG=""
COMPACT_PKG=""
if PRO_PKG="$(resolve_pkg "SF Pro Fonts.pkg" SF_PRO_PKG)"; then :; else
  echo "Не найден SF Pro Fonts.pkg (смонтируйте образ или задайте SF_PRO_PKG=...)"
fi
if COMPACT_PKG="$(resolve_pkg "SF Compact Fonts.pkg" SF_COMPACT_PKG)"; then :; else
  echo "Не найден SF Compact Fonts.pkg (смонтируйте образ или задайте SF_COMPACT_PKG=...)"
fi

[[ -n "$PRO_PKG" ]] && copy_pro "$PRO_PKG"
[[ -n "$COMPACT_PKG" ]] && copy_compact "$COMPACT_PKG"

echo "Готово. Проверьте: npm run build"
