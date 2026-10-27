# Running the pipeline on a server

The pipeline runs on a small Linux server with Docker (Ubuntu 24.04, 4 vCPU, 8 GB, shared with other projects).
Everything lives in `/srv/sponsored`; nothing is published to the internet.

| What                                                                                                     | Where                                               |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Code (a copy of this repo)                                                                               | `/srv/sponsored/src`                                |
| Compose project `sponsored`: Postgres 18 (`db`, 768 MB cap) and the `pipeline` image (1 GB, 1.5 CPU cap) | `/srv/sponsored/compose.yml`                        |
| Database password, made once by the deploy                                                               | `/srv/sponsored/.env` (mode 600, never in git)      |
| Files the pipeline may read (seed lists)                                                                 | `/srv/sponsored/data`, mounted read-only at `/data` |

## Deploy

```sh
DEPLOY_HOST=<ssh alias> deploy/deploy.sh
```

It copies the code, builds the image, starts Postgres, applies migrations and installs the timers. Safe to run
again.

## Schedule (systemd timers, UTC)

| Timer                 | When                 | Runs                                                                                                                                           |
| --------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `sponsored-ingest`    | every 6 hours at :20 | `ingest`: reads the boards that are due                                                                                                        |
| `sponsored-registers` | daily 03:40          | `registers`: reloads the IND and UK registers, then matches companies                                                                          |
| `sponsored-discover`  | Sundays 01:10        | `discover`: finds new boards in Common Crawl                                                                                                   |
| `sponsored-backup`    | daily 02:50          | `deploy/backup.sh`: `pg_dump` to `/srv/sponsored/backups`, kept 7 days                                                                         |
| `sponsored-extract`   | daily 01:00          | `extract`: Claude Code (Opus) reads up to 1,500 new postings that mention visas; then `languages` (Sonnet), which languages each role requires |
| `sponsored-digest`    | daily 06:00          | `deploy/digest.sh`: the morning summary on Telegram                                                                                            |
| `sponsored-channel`   | daily 07:00          | `deploy/channel.sh`: the public channel's post of the new roles that sponsor a visa                                                            |

`Persistent=true` starts a run missed while the server was down as soon as it's back. systemd never starts a unit
that's still running, so runs can't overlap.

## The site

`web` in `compose.yml`: Nuxt's server (`apps/web/Dockerfile`), always running, reading the database as `site`, a
read-only user whose password `deploy.sh` generates into `.env` (`WEB_DB_PASSWORD`). The shared Caddy in `/srv/edge`
serves it at `visaproof.azamatos.com` from `deploy/caddy/sponsored.caddy`, which `deploy.sh` copies in only after
Caddy accepts the whole configuration with it. Cloudflare proxies the domain (DNS: an `A` record, proxied; SSL/TLS
mode Full (strict)); Caddy gets the certificate itself. Search engines may index the site since
2026-10-27: `NUXT_PUBLIC_INDEXABLE` in `compose.yml` (`INDEXABLE=false` in `.env` turns it off) sets the robots
header, the meta tags and robots.txt together (static files, such as icons and scripts, get no header either
way).

## Alerts

Three kinds of Telegram message to the owner (`deploy/alert.sh`, `deploy/digest.sh`, both through
`deploy/telegram.sh`); the public channel's post is the next section:

| Message                       | When                                                                     | Says                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 🚨 **`<unit>` failed**        | a unit fails (`OnFailure=` → `sponsored-alert@<unit>`)                   | the error line, what it means for the site, when it runs again; the log folded under a quote |
| ✅ **`<unit>` works again**   | the next success after a failure (`OnSuccess=` → `sponsored-recovered@`) | since when it had failed, and for how long                                                   |
| ✅ / ⚠️ **the daily summary** | 06:00 UTC                                                                | one section per part, each 🟢 fine, 🟡 worth knowing or 🔴 a problem; problems first         |

A failure leaves a mark in `/srv/sponsored/state/failing/`; the recovery message clears it, and the summary lists
the marks still there as "still failing". An ingest run fails, after saving everything, when half or more of a
board type's boards (10 or more read) failed in this read and the one before: one bad run is a 🟡 line in the
summary, since failed boards keep their roles. Runs in Workday's maintenance (Friday 23:00 to Saturday 11:00 US
Pacific time) skip its boards. The bot token and chat id go in `/srv/sponsored/.env`, set by the owner:

```sh
TELEGRAM_BOT_TOKEN=…   # from @BotFather
TELEGRAM_CHAT_ID=…     # your chat with the bot: send it a message, then open
                       # https://api.telegram.org/bot<token>/getUpdates and copy message.chat.id
```

Test with `systemctl start sponsored-alert@test.service`. Without the two values the alert is only logged.

The daily summary covers job boards, roles, extraction (and how many postings wait for it), registers, the server
(backup, disk) and alerts. No message at all means the server is down. Send one now with
`systemctl start sponsored-digest`.

## The public channel

Once a day (`sponsored-channel`, 07:00 UTC, after the nightly extraction) the pipeline writes a post of the roles
posted in the last week whose posting says the employer sponsors a visa or may, not posted before: ten at most, two
at most from one company, grouped by country, one line each (the title links to its page on the site; company and
city, pay, a local language it needs, ✈️ when it helps you move), then how many more new roles are at employers
that can sponsor, and the countries as hashtags (`apps/pipeline/src/channel.ts`). Its roles count as posted once it's written;
`deploy/channel.sh` sends it and marks it sent. If Telegram refuses it, the post is dropped and its roles go in the
next one; if Telegram doesn't answer, they stay posted rather than risk appearing twice. Either way the owner gets an
alert. No new role, no post. It reads the roles from the site's search, so the site must be up at 07:00. The alerts' bot
posts it, as an admin of the channel.

The channel is [@visaproof](https://t.me/visaproof) (2026-10-27). Set up by the owner:

1. Create a public channel in Telegram and give it a name, e.g. `@visaproof`.
2. Channel → Administrators → add the alerts' bot, with "Post messages".
3. In `/srv/sponsored/.env`: `TELEGRAM_CHANNEL=@visaproof` (the channel's name).

Without `TELEGRAM_CHANNEL` nothing is posted. Post now with `systemctl start sponsored-channel`; see what the next
post would say, without writing or sending it, with `docker compose run --rm -T pipeline channel --dry`.

## Everyday commands (on the server)

```sh
cd /srv/sponsored
systemctl list-timers 'sponsored-*'                       # next and last runs
journalctl -u sponsored-ingest -n 50                      # a run's output
docker compose run --rm pipeline report                   # the numbers
docker compose run --rm pipeline ingest ashby:someco      # read one board now
docker compose exec db psql -U sponsored                  # SQL
systemctl start sponsored-ingest                          # run now
```
