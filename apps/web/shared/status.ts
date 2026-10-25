// Is the data fresh? Each part of the pipeline, when it last ran, and whether that's on time, as the Status page
// and the notice on every page show it. Built from what the database records (server/api/status.get.ts).

export type Run = { finishedAt: string; stats: Record<string, number> } | null;
export type StatusRaw = {
  now: string;
  runs: { ingest: Run; registers: Run; extract: Run; discover: Run };
  failures: { reason: string; n: number }[];
  open: { roles: number; companies: number; countries: number; new24h: number };
  registers: { nl: number; uk: number; loadedAt: string | null; reviewed: number; listed: number };
  reading: { waiting: number; languagesChecked: number };
  boardsKnown: number;
};

export type State = "ok" | "late" | "stale" | "unknown";
export type Part = {
  key: string;
  name: string;
  state: State;
  label: string;
  rows: { k: string; v: string; mono?: boolean }[];
  note?: string;
};
export type Status = {
  checkedAt: string;
  tone: State;
  headline: string;
  notice: string | null;
  parts: Part[];
};

const HOUR = 3_600_000;
// How old each part may be: on time, then late, then stale.
const LIMITS = {
  ingest: [7, 13],
  registers: [26, 50],
  extract: [26, 50],
  discover: [8 * 24, 15 * 24],
} as const;
const LABEL: Record<State, string> = { ok: "On time", late: "Late", stale: "Stale", unknown: "Not run yet" };

const n = (x: number) => x.toLocaleString("en-US");
export const when = (iso: string) =>
  `${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}, ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
export const ago = (hours: number) =>
  hours < 1 ? "less than an hour" : hours < 2 ? "an hour" : `${String(Math.floor(hours))} hours`;

function stateOf(
  run: Run,
  [late, stale]: readonly [number, number],
  now: number,
): { state: State; hours: number } {
  if (!run) return { state: "unknown", hours: Infinity };
  const hours = (now - Date.parse(run.finishedAt)) / HOUR;
  return { state: hours < late ? "ok" : hours < stale ? "late" : "stale", hours };
}

// The next scheduled read: the ingest timer runs at 00:20, 06:20, 12:20 and 18:20 UTC.
export function nextRead(now: number): string {
  const d = new Date(now);
  for (let h = 0; h <= 24; h += 6) {
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, 20);
    if (t > now) return new Date(t).toISOString();
  }
  return new Date(now + 6 * HOUR).toISOString();
}

export function statusOf(raw: StatusRaw): Status {
  const now = Date.parse(raw.now);
  const boards = stateOf(raw.runs.ingest, LIMITS.ingest, now);
  const registers = stateOf(raw.runs.registers, LIMITS.registers, now);
  const reading = stateOf(raw.runs.extract, LIMITS.extract, now);
  const discover = stateOf(raw.runs.discover, LIMITS.discover, now);
  const ingest = raw.runs.ingest;

  const failed = ingest?.stats.failed ?? 0;
  const parts: Part[] = [
    {
      key: "boards",
      name: "Job boards",
      state: boards.state,
      label: LABEL[boards.state],
      rows: ingest
        ? [
            { k: "Last read", v: when(ingest.finishedAt), mono: true },
            { k: "Next", v: when(nextRead(now)), mono: true },
            { k: "Boards read", v: n(ingest.stats.boards ?? 0) },
            { k: "Failed", v: n(failed) },
          ]
        : [],
      note: failed
        ? `The failures, by what the boards answered: ${raw.failures.map((f) => `${f.reason} ${n(f.n)}`).join(", ")}. A board that fails keeps its roles open until it answers again.`
        : undefined,
    },
    {
      key: "roles",
      name: "Open roles",
      state: boards.state,
      label: LABEL[boards.state],
      rows: [
        { k: "Open now", v: n(raw.open.roles) },
        { k: "Companies", v: n(raw.open.companies) },
        { k: "Countries", v: n(raw.open.countries) },
        { k: "New in the last 24 hours", v: n(raw.open.new24h) },
      ],
    },
    {
      key: "registers",
      name: "Registers",
      state: registers.state,
      label: LABEL[registers.state],
      rows: [
        { k: "IND, Netherlands", v: `${n(raw.registers.nl)} sponsors` },
        { k: "Home Office, UK", v: `${n(raw.registers.uk)} sponsors` },
        ...(raw.registers.loadedAt ? [{ k: "Reloaded", v: when(raw.registers.loadedAt), mono: true }] : []),
      ],
      note: `Employers confirmed by hand so far: ${n(raw.registers.reviewed)}, of which ${n(raw.registers.listed)} are on a register. The biggest employers go first.`,
    },
    {
      key: "reading",
      name: "Reading the postings",
      state: reading.state,
      label: LABEL[reading.state],
      rows: [
        ...(raw.runs.extract ? [{ k: "Last run", v: when(raw.runs.extract.finishedAt), mono: true }] : []),
        { k: "Runs", v: "nightly, 01:00 UTC" },
        { k: "Waiting to be read", v: n(raw.reading.waiting) },
        { k: "Checked for languages", v: `${n(raw.reading.languagesChecked)} of ${n(raw.open.roles)}` },
      ],
      note: "Only postings that mention visas, permits or relocation are read for the visa answer. A quote not found word for word in the posting is dropped.",
    },
    {
      key: "discover",
      name: "Finding job boards",
      state: discover.state,
      label: LABEL[discover.state],
      rows: [
        ...(raw.runs.discover ? [{ k: "Last run", v: when(raw.runs.discover.finishedAt), mono: true }] : []),
        { k: "Runs", v: "weekly" },
        { k: "Boards known", v: n(raw.boardsKnown) },
      ],
      note: raw.runs.discover ? undefined : "Its first recorded run is due this week.",
    },
  ];

  // The headline speaks for the job boards first: they decide whether a role is still open.
  const behind = parts.filter((p) => p.key !== "roles" && (p.state === "late" || p.state === "stale"));
  let tone: State = "ok";
  let headline: string;
  let notice: string | null = null;
  if (boards.state === "unknown") {
    tone = "unknown";
    headline = "Not yet. The job boards haven't been read.";
  } else if (boards.state !== "ok") {
    tone = boards.state;
    headline = `Not quite. Job boards were last read ${ago(boards.hours)} ago; they should be read every 6 hours. Some roles may have closed since.`;
    if (boards.state === "stale")
      notice = `Job boards were last read ${ago(boards.hours)} ago. Some roles may have closed.`;
  } else if (behind.length) {
    tone = "late";
    headline = `Mostly. Late: ${behind.map((p) => p.name.toLowerCase()).join(" and ")}. Everything else is on time.`;
  } else headline = `Yes. Job boards were read ${ago(boards.hours)} ago; they are read every 6 hours.`;
  return { checkedAt: raw.now, tone, headline, notice, parts };
}
