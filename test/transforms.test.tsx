import { describe, expect, test } from "bun:test"
import {
  calculateField,
  col,
  Dashboard,
  h,
  joinByField,
  organize,
  prometheus,
  promql,
  renderDashboard,
  sortBy,
  Table,
  TimeSeries,
  timeSeriesTable,
  trend,
} from "../src/index.ts"

const PROM = prometheus("prometheus")

describe("transformations", () => {
  test("each helper is the JSON Grafana writes for it", () => {
    expect(joinByField("Time")).toEqual({ id: "joinByField", options: { byField: "Time", mode: "outer" } })
    expect(organize({ exclude: ["job"], rename: { pod: "Pod" }, order: ["Pod", "value"] })).toEqual({
      id: "organize",
      options: {
        excludeByName: { job: true },
        renameByName: { pod: "Pod" },
        indexByName: { Pod: 0, value: 1 },
      },
    })
    expect(sortBy("Pod", true)).toEqual({ id: "sortBy", options: { sort: [{ field: "Pod", desc: true }] } })
    expect(timeSeriesTable({ A: "mean", B: "lastNotNull" })).toEqual({
      id: "timeSeriesTable",
      options: { A: { stat: "mean" }, B: { stat: "lastNotNull" } },
    })
    expect(trend("B")).toBe("Trend #B")
  })

  test("a calculated column takes a field matcher for a column and a fixed value for a number", () => {
    expect(calculateField("busy", { left: "used", operator: "/", right: "total" })).toEqual({
      id: "calculateField",
      options: {
        alias: "busy",
        replaceFields: false,
        mode: "binary",
        binary: {
          left: { matcher: { id: "byName", options: "used" } },
          operator: "/",
          right: { matcher: { id: "byName", options: "total" } },
        },
      },
    })
    expect(calculateField("pct", { left: "share", operator: "*", right: 100 }, { replace: true })).toMatchObject({
      options: { replaceFields: true, binary: { right: { fixed: "100" } } },
    })
    expect(calculateField("total", { reduce: "sum", of: ["a", "b"] })).toEqual({
      id: "calculateField",
      options: {
        alias: "total",
        replaceFields: false,
        mode: "reduceRow",
        reduce: { reducer: "sum", include: ["a", "b"] },
      },
    })
  })

  test("transformations reach any panel, not only the table", () => {
    const { json } = renderDashboard(
      <Dashboard file="t.json" title="T" uid="t">
        <Table title="rows" queries={[promql(PROM, "up")]} transformations={[timeSeriesTable({ A: "mean" })]} />
        <TimeSeries title="line" unit="short" queries={[promql(PROM, "up")]} transformations={[sortBy("Time")]} />
      </Dashboard>,
    )
    const panels = json.panels
    if (!Array.isArray(panels)) throw new Error("no panels")
    expect(panels.map((p) => (typeof p === "object" && p && !Array.isArray(p) ? p.transformations : null))).toEqual([
      [{ id: "timeSeriesTable", options: { A: { stat: "mean" } } }],
      [{ id: "sortBy", options: { sort: [{ field: "Time", desc: false }] } }],
    ])
  })
})

describe("table cells", () => {
  test("a sparkline column draws the series it holds and needs no color of its own", () => {
    expect(col(trend("A"), { cell: "sparkline", width: 120 })).toEqual({
      matcher: { id: "byName", options: "Trend #A" },
      properties: [
        { id: "custom.width", value: 120 },
        {
          id: "custom.cellOptions",
          value: { type: "sparkline", drawStyle: "line", lineWidth: 1, fillOpacity: 20, showPoints: "never" },
        },
      ],
    })
  })
})
