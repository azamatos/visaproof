import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { RoleCard } from "#shared/answers";
import { languageList } from "#shared/evidence";

// The share image (1200×630) every page links to: the owner's design (Claude Design, 2026-10-27), drawn by Satori
// into SVG and by resvg into PNG, with the live numbers and the three newest roles that sponsor a visa. The fonts
// ship with the server (server/assets/fonts, OFL). Kept out of server/utils so these short names aren't
// auto-imported everywhere.

type Style = Record<string, string | number>;
export type Node = { type: string; props: { style?: Style; children?: Child; [k: string]: unknown } };
type Child = Node | string | (Node | string | null | false)[] | null;

const h = (type: string, style: Style, children?: Child, props: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...props },
});
// An SVG shape: attributes only.
const shape = (type: string, props: Record<string, unknown>): Node => ({ type, props });

const C = {
  bg: "#010101",
  fg: "#ffffff",
  fg2: "#a6a6a6",
  muted: "#8a8f98",
  accent: "#76beff",
  onAccent: "#04111f",
  chip: "#e6e6e6",
  refuse: "#f0a05a",
  can: "#d9d9d9",
};
const MONO = "Space Mono";

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[]> | undefined;
// A load that failed is tried again on the next image, not kept.
const loadFonts = () =>
  (fonts ??= Promise.all(
    (
      [
        ["Geist", "Geist-Regular.ttf", 400],
        ["Geist", "Geist-Medium.ttf", 500],
        ["Geist", "Geist-SemiBold.ttf", 600],
        [MONO, "SpaceMono-Regular.woff", 400],
      ] as const
    ).map(async ([name, file, weight]) => {
      const data = await useStorage("assets:server").getItemRaw<Buffer>(`fonts/${file}`);
      if (!data) throw new Error(`font missing: ${file}`);
      return { name, data: Buffer.from(data), weight, style: "normal" as const };
    }),
  ).catch((e: unknown) => {
    fonts = undefined;
    throw e;
  }));

const svg = (size: number, viewBox: string, children: Node[]) =>
  h("svg", { display: "block", flexShrink: 0 }, children, { width: size, height: size, viewBox });

