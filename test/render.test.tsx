import { describe, expect, test } from "bun:test"
import {
  col,
  Dashboard,
  h,
  postgres,
  prometheus,
  promql,
  Row,
  renderDashboard,
  Stat,
  sql,
  Table,
  TimeSeries,
} from "../src/index.ts"

const DB = postgres("db")
const PROM = prometheus("prometheus")
const stat = (title: string) => <Stat title={title} unit="short" query={sql(DB, "select 1", { format: "table" })} />

describe("layout", () => {
  test("a row places panels side by side, the next row below; ids in reading order", () => {
    const { json } = renderDashboard(
      <Dashboard file="a.json" title="A" uid="a">
        <Row>
          {stat("one")}
          {stat("two")}
        </Row>
        <TimeSeries title="three" unit="short" queries={[promql(PROM, "up")]} />
      </Dashboard>,
    )
    const panels = json.panels
    if (!Array.isArray(panels)) throw new Error("no panels")
    const positions = panels.map((p) => (typeof p === "object" && p && !Array.isArray(p) ? [p.id, p.gridPos] : null))
    expect(positions).toEqual([
      [1, { h: 4, w: 4, x: 0, y: 0 }],
      [2, { h: 4, w: 4, x: 4, y: 0 }],
      [3, { h: 8, w: 12, x: 0, y: 4 }],
    ])
  })
  test("a row wider than the grid is an error", () => {
    expect(() =>
      renderDashboard(
        <Dashboard file="a.json" title="A" uid="a">
          <Row>
            <TimeSeries title="x" w={13} unit="short" queries={[promql(PROM, "up")]} />
            <TimeSeries title="y" w={12} unit="short" queries={[promql(PROM, "up")]} />
          </Row>
        </Dashboard>,
      ),
    ).toThrow(/24/)
  })
  test("a panel outside a row keeps its own width", () => {
    const { json } = renderDashboard(
      <Dashboard file="a.json" title="A" uid="a">
        <TimeSeries title="x" w={8} unit="short" queries={[promql(PROM, "up")]} />
      </Dashboard>,
    )
    const first = Array.isArray(json.panels) ? json.panels[0] : null
    expect(first && typeof first === "object" && !Array.isArray(first) ? first.gridPos : null).toEqual({
      h: 8,
      w: 8,
      x: 0,
      y: 0,
    })
  })
  test("tags are exactly what the dashboard says", () => {
    const { json } = renderDashboard(<Dashboard file="a.json" title="A" uid="a" tags={["x"]} />)
    expect(json.tags).toEqual(["x"])
  })
})

describe("panels", () => {
  test("one panel, one datasource", () => {
    expect(() =>
      renderDashboard(
        <Dashboard file="a.json" title="A" uid="a">
          <Table title="x" queries={[sql(DB, "select 1"), promql(PROM, "up")]} />
        </Dashboard>,
      ),
    ).toThrow(/Mixed/)
  })
  test("column formatting comes in a fixed order, only what is set", () => {
    expect(col("cost", { width: 90, unit: "currencyUSD" })).toEqual({
      matcher: { id: "byName", options: "cost" },
      properties: [
        { id: "unit", value: "currencyUSD" },
        { id: "custom.width", value: 90 },
      ],
    })
  })
  test("children as an attribute count too", () => {
    const { json } = renderDashboard(<Dashboard file="a.json" title="A" uid="a" children={[stat("one")]} />)
    expect(Array.isArray(json.panels) ? json.panels.length : 0).toBe(1)
  })
})
