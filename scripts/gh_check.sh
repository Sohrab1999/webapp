#!/usr/bin/env bash
# GitHub auth + repository verification for the Papermorph English webapp project.
# Reads the bearer token from /home/z/.secrets/gh.header (0600).
# NEVER prints the token, the header file, or any Authorization data.
set -euo pipefail

H=/home/z/.secrets/gh.header

api() { curl -sS -H @"$H" -H 'Accept: application/vnd.github+json' "$@"; }

echo '=== GET /user (token identity) ==='
api https://api.github.com/user | python3 -c '
import json, sys
d = json.load(sys.stdin)
if "login" in d:
    print("login:", d["login"])
    print("type:", d.get("type"))
else:
    print("message:", d.get("message"))
'

echo
echo '=== GET /repos/sohrab1999/webapp (authenticated) ==='
api -w '\n__HTTP__%{http_code}' https://api.github.com/repos/sohrab1999/webapp | python3 -c '
import json, sys
raw = sys.stdin.read()
body, _, status = raw.rpartition("__HTTP__")
try:
    d = json.loads(body) if body.strip() else {}
except Exception:
    d = {}
st = status.strip()
if st == "200":
    print("full_name:      ", d.get("full_name"))
    print("private:        ", d.get("private"))
    print("default_branch: ", d.get("default_branch"))
    print("token perms:    ", d.get("permissions"))
else:
    print("NOT VISIBLE WITH THIS TOKEN | HTTP", st, "| message:", d.get("message"))
'

echo
echo '=== GET /repos/sohrab1999/webapp (unauthenticated) ==='
curl -sS -o /dev/null -w 'HTTP %{http_code} (200=public repo exists, 404=private or absent)\n' https://api.github.com/repos/sohrab1999/webapp

echo
echo '=== GET /users/sohrab1999 (owner account) ==='
curl -sS https://api.github.com/users/sohrab1999 | python3 -c '
import json, sys
d = json.load(sys.stdin)
print("login:", d.get("login"), "| type:", d.get("type"), "| public_repos:", d.get("public_repos"))
' 2>/dev/null || echo 'owner lookup failed'
