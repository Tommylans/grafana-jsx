import { describe, expect, test } from "bun:test"
import {
  CARD_H,
  CARD_H_METRICS,
  CARD_W,
  type Card,
  cardHeightOf,
  drawMap,
  groupAround,
  METRIC_ROW,
} from "../src/index.ts"

const cards = [
  { name: "a", left: 0, top: 0, title: "A", sub: "", icon: "img/x.svg", up: null },
  { name: "b", left: 300, top: 0, title: "B", sub: "", icon: "img/x.svg", up: null },
  { name: "c", left: 300, top: 200, title: "C", sub: "", icon: "img/x.svg", up: null },
] as const satisfies ReadonlyArray<Card>

const named = (elements: unknown[], name: string) =>
  elements.find((e) => typeof e === "object" && e !== null && Reflect.get(e, "name") === name)
const connectionsOf = (elements: unknown[], name: string) => {
  const el = named(elements, name)
  const cs = el && typeof el === "object" ? Reflect.get(el, "connections") : undefined
  return Array.isArray(cs) ? cs : []
}
const knots = (elements: unknown[]) =>
  elements.filter((e) => typeof e === "object" && e !== null && String(Reflect.get(e, "name")).startsWith("knot"))
    .length

describe("router", () => {
  test("ends that line up: one connection, no knot", () => {
    const els = drawMap([], cards, [
      { from: { card: "a", side: "right" }, to: { card: "b", side: "left" }, series: "s" },
    ])
    expect(connectionsOf(els, "a")).toHaveLength(1)
    expect(knots(els)).toBe(0)
  })
  test("perpendicular sides: an L with one knot", () => {
    const els = drawMap([], cards, [
      { from: { card: "a", side: "bottom" }, to: { card: "c", side: "left" }, series: "s" },
    ])
    expect(knots(els)).toBe(1)
    expect(connectionsOf(els, "a")).toHaveLength(1)
    expect(connectionsOf(els, "knot0")).toHaveLength(1)
  })
  test("two equal sides: a Z that swings outside both cards", () => {
    // without b: the swing back down to c would run straight through it, and that is an error now
    const els = drawMap(
      [],
      [cards[0], cards[2]],
      [{ from: { card: "a", side: "top" }, to: { card: "c", side: "top" }, series: "s" }],
    )
    expect(knots(els)).toBe(2)
    const knot = named(els, "knot0")
    const top = knot && typeof knot === "object" ? Reflect.get(Reflect.get(knot, "placement"), "top") : null
    expect(top).toBeLessThan(0) // above the top edge of the cards (y=0)
  })
  test("via on a straight line or an L is an error, and so is a via on the inside", () => {
    expect(() =>
      drawMap([], cards, [
        { from: { card: "a", side: "right" }, to: { card: "b", side: "left" }, series: "s", via: 5 },
      ]),
    ).toThrow(/straight/)
    expect(() =>
      drawMap([], cards, [
        { from: { card: "a", side: "bottom" }, to: { card: "c", side: "left" }, series: "s", via: 5 },
      ]),
    ).toThrow(/on an L/)
    expect(() =>
      drawMap([], cards, [
        { from: { card: "a", side: "bottom" }, to: { card: "c", side: "bottom" }, series: "s", via: 10 },
      ]),
    ).toThrow(/inside/)
  })
  test("the same point is the same knot", () => {
    const p = { x: 150, y: 120 }
    const els = drawMap(
      [],
      cards,
      [],
      [
        { from: p, to: { x: 450, y: 120 } },
        { from: p, to: { x: 150, y: 60 } },
      ],
    )
    expect(knots(els)).toBe(3)
  })
  test("an unknown card is a type error and a runtime error", () => {
    const bad = [{ from: { card: "z", side: "top" }, to: { card: "a", side: "top" }, series: "s" }] as const
    // @ts-expect-error — "z" is not a card name; exactly what the types must catch
    expect(() => drawMap([], cards, bad)).toThrow(/unknown/)
  })
  test("the card size is what the drawing assumes", () => {
    expect(CARD_W).toBe(150)
    expect(CARD_H).toBe(52)
  })
})

test("a card with a value prints it in its corner", () => {
  const elements = drawMap(
    [],
    [{ name: "a", left: 0, top: 0, title: "A", sub: "", icon: "img/x.svg", up: null, value: "load:a" }],
    [],
  )
  const value = elements.find((e) => typeof e === "object" && e && !Array.isArray(e) && e.name === "value-a")
  expect(value).toMatchObject({ type: "metric-value", config: { text: { field: "load:a", mode: "field" } } })
})

test("cards that overlap, a value on a card, and a line through a card are build errors", () => {
  const a = { name: "a", left: 0, top: 0, title: "A", sub: "", icon: "img/x.svg", up: null } as const
  expect(() => drawMap([], [a, { ...a, name: "b", left: 100 }], [])).toThrow(/overlap/)
  const c = { ...a, name: "c", left: 400, top: 0 } as const
  const between = { ...a, name: "m", left: 200, top: 0 } as const
  expect(() =>
    drawMap(
      [],
      [a, c, between],
      [{ from: { card: "a", side: "right" }, to: { card: "c", side: "left" }, series: "s" }],
    ),
  ).toThrow(/crosses card m/)
})

test("a metrics row makes every card taller and groupAround follows", () => {
  const a = {
    name: "a",
    left: 0,
    top: 40,
    title: "A",
    sub: "",
    icon: "img/x.svg",
    up: null,
    metrics: [{ label: "cpu", series: "cpu:a" }],
  } as const
  const b = { name: "b", left: 300, top: 40, title: "B", sub: "", icon: "img/x.svg", up: null } as const
  expect(cardHeightOf([a, b])).toBe(CARD_H_METRICS)
  expect(cardHeightOf([{ ...a, metrics: [...a.metrics, ...a.metrics, ...a.metrics] }])).toBe(CARD_H + 2 * METRIC_ROW)
  expect(groupAround("g", [a, b])).toEqual({
    left: -20,
    top: 8,
    width: 490,
    height: 32 + CARD_H_METRICS + 20,
    label: "g",
  })
  expect(groupAround("g", [a, b], { cardWidth: 190 }).width).toBe(530)
  const elements = drawMap([], [a, b], [])
  const card = elements.find((e) => typeof e === "object" && e && !Array.isArray(e) && e.name === "b")
  expect(card).toMatchObject({ placement: { height: CARD_H_METRICS } })
  expect(elements.some((e) => typeof e === "object" && e && !Array.isArray(e) && e.name === "metric-a-0")).toBe(true)
})