const ICON = {
  check: (color: string) =>
    svg(16, "0 0 24 24", [
      shape("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: color, "stroke-width": 2.2 }),
      shape("path", {
        d: "M8 12.3l2.7 2.7L16 9.7",
        fill: "none",
        stroke: color,
        "stroke-width": 2.2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }),
    ]),
  box: svg(16, "0 0 24 24", [
    shape("path", {
      d: "M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z M4 8.5 12 13l8-4.5 M12 13v7",
      fill: "none",
      stroke: C.chip,
      "stroke-width": 1.9,
      "stroke-linejoin": "round",
    }),
  ]),
  globe: svg(15, "0 0 24 24", [
    shape("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: C.fg2, "stroke-width": 1.9 }),
    shape("path", {
      d: "M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z",
      fill: "none",
      stroke: C.fg2,
      "stroke-width": 1.9,
    }),
  ]),
  arrow: svg(26, "0 0 32 32", [
    shape("path", {
      d: "M5 16h19M17 9l7 7-7 7",
      fill: "none",
      stroke: C.accent,
      "stroke-width": 3.2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
  ]),
  // The owner's mark, as on azamatos.com
  azamatos: svg(34, "0 0 32 32", [
    shape("rect", { width: 32, height: 32, rx: 7, fill: C.bg }),
    shape("path", {
      fill: "#f0f4f3",
      stroke: "#f0f4f3",
      "stroke-width": 44,
      "stroke-linejoin": "round",
      transform: "translate(6.06 22.5) scale(.02 -.02)",
      d: "M279 -14Q214 -14 161.5 15.5Q109 45 78 101.5Q47 158 47 240L47 256Q47 337 78 394Q109 451 161.5 480.5Q214 510 277 510Q328 510 369.5 487.5Q411 465 435 418L447 418L447 496L525 496L525 102Q525 72 552 72L577 72L577 0L524 0Q493 0 470 20Q447 40 447 84L435 84Q411 35 368.5 10.5Q326 -14 279 -14ZM287 60Q357 60 402 110Q447 160 447 242L447 254Q447 307 426 348Q405 389 369 412.5Q333 436 287 436Q241 436 205 413.5Q169 391 148 350.5Q127 310 127 256L127 240Q127 156 172 108Q217 60 287 60Z",
    }),
    shape("rect", { x: 19, y: 9, width: 6, height: 14, fill: "#68edc0" }),
  ]),
};

const chip = (style: Style, icon: Node, label: string) =>
  h(
    "div",
    {
      display: "flex",
      alignItems: "center",
      gap: 7,
      height: 32,
      padding: "0 13px 0 10px",
      borderRadius: 999,
      fontSize: 15,
      whiteSpace: "nowrap",
      ...style,
    },
    [icon, label],
  );

// One role as its card on the site: title and age, where, and its answers.
function role(r: RoleCard, first: boolean): Node {
  const language = !r.languages
    ? null
    : r.languages.length
      ? `${languageList(r.languages)} required`
      : "English only";
  return h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      gap: 11,
      padding: "19px 22px",
      border: `1px solid ${first ? "rgba(118, 190, 255, 0.55)" : "rgba(255, 255, 255, 0.12)"}`,
      borderRadius: 18,
      backgroundColor: first ? "#0c1118" : "#0b0c0e",
    },
    [
      h("div", { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }, [
        h(
          "div",
          {
            fontSize: 23,
            fontWeight: 500,
            letterSpacing: -0.575,
            color: C.fg,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 1,
          },
          r.title,
        ),
        h(
          "div",
          { fontFamily: MONO, fontSize: 13, color: C.muted, whiteSpace: "nowrap", flexShrink: 0 },
          r.posted,
        ),
      ]),
      h(
        "div",
        { fontSize: 17, color: C.fg2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
        [r.company, r.place, r.workMode].filter(Boolean).join(" · "),
      ),
      // One row: a long language list is cut short rather than run past the card
      h("div", { display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }, [
        chip(
          { backgroundColor: C.accent, color: C.onAccent, fontWeight: 600 },
          ICON.check(C.onAccent),
          "Sponsors visa",
        ),
        r.relocation === "helps"
          ? chip(
              { border: "1px solid rgba(255, 255, 255, 0.28)", color: C.chip, fontWeight: 500 },
              ICON.box,
              "Helps you move",
            )
          : null,
        language
          ? h(
              "div",
              {
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: 6,
                minWidth: 0,
                flexShrink: 1,
                fontFamily: MONO,
                fontSize: 13,
                color: C.fg2,
              },
              [
                ICON.globe,
                h(
                  "div",
                  { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 },
                  language,
                ),
              ],
            )
          : null,
      ]),
    ],
  );
}

const dot = (fill: string, border: string, label: string) =>
  h("div", { display: "flex", alignItems: "center", gap: 7 }, [
    h("div", {
      width: 11,
      height: 11,
      borderRadius: 999,
      backgroundColor: fill,
      border: `2px solid ${border}`,
      boxSizing: "border-box",
    }),
    label,
  ]);

// The site's share image: the pitch with the live numbers on the left, the newest roles that sponsor on the right
// (three fit).
export function siteImage(facts: string, roles: RoleCard[]): Node {
  return h(
    "div",
    {
      display: "flex",
      position: "relative",
      width: 1200,
      height: 630,
      overflow: "hidden",
      backgroundColor: C.bg,
      color: C.fg,
      fontFamily: "Geist",
    },
    [
      h(
        "div",
        {
          position: "absolute",
          left: 604,
          top: 122,
          width: 532,
          height: 458,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
        roles.map((r, i) => role(r, i === 0)),
      ),
      h(
        "div",
        {
          position: "absolute",
          left: 64,
          top: 50,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: MONO,
          fontSize: 28,
          lineHeight: 1,
          letterSpacing: -0.28,
        },
        [
          ICON.arrow,
          h("div", { color: C.muted }, "~"),
          h("div", { color: C.fg }, "visaproof.azamatos"),
          h("div", { width: 16, height: 32, marginLeft: -10, backgroundColor: C.accent }),
        ],
      ),
      h(
        "div",
        {
          position: "absolute",
          right: 64,
          top: 47,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: MONO,
          fontSize: 17,
          color: C.fg2,
        },
        [
          h("div", { display: "flex", borderRadius: 8, boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.2)" }, [
            ICON.azamatos,
          ]),
          "azamatos.com",
        ],
      ),
      h(
        "div",
        {
          position: "absolute",
          left: 64,
          top: 150,
          width: 496,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        },
        [
          h(
            "div",
            {
              fontFamily: MONO,
              fontSize: 16,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: C.accent,
            },
            "For relocating developers",
          ),
          h(
            "div",
            { fontSize: 58, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2.61, color: C.fg },
            "Developer jobs in Europe, visa answer first.",
          ),
          h("div", { fontSize: 24, lineHeight: 1.38, letterSpacing: -0.36, color: C.fg2 }, facts),
        ],
      ),
      h(
        "div",
        {
          position: "absolute",
          left: 64,
          bottom: 50,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: MONO,
          fontSize: 16,
          color: C.fg2,
        },
        [
          dot(C.accent, C.accent, "sponsors"),
          dot("transparent", C.accent, "may"),
          dot("transparent", C.can, "can"),
          dot(C.refuse, C.refuse, "won’t"),
        ],
      ),
    ],
  );
}

export async function png(node: Node): Promise<Buffer> {
  // Satori takes React-like elements; these plain objects are the same shape.
  const svg = await satori(node as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
