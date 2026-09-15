// A small flexbox for maps: boxes that hold cards or other boxes in a row or a column, with a gap
// between children, padding inside, an optional label that makes the box a group on the map, and
// alignment along both axes. `layoutMap` measures the tree bottom-up and places it top-down, so a
// map says what sits next to what and never where in pixels.
import type { Node } from "../core/node.ts"
import { CARD_W, type Card, cardHeightOf, type Group } from "./drawMap.ts"

/** A card before it has a place: everything but `left` and `top`. */
export type CardSpec<N extends string = string> = Omit<Card<N>, "left" | "top">
export type Box<N extends string = string> =
  | CardSpec<N>
  | { kind: "space"; size: number }
  | {
      dir: "row" | "col"
      children: ReadonlyArray<Box<N>>
      /** Space between children along the main axis. */
      gap?: number
      /** A labelled box is drawn as a group on the map. */
      label?: string
      /** Where children sit along the main axis when the box got more room than they need. */
      justify?: "start" | "center" | "end"
      /** How children fill the cross axis: `stretch` gives every child the full cross size (groups
       * in one row end up the same height); the others keep a child its own size. */
      align?: "start" | "center" | "end" | "stretch"
    }
export type LayoutOptions = {
  cardWidth?: number
  /** Card height; unset derives it from the metrics on the cards, like `drawMap` does. */
  cardHeight?: number
  /** Default gap for boxes that name none. */
  gap?: number
  /** Padding inside a labelled box, and the room its label takes on top. */
  pad?: number
  labelHeight?: number
}

const isCard = <N extends string>(box: Box<N>): box is CardSpec<N> => "name" in box
const isSpace = <N extends string>(box: Box<N>): box is { kind: "space"; size: number } => "kind" in box

type Size = { w: number; h: number }

export type Laid<N extends string = string> = { cards: Card<N>[]; groups: Group[]; width: number; height: number }

/** A `<YStack>`/`<XStack>` tree as the plain box the engine walks; any other node is a mistake. */
const boxOf = (node: Node): Box<string> => {
  if (node.kind !== "stack") throw new Error(`layoutMap takes a stack, not a ${node.kind}`)
  return {
    dir: node.dir,
    children: node.children.map(
      (child): Box<string> => ("kind" in child && child.kind === "stack" ? boxOf(child) : child),
    ),
    ...(node.gap === undefined ? {} : { gap: node.gap }),
    ...(node.label === undefined ? {} : { label: node.label }),
    ...(node.justify === undefined ? {} : { justify: node.justify }),
    ...(node.align === undefined ? {} : { align: node.align }),
  }
}

/** Measures and places the tree (a `<YStack>`, or a plain `Box`); the root's top-left corner lands
 * on (`left`, `top`). The cards come back by name; `placeCards` gives the declared cards their places
 * under their own (union-typed) names. */
