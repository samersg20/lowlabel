#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_HEADER="${NEXTAUTH_COOKIE:-${1:-}}"

if [[ -z "${COOKIE_HEADER}" ]]; then
  cat <<'USAGE'
Uso:
  NEXTAUTH_COOKIE='next-auth.session-token=SEU_COOKIE' ./test-api.sh
ou
  ./test-api.sh 'next-auth.session-token=SEU_COOKIE'

Opcional:
  BASE_URL='http://localhost:3000' NEXTAUTH_COOKIE='...' ./test-api.sh
USAGE
  exit 1
fi

request() {
  local payload="$1"
  local body_file code
  body_file="$(mktemp)"
  code="$(curl -sS -o "$body_file" -w "%{http_code}" \
    -X POST "$BASE_URL/api/prints" \
    -H 'Content-Type: application/json' \
    -b "$COOKIE_HEADER" \
    --data "$payload")"
  printf '%s\n' "$code|$body_file"
}

cleanup_files=()
trap 'for f in "${cleanup_files[@]:-}"; do [[ -f "$f" ]] && rm -f "$f"; done' EXIT

echo "[1/4] Buscando itens para selecionar itemId/storageMethod válidos..."
items_file="$(mktemp)"
cleanup_files+=("$items_file")
items_code="$(curl -sS -o "$items_file" -w "%{http_code}" "$BASE_URL/api/items" -b "$COOKIE_HEADER")"

if [[ "$items_code" != "200" ]]; then
  echo "ERRO: GET /api/items retornou HTTP $items_code"
  cat "$items_file"
  exit 1
fi

selection="$(python3 - "$items_file" <<'PY'
import json,sys
path=sys.argv[1]
items=json.load(open(path))
for item in items:
    mapping=[
        ("RESFRIADO", item.get("chilledHours")),
        ("CONGELADO", item.get("frozenHours")),
        ("AMBIENTE", item.get("ambientHours")),
        ("QUENTE", item.get("hotHours")),
        ("DESCONGELANDO", item.get("thawingHours")),
    ]
    for method,h in mapping:
        if isinstance(h,int) and h>0:
            print(item["id"]+"|"+method)
            raise SystemExit(0)
print("")
PY
)"

if [[ -z "$selection" ]]; then
  echo "ERRO: nenhum item com shelf life válido encontrado. Cadastre um item em /items antes de rodar o teste."
  exit 1
fi

item_id="${selection%%|*}"
storage_method="${selection##*|}"
echo "Usando itemId=$item_id storageMethod=$storage_method"

test_invalid() {
  local label="$1"
  local qty_json="$2"
  local payload
  payload="{\"itemId\":\"$item_id\",\"storageMethod\":\"$storage_method\",\"quantity\":$qty_json}"
  local result code body
  result="$(request "$payload")"
  code="${result%%|*}"
  body="${result#*|}"
  cleanup_files+=("$body")
  if [[ "$code" == "400" ]]; then
    echo "PASS: quantity inválida ($label) -> HTTP 400"
  else
    echo "FAIL: quantity inválida ($label) -> HTTP $code (esperado 400)"
    cat "$body"
    exit 1
  fi
}

echo "[2/4] Validando quantidades inválidas..."
test_invalid '"abc"' '"abc"'
test_invalid '0' '0'
test_invalid '"" (vazia)' '""'

echo "[3/4] Validando quantidade válida..."
valid_payload="{\"itemId\":\"$item_id\",\"storageMethod\":\"$storage_method\",\"quantity\":1}"
valid_result="$(request "$valid_payload")"
valid_code="${valid_result%%|*}"
valid_body="${valid_result#*|}"
cleanup_files+=("$valid_body")

if [[ "$valid_code" == "200" ]]; then
  echo "PASS: quantity válida (1) -> HTTP 200"
else
  echo "FAIL: quantity válida (1) -> HTTP $valid_code (esperado 200)"
  cat "$valid_body"
  exit 1
fi

echo "[4/4] Testes concluídos com sucesso ✅"
