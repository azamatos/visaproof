import { describe, expect, it } from "vitest";
import { nextRead, statusOf, type StatusRaw } from "../shared/status";

const raw = (hoursAgo: { ingest?: number; registers?: number; extract?: number } = {}): StatusRaw => {
  const now = Date.parse("2026-10-25T15:00:00Z");
  const at = (h: number | undefined, fallback: number) =>
    new Date(now - (h ?? fallback) * 3_600_000).toISOString();
  return {
    now: new Date(now).toISOString(),
    runs: {
      ingest: { finishedAt: at(hoursAgo.ingest, 3), stats: { boards: 2915, failed: 8 } },
      extract: { finishedAt: at(hoursAgo.extract, 14), stats: {} },
      discover: null,
    },
    failures: [
      { reason: "blocks us (401 or 403)", n: 5 },
      { reason: "not a job board", n: 3 },
    ],
    open: { roles: 15216, companies: 2553, countries: 31, new24h: 240 },
    registers: { nl: 13024, uk: 122368, loadedAt: at(hoursAgo.registers, 8), reviewed: 200, listed: 142 },
    reading: { waiting: 120, languagesChecked: 9000 },
    boardsKnown: 16098,
  };
};

describe("status", () => {
  it("says yes when every part ran on time", () => {
    const s = statusOf(raw());
    expect(s.tone).toBe("ok");
    expect(s.headline).toBe("Yes. Job boards were read 3 hours ago; they are read every 6 hours.");
    expect(s.notice).toBeNull();
    expect(s.parts.find((p) => p.key === "boards")?.note).toContain("blocks us (401 or 403) 5");
    expect(s.parts.find((p) => p.key === "discover")?.label).toBe("Not run yet");
  });
  it("is late after 7 hours, and shows a notice everywhere after 13", () => {
    expect(statusOf(raw({ ingest: 9 })).tone).toBe("late");
    expect(statusOf(raw({ ingest: 9 })).notice).toBeNull();
    const stale = statusOf(raw({ ingest: 14 }));
    expect(stale.tone).toBe("stale");
    expect(stale.headline).toMatch(/^Not quite. Job boards were last read 14 hours ago/);
    expect(stale.notice).toBe("Job boards were last read 14 hours ago. Some roles may have closed.");
  });
  it("names the part that is late when the boards are fine", () => {
    expect(statusOf(raw({ registers: 30 })).headline).toBe(
      "Mostly. Late: registers. Everything else is on time.",
    );
  });
  it("knows the next scheduled read", () => {
    expect(nextRead(Date.parse("2026-10-25T15:00:00Z"))).toBe("2026-10-25T18:20:00.000Z");
    expect(nextRead(Date.parse("2026-10-25T23:00:00Z"))).toBe("2026-10-26T00:20:00.000Z");
  });
});
