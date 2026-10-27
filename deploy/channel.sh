#!/usr/bin/env bash
# The public channel's daily post: the new roles whose posting says the employer sponsors a visa. The pipeline
# writes it (apps/pipeline/src/channel.ts) and its roles count as posted from then on; this script sends it and
# marks it sent. When Telegram refuses it (4xx), nobody saw it: it's dropped and its roles go in the next post. When
# Telegram doesn't answer, it may have posted, so the roles stay posted rather than appear twice. The channel is
# TELEGRAM_CHANNEL in /srv/sponsored/.env (its @name), and the alerts' bot posts there as one of its admins.
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
code=$(send "$token" "$channel" "${out#*$'\n'}" HTML) || code=000
case $code in
  200) docker compose run --rm -T pipeline channel-sent "$id" </dev/null ;;
  4*)
    docker compose run --rm -T pipeline channel-drop "$id" </dev/null
    echo "Telegram refused post $id (HTTP $code): dropped, its roles go in the next post" >&2
    exit 1
    ;;
  *)
    echo "no clear answer from Telegram for post $id (HTTP $code): it may be up, so its roles count as posted" >&2
    exit 1
    ;;
esac
echo "posted $id to $channel"
