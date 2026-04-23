#!/usr/bin/env bash
set -euo pipefail

ADMIN_URL="${ADMIN_URL:-https://admin.sociosai.com}"
SUPABASE_URL="${SUPABASE_URL:-https://axyssxqttfnbtawanasf.supabase.co}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY must be set}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY must be set}"

json_field() {
  python3 -c 'import sys, json; print(json.load(sys.stdin).get("'"$1"'", ""))'
}

EMAIL="smoke-admin-gate-$(date +%s)@metamorph-ai.com"
PASSWORD="SmokeGate1!$(date +%s)"
USER_ID=""

cleanup() {
  if [ -n "$USER_ID" ]; then
    echo "  [cleanup] delete user $USER_ID"
    curl -sS -X DELETE "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > /dev/null || true
  fi
}
trap cleanup EXIT

echo "==> smoke: admin gate"

echo "  1. unauthenticated request to admin.sociosai.com redirects to id login"
LOC=$(curl -sS -o /dev/null -w "%{redirect_url}" "$ADMIN_URL/users")
if ! echo "$LOC" | grep -q "id.sociosai.com/login"; then
  echo "FAIL: expected redirect to id login, got $LOC"; exit 1
fi
echo "     redirect OK -> $LOC"

echo "  2. non-super-admin user sees 403"
USER_ID=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" | json_field id)
[ -n "$USER_ID" ] || { echo "FAIL: create user"; exit 1; }

LOGIN_RESP=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
ACCESS_TOKEN=$(echo "$LOGIN_RESP" | json_field access_token)
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | json_field refresh_token)
[ -n "$ACCESS_TOKEN" ] || { echo "FAIL: no access_token"; exit 1; }

# Cookie is JSON-stringified array (the @supabase/ssr format)
COOKIE_VALUE='['"\""$ACCESS_TOKEN"\"', '"\""$REFRESH_TOKEN"\"']'
COOKIE_HEADER="sb-axyssxqttfnbtawanasf-auth-token=$(python3 -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read()))' <<< "$COOKIE_VALUE")"

# Follow rewrite to /_403
BODY=$(curl -sS -L -H "Cookie: $COOKIE_HEADER" "$ADMIN_URL/users")
if ! echo "$BODY" | grep -q "Acesso negado"; then
  echo "FAIL: non-super-admin should see 403 page"; exit 1
fi
echo "     403 OK"

echo "  3. promote user, expect /users to load (200)"
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/promote_to_super_admin" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_user_id\":\"$USER_ID\",\"p_reason\":\"smoke gate test\",\"p_actor_id\":null}" > /dev/null

# Re-login to get fresh JWT with super_admin claim
LOGIN_RESP2=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
ACCESS_TOKEN2=$(echo "$LOGIN_RESP2" | json_field access_token)
REFRESH_TOKEN2=$(echo "$LOGIN_RESP2" | json_field refresh_token)

COOKIE_VALUE2='['"\""$ACCESS_TOKEN2"\"', '"\""$REFRESH_TOKEN2"\"']'
COOKIE_HEADER2="sb-axyssxqttfnbtawanasf-auth-token=$(python3 -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read()))' <<< "$COOKIE_VALUE2")"

CODE=$(curl -sS -o /dev/null -w "%{http_code}" -H "Cookie: $COOKIE_HEADER2" "$ADMIN_URL/users")
[ "$CODE" = "200" ] || { echo "FAIL: super-admin /users returned $CODE"; exit 1; }
echo "     /users 200 OK"

# Demote so the orphan doesn't accumulate (then user gets deleted in trap)
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/demote_from_super_admin" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_user_id\":\"$USER_ID\",\"p_reason\":\"smoke cleanup\",\"p_actor_id\":null}" > /dev/null || true

echo "==> smoke admin-gate: PASS"
