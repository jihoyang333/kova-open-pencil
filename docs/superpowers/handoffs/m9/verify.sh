#!/usr/bin/env bash

PLAN="/Users/jihoyang/kova-main/docs/superpowers/plans/2026-04-18-m9-shopify.md"
H="/Users/jihoyang/kova-main/kova-open-pencil-1/docs/superpowers/handoffs/m9"

check_chunk() {
  local chunk="$1" start="$2" end="$3"
  local file
  file=$(ls "$H/${chunk}-"*.md | head -1)
  local result
  result=$(diff \
    <(sed -n "${start},${end}p" "$PLAN") \
    <(sed -n '/<!-- BODY START/,/<!-- BODY END/p' "$file" | grep -v '<!-- BODY'))
  if [ -z "$result" ]; then
    echo "Chunk $chunk: CLEAN"
  else
    echo "Chunk $chunk: DIFF FOUND"
    echo "$result"
  fi
}

check_chunk "01" 1592 1631
check_chunk "02" 1633 1771
check_chunk "03" 1772 1941
check_chunk "04" 1943 1970
check_chunk "05" 1972 2208
check_chunk "06" 2209 2251
check_chunk "07" 2253 2480
check_chunk "08" 2482 2579
check_chunk "09" 2581 2638
check_chunk "10" 2640 2752
check_chunk "11" 2754 2864