export function layoutMap(tree: Node | Box<string>, options: LayoutOptions = {}, left = 20, top = 20): Laid<string> {
  const root: Box<string> = "kind" in tree ? boxOf(tree) : tree
  const cardWidth = options.cardWidth ?? CARD_W
  const cardHeight = options.cardHeight ?? cardHeightOf(collectCards(root))
  const gapDefault = options.gap ?? 32
  const pad = options.pad ?? 16
  const labelHeight = options.labelHeight ?? 32

  const measure = (box: Box<string>): Size => {
    if (isCard(box)) return { w: cardWidth, h: cardHeight }
    if (isSpace(box)) return { w: box.size, h: box.size }
    const sizes = box.children.map(measure)
    // A spacer only counts along the axis; across it, it takes no room.
    const solid = box.children.flatMap((child, i) => (isSpace(child) ? [] : [sizes[i] ?? { w: 0, h: 0 }]))
    const gap = box.gap ?? gapDefault
    const gaps = Math.max(0, sizes.length - 1) * gap
    const main = sizes.reduce((sum, s) => sum + (box.dir === "row" ? s.w : s.h), 0) + gaps
    const cross = Math.max(0, ...solid.map((s) => (box.dir === "row" ? s.h : s.w)))
    const w = box.dir === "row" ? main : cross
    const h = box.dir === "row" ? cross : main
    return box.label ? { w: w + 2 * pad, h: h + labelHeight + pad } : { w, h }
  }

  const out: Laid<string> = { cards: [], groups: [], width: 0, height: 0 }
  const place = (box: Box<string>, x: number, y: number, w: number, h: number): void => {
    if (isCard(box)) {
      out.cards.push({ ...box, left: x, top: y })
      return
    }
    if (isSpace(box)) return
    if (box.label) out.groups.push({ left: x, top: y, width: w, height: h, label: box.label })
    const inner = box.label
      ? { x: x + pad, y: y + labelHeight, w: w - 2 * pad, h: h - labelHeight - pad }
      : { x, y, w, h }
    const sizes = box.children.map(measure)
    const gap = box.gap ?? gapDefault
    const row = box.dir === "row"
    const need = sizes.reduce((sum, s) => sum + (row ? s.w : s.h), 0) + Math.max(0, sizes.length - 1) * gap
    const room = row ? inner.w : inner.h
    const start = box.justify === "center" ? (room - need) / 2 : box.justify === "end" ? room - need : 0
    let along = start
    box.children.forEach((child, i) => {
      const size = sizes[i] as Size
      const crossRoom = row ? inner.h : inner.w
      const crossSize = row ? size.h : size.w
      const align = box.align ?? "start"
      const crossOffset = align === "center" ? (crossRoom - crossSize) / 2 : align === "end" ? crossRoom - crossSize : 0
      const crossGiven = align === "stretch" ? crossRoom : crossSize
      if (row) place(child, inner.x + along, inner.y + crossOffset, size.w, crossGiven)
      else place(child, inner.x + crossOffset, inner.y + along, crossGiven, size.h)
      along += (row ? size.w : size.h) + gap
    })
  }
  const size = measure(root)
  place(root, left, top, size.w, size.h)
  out.width = size.w
  out.height = size.h
  return out
}

const collectCards = <N extends string>(box: Box<N>): CardSpec<N>[] =>
  isCard(box) ? [box] : isSpace(box) ? [] : box.children.flatMap(collectCards)

/** A row of boxes. */
export const flexRow = <N extends string>(
  children: ReadonlyArray<Box<N>>,
  rest: Omit<Extract<Box<N>, { dir: string }>, "dir" | "children"> = {},
): Box<N> => ({ dir: "row", children, ...rest })
/** A column of boxes. */
export const flexCol = <N extends string>(
  children: ReadonlyArray<Box<N>>,
  rest: Omit<Extract<Box<N>, { dir: string }>, "dir" | "children"> = {},
): Box<N> => ({ dir: "col", children, ...rest })
/** Cards in a grid of `columns` per row, as a column of rows. */
export const flexGrid = <N extends string>(
  columns: number,
  cards: ReadonlyArray<CardSpec<N>>,
  gap?: number,
  rowGap?: number,
): Box<N> => {
  const rows: Box<N>[] = []
  for (let i = 0; i < cards.length; i += columns)
    rows.push(flexRow(cards.slice(i, i + columns), gap === undefined ? {} : { gap }))
  return flexCol(rows, rowGap === undefined ? {} : { gap: rowGap })
}

/** The cards of a map in the order and with the names they were declared, each with the place the
 * layout gave it; a card the layout never saw is an error. */
export const placeCards = <N extends string>(specs: ReadonlyArray<CardSpec<N>>, laid: Laid<string>): Card<N>[] =>
  specs.map((spec) => {
    const placed = laid.cards.find((card) => card.name === spec.name)
    if (!placed) throw new Error(`card ${spec.name} is not in the layout`)
    return { ...spec, left: placed.left, top: placed.top }
  })
