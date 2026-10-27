#!/usr/bin/env bash
# The public channels' daily posts: the new roles whose posting says the employer sponsors a visa, in English to
# TELEGRAM_CHANNEL and in Russian to TELEGRAM_CHANNEL_RU (each an @name in /srv/sponsored/.env; the alerts' bot posts
# there as one of their admins). For each, the pipeline writes the post (apps/pipeline/src/channel.ts) and its roles
# count as posted from then on; this script sends it and marks it sent. When Telegram refuses it (4xx), nobody saw
# it: it's dropped and its roles go in the next post. When Telegram doesn't answer, it may have posted, so the roles
# stay posted rather than appear twice. One channel's trouble doesn't stop the other; either fails the unit.
set -euo pipefail
source "$(dirname "$0")/telegram.sh"
cd /srv/sponsored

token=$(value TELEGRAM_BOT_TOKEN)
if [ -z "$token" ]; then
  echo "no TELEGRAM_BOT_TOKEN in /srv/sponsored/.env: nothing posted"
  exit 0
fi

pipeline() { docker compose run --rm -T pipeline "$@" </dev/null; }

post() { # lang channel
  local out id code
  out=$(pipeline channel --lang "$1") || return 1
  if [ -z "$out" ]; then
    echo "$2: no new roles that sponsor, nothing posted"
    return 0
  fi
  id=${out%%$'\n'*}
  code=$(send "$token" "$2" "${out#*$'\n'}" HTML) || code=000
  case $code in
    200)
      pipeline channel-sent "$id" || return 1
      echo "posted $id to $2"
      ;;
    4*)
      if pipeline channel-drop "$id"; then
        echo "Telegram refused post $id for $2 (HTTP $code): dropped, its roles go in the next post" >&2
      else
        echo "Telegram refused post $id for $2 (HTTP $code), and dropping it failed: its roles stay counted as posted" >&2
      fi
      return 1
      ;;
    *)
      echo "no clear answer from Telegram for post $id to $2 (HTTP $code): it may be up, so its roles count as posted" >&2
      return 1
      ;;
  esac
}

failed=0
for pair in en:TELEGRAM_CHANNEL ru:TELEGRAM_CHANNEL_RU; do
  channel=$(value "${pair#*:}")
  if [ -z "$channel" ]; then
    echo "no ${pair#*:} in /srv/sponsored/.env: ${pair%%:*} not posted"
    continue
  fi
  post "${pair%%:*}" "$channel" || failed=1
done
exit $failed
