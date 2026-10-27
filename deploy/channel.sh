#!/usr/bin/env bash
# The public channel's daily post: the new roles whose posting says the employer sponsors a visa. The pipeline
# writes it (apps/pipeline/src/channel.ts); this script sends it and then marks it sent, so a post that didn't get
# through is written again next time. The channel is TELEGRAM_CHANNEL in /srv/sponsored/.env (its @name), and the
# alerts' bot posts there as one of its admins.
set -euo pipefail
source "$(dirname "$0")/telegram.sh"
cd /srv/sponsored

token=$(value TELEGRAM_BOT_TOKEN)
channel=$(value TELEGRAM_CHANNEL)
if [ -z "$token" ] || [ -z "$channel" ]; then
  echo "no TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL in /srv/sponsored/.env: nothing posted"
  exit 0
fi
out=$(docker compose run --rm -T pipeline channel </dev/null)
if [ -z "$out" ]; then
  echo "no new roles that sponsor: nothing posted"
  exit 0
fi
id=${out%%$'\n'*}
code=$(send "$token" "$channel" "${out#*$'\n'}" HTML)
if [ "$code" != 200 ]; then
  echo "telegram refused post $id: HTTP $code" >&2
  exit 1
fi
docker compose run --rm -T pipeline channel-sent "$id" </dev/null
echo "posted $id to $channel"
