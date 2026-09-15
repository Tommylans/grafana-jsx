import { describe, expect, test } from "bun:test"
import { CARD_H, CARD_W, flexCol as col, flexGrid as grid, layoutMap, flexRow as row } from "../src/index.ts"

const card = (name: string) => ({ name, title: name, sub: "", icon: "img/x.svg", up: null }) as const

describe("layoutMap", () => {
  test("a row places cards side by side with the gap, a column stacks them", () => {
    const laid = layoutMap(row([card("a"), card("b")], { gap: 100 }), {}, 0, 0)
    expect(laid.cards.map((c) => [c.name, c.left, c.top])).toEqual([
      ["a", 0, 0],
      ["b", CARD_W + 100, 0],
    ])
    expect(laid.width).toBe(2 * CARD_W + 100)
    const stacked = layoutMap(col([card("a"), card("b")], { gap: 38 }), {}, 0, 0)
    expect(stacked.cards[1]?.top).toBe(CARD_H + 38)
  })

  test("a labelled box becomes a group around its children, and groups in one row stretch to one height", () => {
    const laid = layoutMap(
      row([col([card("a"), card("b")], { label: "two", gap: 38 }), col([card("c")], { label: "one" })], {
        gap: 60,
        align: "stretch",
      }),
      { pad: 20, labelHeight: 32 },
      0,
      0,
    )
    const [two, one] = laid.groups
    expect(two).toEqual({ left: 0, top: 0, width: CARD_W + 40, height: 32 + 2 * CARD_H + 38 + 20, label: "two" })
    expect(one?.height).toBe(two?.height)
    expect(one?.left).toBe(CARD_W + 40 + 60)
    expect(laid.cards.find((c) => c.name === "a")).toMatchObject({ left: 20, top: 32 })
  })

  test("justify centers a shorter row inside a wider column", () => {
    const laid = layoutMap(
      col([row([card("a"), card("b"), card("c")], { gap: 50 }), row([card("d")], { justify: "center" })], {
        align: "center",
      }),
      {},
      0,
      0,
    )
    const d = laid.cards.find((c) => c.name === "d")
    expect(d?.left).toBe((3 * CARD_W + 100 - CARD_W) / 2)
  })

  test("grid folds cards into rows", () => {
    const laid = layoutMap(grid(2, [card("a"), card("b"), card("c")], 100, 38), {}, 0, 0)
    expect(laid.cards.map((c) => [c.left, c.top])).toEqual([
      [0, 0],
      [CARD_W + 100, 0],
      [0, CARD_H + 38],
    ])
  })
})
