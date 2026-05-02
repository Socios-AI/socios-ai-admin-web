#!/usr/bin/env bash
# scripts/smoke-admin-ops-prod.sh
#
# Smoke E2E não-destrutivo do admin-web operacional contra prod.
# Valida que todas as páginas críticas respondem e que as tabelas
# do Plano M existem com row counts esperados.
#
# Não cria nem deleta dados em prod (read-only). Pra exercer
# write operations, use o /admin UI manual ou rode o smoke do
# socios-ai-identity (que faz tudo em transação rollback).
#
# Pré-requisitos:
#   - psql instalado
#   - SUPABASE_DB_URL exportado (postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres)
#     OU passar PGPASSWORD + flags abaixo
#   - ADMIN_BASE=https://admin.sociosai.com (default)
#
# Uso:
#   SUPABASE_DB_URL='postgresql://postgres:...@db.axyssxqttfnbtawanasf.supabase.co:5432/postgres' \
#     bash scripts/smoke-admin-ops-prod.sh
#
# Exit codes:
#   0 = todos os checks passaram
#   1 = algum check falhou (output indica qual)

set -uo pipefail

ADMIN_BASE="${ADMIN_BASE:-https://admin.sociosai.com}"
ID_BASE="${ID_BASE:-https://id.sociosai.com}"

red()    { printf "\033[0;31m%s\033[0m\n" "$*"; }
green()  { printf "\033[0;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[0;33m%s\033[0m\n" "$*"; }

FAIL=0
pass() { green "  PASS · $*"; }
fail() { red   "  FAIL · $*"; FAIL=$((FAIL+1)); }
note() { yellow "  NOTE · $*"; }

echo "═══════════════════════════════════════════════"
echo " Smoke admin-web operacional · $(date -u +%FT%TZ)"
echo "═══════════════════════════════════════════════"

# 1. Páginas admin-web respondem (sem auth deve retornar 302/200)
echo ""
echo "1. admin-web routes · HEAD checks (esperam 200, 302 ou 401 - não 5xx)"
for path in "/" "/users" "/orgs" "/apps" "/plans" "/partners" "/affiliates" "/audit"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${ADMIN_BASE}${path}")
  if [[ "$code" =~ ^(200|302|303|307|401|403)$ ]]; then
    pass "${path} → ${code}"
  else
    fail "${path} → ${code} (esperado 2xx/3xx/401/403)"
  fi
done

# 2. identity-web routes públicas
echo ""
echo "2. identity-web public routes"
for path in "/login" "/reset" "/set-password" "/affiliate-activate"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${ID_BASE}${path}" 2>&1 || echo "000")
  if [[ "$code" =~ ^(200|302|303)$ ]]; then
    pass "${path} → ${code}"
  else
    fail "${path} → ${code}"
  fi
done

# 3. Database state (precisa SUPABASE_DB_URL)
if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo ""
  note "SUPABASE_DB_URL não setado · pulando checks de schema"
  note "Pra rodar full: export SUPABASE_DB_URL='postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres'"
else
  echo ""
  echo "3. Schema state (Plano M tables exist + row counts saudáveis)"

  # check_count compara $result vs $expected (formato bash arithmetic: ">=N", "==N", ">N").
  check_count() {
    local label="$1"
    local query="$2"
    local expected="$3"
    local result
    result=$(psql "$SUPABASE_DB_URL" -t -A -c "$query" 2>&1 | tr -d ' ')
    if [[ "$result" =~ ^[0-9]+$ ]]; then
      if eval "(( $result $expected ))"; then
        pass "${label}: ${result} (${expected})"
      else
        fail "${label}: ${result} (esperado: ${expected})"
      fi
    else
      fail "${label}: query falhou · $result"
    fi
  }

  check_count "platform_actors active owner count" \
    "select count(*) from public.platform_actors where tier='owner' and valid_to is null" \
    ">= 1"

  check_count "apps platform exists" \
    "select count(*) from public.apps where slug='platform'" \
    "== 1"

  check_count "partners por tier (licensee + reseller)" \
    "select count(*) from public.partners" \
    ">= 0"

  check_count "affiliate_invitations table exists" \
    "select count(*) from information_schema.tables where table_schema='public' and table_name='affiliate_invitations'" \
    "== 1"

  check_count "affiliate_profiles table exists" \
    "select count(*) from information_schema.tables where table_schema='public' and table_name='affiliate_profiles'" \
    "== 1"

  check_count "subscriptions with M.6 columns (attributed_to_user_id)" \
    "select count(*) from information_schema.columns where table_schema='public' and table_name='subscriptions' and column_name='attributed_to_user_id'" \
    "== 1"

  check_count "RPCs M.2 + M.3 + M.6 todas existem" \
    "select count(*) from pg_proc where proname in ('promote_to_owner','promote_to_admin','demote_owner','demote_admin','create_org','org_admin_invite','create_passive_affiliate','accept_affiliate_invitation','request_affiliate_activation','snapshot_attribution_for_checkout')" \
    "== 10"

  check_count "Hook custom_access_token_hook lê platform_actors (cleanup #1)" \
    "select count(*) from pg_proc where proname='custom_access_token_hook' and prosrc like '%platform_actors%'" \
    "== 1"
fi

echo ""
echo "═══════════════════════════════════════════════"
if [[ $FAIL -eq 0 ]]; then
  green " Todos os checks passaram ✓"
  echo "═══════════════════════════════════════════════"
  exit 0
else
  red " ${FAIL} check(s) falharam"
  echo "═══════════════════════════════════════════════"
  exit 1
fi
