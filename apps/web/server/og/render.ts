import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { VISA_LABEL, type VisaState } from "#shared/answers";
import { SITE_NAME } from "#shared/seo";

// Share images (1200×630) for link previews: the site's dark theme, its fonts and its visa chips, drawn by Satori
// into SVG and by resvg into PNG. The fonts ship with the server (server/assets/fonts, OFL). Kept out of
// server/utils so these short names aren't auto-imported everywhere.

type Style = Record<string, string | number>;
export type Node = { type: string; props: { style?: Style; children?: Child; [k: string]: unknown } };
type Child = Node | string | (Node | string | null | false)[] | null;

export const h = (
  type: string,
  style: Style,
  children?: Child,
  props: Record<string, unknown> = {},
): Node => ({
  type,
  props: { style, children, ...props },
});

const C = {
  bg: "#010101",
  fg: "#ffffff",
  fg2: "#a6a6a6",
  muted: "rgba(255, 255, 255, 0.5)",
  line: "rgba(255, 255, 255, 0.18)",
  accent: "#76beff",
  accentTint: "#0f181f",
  accentLine: "#365673",
  unknownLine: "rgba(255, 255, 255, 0.32)",
  refuse: "#f99f5d",
  refuseTint: "#1f140c",
  refuseLine: "#71482a",
};

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: "normal" }[]> | undefined;
// A load that failed is tried again on the next image, not kept.
const loadFonts = () =>
  (fonts ??= Promise.all(
    (
      [
        ["Geist", "Geist-Regular.ttf", 400],
        ["Geist", "Geist-Medium.ttf", 500],
        ["Space Mono", "SpaceMono-Regular.woff", 400],
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

// The site's mark: the favicon's arrow and bar.
const mark = h(
  "svg",
  { width: 44, height: 44 },
  [
    h("rect", {}, null, { width: 32, height: 32, rx: 7, fill: "#1a1a1a" }),
    h("path", {}, null, {
      d: "M7 16h11M14 10.5 19.5 16 14 21.5",
      fill: "none",
      stroke: C.accent,
      "stroke-width": 2.6,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
    h("rect", {}, null, { x: 22, y: 10, width: 4, height: 12, fill: C.accent }),
  ],
  { viewBox: "0 0 32 32" },
);

// The visa chip as on the site: round chips quote the posting, the square one comes from the law or a register,
// dashed means nobody says yet.
const CHIP: Record<VisaState, Style> = {
  sponsors: { backgroundColor: C.accent, color: C.bg, borderColor: C.accent, borderRadius: 30 },
  may: { backgroundColor: C.accentTint, color: C.accent, borderColor: C.accentLine, borderRadius: 30 },
  can: { color: C.fg, borderColor: C.accentLine, borderRadius: 7 },
  unknown: { color: C.fg2, borderColor: C.unknownLine, borderStyle: "dashed", borderRadius: 30 },
  wont: { backgroundColor: C.refuseTint, color: C.refuse, borderColor: C.refuseLine, borderRadius: 30 },
};

export const visaChip = (state: VisaState, label = VISA_LABEL[state]) =>
  h(
    "div",
    {
      display: "flex",
      alignItems: "center",
      height: 56,
      padding: "0 24px",
      borderWidth: 2,
      borderStyle: "solid",
      fontSize: 27,
      fontWeight: 500,
      ...CHIP[state],
    },
    label,
  );

export const plainChip = (label: string) =>
  h(
    "div",
    {
      display: "flex",
      alignItems: "center",
      height: 56,
      padding: "0 24px",
      border: `2px solid ${C.line}`,
      borderRadius: 30,
      color: C.fg2,
      fontSize: 27,
      fontWeight: 500,
    },
    label,
  );

// One card: an eyebrow line, the headline (up to three lines), a line of facts and the chips.
export function card(c: { eyebrow?: string; title: string; facts?: string; chips?: Node[] }): Node {
  // Smaller type for longer titles, so three lines still leave room around them.
  const size = c.title.length > 60 ? 50 : c.title.length > 32 ? 58 : 66;
  return h(
    "div",
    {
      width: 1200,
      height: 630,
      // Satori adds padding outside the size otherwise: the text would run off the right edge.
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "60px 72px",
      backgroundColor: C.bg,
      color: C.fg,
      fontFamily: "Geist",
    },
    [
      h("div", { display: "flex", alignItems: "center", gap: 16 }, [
        mark,
        h("div", { fontSize: 32, fontWeight: 500, letterSpacing: -0.5 }, SITE_NAME),
      ]),
      h("div", { display: "flex", flexDirection: "column", gap: 18 }, [
        c.eyebrow ? h("div", { fontSize: 30, color: C.fg2, lineClamp: 1 }, c.eyebrow) : null,
        h(
          "div",
          {
            display: "block",
            fontSize: size,
            fontWeight: 500,
            lineHeight: 1.12,
            letterSpacing: -1,
            lineClamp: 3,
          },
          c.title,
        ),
        c.facts ? h("div", { fontSize: 30, color: C.fg2, lineClamp: 1 }, c.facts) : null,
        c.chips?.length
          ? h("div", { display: "flex", flexWrap: "wrap", gap: 14, marginTop: 6 }, c.chips)
          : null,
      ]),
      h("div", { display: "flex", justifyContent: "space-between", fontSize: 24, color: C.muted }, [
        h("div", { fontFamily: "Space Mono" }, "visaproof.azamatos.com"),
        h("div", {}, "Every answer with its evidence"),
      ]),
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
