// Routing of a line between two ends on a card map: straight when the ends line up, an L when the
// sides are perpendicular (or one end is a loose point), a Z when the sides are parallel. A line
// always leaves a card outwards; a `via` on the wrong side of a card is an error.

export type Point = { x: number; y: number }
export type Segment = { a: Point; b: Point }
export type Side = "top" | "bottom" | "left" | "right"

const vertical = (side: Side) => side === "top" || side === "bottom"

/** How far a Z between two equal sides swings out beyond the cards. */
export const OUT = 16

/** Is coordinate `c` on the outward side of point `p` on `side`? A loose point has no outward side. */
const outward = (p: Point, side: Side | null, c: number) =>
  side === null || (side === "top" ? c <= p.y : side === "bottom" ? c >= p.y : side === "left" ? c <= p.x : c >= p.x)

export const length = (s: Segment) => Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y)

/** The straight segments of a line: one when the ends line up, two (an L) or three (a Z) otherwise. */
export function route(
  a: Point,
  aSide: Side | null,
  b: Point,
  bSide: Side | null,
  via: number | undefined,
  series: string,
): Segment[] {
  const alignedX = Math.abs(a.x - b.x) < 1
  const alignedY = Math.abs(a.y - b.y) < 1
  if (alignedX || alignedY) {
    if (via !== undefined) throw new Error(`${series}: via on a straight line`)
    return [{ a, b }]
  }
  // A loose point follows the side at the other end; two loose points make an L.
  const aVert = aSide ? vertical(aSide) : bSide ? !vertical(bSide) : true
  const bVert = bSide ? vertical(bSide) : !aVert
  if (aVert !== bVert) {
    if (via !== undefined) throw new Error(`${series}: via on an L`)
    const corner = aVert ? { x: a.x, y: b.y } : { x: b.x, y: a.y }
    return [
      { a, b: corner },
      { a: corner, b },
    ]
  }
  // A Z: the middle segment sits on `via`, or halfway, or — for two equal sides — just outside both cards.
  const same = aSide !== null && aSide === bSide
  const c = aVert
    ? (via ?? (same ? (aSide === "top" ? Math.min(a.y, b.y) - OUT : Math.max(a.y, b.y) + OUT) : (a.y + b.y) / 2))
    : (via ?? (same ? (aSide === "left" ? Math.min(a.x, b.x) - OUT : Math.max(a.x, b.x) + OUT) : (a.x + b.x) / 2))
  if (!outward(a, aSide, c) || !outward(b, bSide, c)) {
    throw new Error(`${series}: the middle segment (${c}) lies on the inside of a card`)
  }
  return aVert
    ? [
        { a, b: { x: a.x, y: c } },
        { a: { x: a.x, y: c }, b: { x: b.x, y: c } },
        { a: { x: b.x, y: c }, b },
      ]
    : [
        { a, b: { x: c, y: a.y } },
        { a: { x: c, y: a.y }, b: { x: c, y: b.y } },
        { a: { x: c, y: b.y }, b },
      ]
}
