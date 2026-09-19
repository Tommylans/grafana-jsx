import { describe, expect, test } from "bun:test"
import {
  col,
  colorsFor,
  Dashboard,
  h,
  postgres,
  prometheus,
  promql,
  Row,
  renderDashboard,
  Section,
  Stat,
  sql,
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
  test("targets on different datasources make the panel Mixed", () => {
    const { json } = renderDashboard(
      <Dashboard file="m.json" title="M" uid="m">
        <TimeSeries title="mixed" unit="short" queries={[promql(PROM, "up"), sql(DB, "select 1")]} />
      </Dashboard>,
    )
    const panels = json.panels
    if (!Array.isArray(panels)) throw new Error("no panels")
    const panel = panels[0]
    expect(typeof panel === "object" && panel && !Array.isArray(panel) ? panel.datasource : null).toEqual({
      type: "datasource",
      uid: "-- Mixed --",
    })
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

describe("repeat", () => {
  test("a section with repeat is a row panel that repeats; a panel repeats as many per row as its width allows", () => {
    const { json } = renderDashboard(
      <Dashboard file="a.json" title="A" uid="a">
        <Section title="Node $node" repeat="node">
          <Row>
            <Stat title="cpu" unit="percent" w={6} repeat="node" query={promql(PROM, "up")} />
          </Row>
        </Section>
        <TimeSeries title="wide" unit="short" w={24} repeat="node" queries={[promql(PROM, "up")]} />
      </Dashboard>,
    )
    const panels = json.panels
    if (!Array.isArray(panels)) throw new Error("no panels")
    const repeats = panels.map((p) =>
      typeof p === "object" && p && !Array.isArray(p) ? [p.type, p.repeat, p.repeatDirection, p.maxPerRow] : null,
    )
    expect(repeats).toEqual([
      ["row", "node", undefined, undefined],
      ["stat", "node", "h", 4],
      ["timeseries", "node", "h", 1],
    ])
  })
})

describe("sections", () => {
  test("a section is a row panel one line high, its children below it, ids and y in reading order", () => {
    const { json } = renderDashboard(
      <Dashboard file="a.json" title="A" uid="a">
        {stat("before")}
        <Section title="Now">
          <Row>
            {stat("one")}
            {stat("two")}
          </Row>
        </Section>
        <Section title="Later">
          <TimeSeries title="three" unit="short" queries={[promql(PROM, "up")]} />
        </Section>
      </Dashboard>,
    )
    const panels = json.panels
    if (!Array.isArray(panels)) throw new Error("no panels")
    const placed = panels.map((p) =>
      typeof p === "object" && p && !Array.isArray(p) ? [p.id, p.type, p.title, p.gridPos] : null,
    )
    expect(placed).toEqual([
      [1, "stat", "before", { h: 4, w: 4, x: 0, y: 0 }],
      [2, "row", "Now", { h: 1, w: 24, x: 0, y: 4 }],
      [3, "stat", "one", { h: 4, w: 4, x: 0, y: 5 }],
      [4, "stat", "two", { h: 4, w: 4, x: 4, y: 5 }],
      [5, "row", "Later", { h: 1, w: 24, x: 0, y: 9 }],
      [6, "timeseries", "three", { h: 8, w: 12, x: 0, y: 10 }],
    ])
    const head = panels[1]
    expect(head && typeof head === "object" && !Array.isArray(head) ? head.collapsed : null).toBe(false)
  })
  test("a collapsed section carries its panels inside the row, and the next section follows one line below", () => {
    const { json } = renderDashboard(
      <Dashboard file="a.json" title="A" uid="a">
        <Section title="Folded" collapsed>
          <Row>
            {stat("one")}
            {stat("two")}
          </Row>
        </Section>
        <Section title="Open">{stat("three")}</Section>
      </Dashboard>,
    )
    const panels = json.panels
    if (!Array.isArray(panels)) throw new Error("no panels")
    expect(
      panels.map((p) => (typeof p === "object" && p && !Array.isArray(p) ? [p.id, p.type, p.title, p.gridPos] : null)),
    ).toEqual([
      [1, "row", "Folded", { h: 1, w: 24, x: 0, y: 0 }],
      [4, "row", "Open", { h: 1, w: 24, x: 0, y: 1 }],
      [5, "stat", "three", { h: 4, w: 4, x: 0, y: 2 }],
    ])
    const folded = panels[0]
    const held = folded && typeof folded === "object" && !Array.isArray(folded) ? folded.panels : null
    expect(folded && typeof folded === "object" && !Array.isArray(folded) ? folded.collapsed : null).toBe(true)
    expect(
      Array.isArray(held)
        ? held.map((p) => (typeof p === "object" && p && !Array.isArray(p) ? [p.id, p.title, p.gridPos] : null))
        : null,
    ).toEqual([
      [2, "one", { h: 4, w: 4, x: 0, y: 1 }],
      [3, "two", { h: 4, w: 4, x: 4, y: 1 }],
    ])
  })
  test("sections do not nest", () => {
    expect(() =>
      renderDashboard(
        <Dashboard file="a.json" title="A" uid="a">
          <Section title="outer">
            <Section title="inner">{stat("one")}</Section>
          </Section>
        </Dashboard>,
      ),
    ).toThrow(/do not nest/)
  })
})

describe("color and emphasis", () => {
  test("a stat colors by thresholds, fills its background and draws a sparkline when asked", () => {
    const { json } = renderDashboard(
      <Dashboard file="a.json" title="A" uid="a">
        <Stat
          title="room"
          unit="percent"
          query={sql(DB, "select 1")}
          thresholds={[
            { color: "red", value: null },
            { color: "green", value: 20 },
          ]}
          background
          sparkline
        />
      </Dashboard>,
    )
    const first = Array.isArray(json.panels) ? json.panels[0] : null
    expect(first).toMatchObject({
      fieldConfig: {
        defaults: {
          thresholds: {
            mode: "absolute",
            steps: [
              { color: "red", value: null },
              { color: "green", value: 20 },
            ],
          },
        },
      },
      options: { graphMode: "area", colorMode: "background" },
    })
    expect(() =>
      renderDashboard(
        <Dashboard file="a.json" title="A" uid="a">
          <Stat
            title="x"
            unit="short"
            query={sql(DB, "select 1")}
            color="blue"
            thresholds={[{ color: "red", value: null }]}
          />
        </Dashboard>,
      ),
    ).toThrow(/thresholds or color/)
  })
  test("a time series legend can be a table with values, and thresholds draw reference lines", () => {
    const { json } = renderDashboard(
      <Dashboard file="a.json" title="A" uid="a">
        <TimeSeries
          title="x"
          unit="percent"
          queries={[promql(PROM, "up")]}
          legend="table"
          legendValues={["last", "max"]}
          thresholds={[
            { color: "transparent", value: null },
            { color: "red", value: 100 },
          ]}
          thresholdStyle="line"
          points
        />
        <TimeSeries title="y" unit="percent" queries={[promql(PROM, "up")]} legend="hidden" />
      </Dashboard>,
    )
    const [x, y] = Array.isArray(json.panels) ? json.panels : []
    expect(x).toMatchObject({
      options: { legend: { displayMode: "table", showLegend: true, calcs: ["lastNotNull", "max"] } },
      fieldConfig: { defaults: { custom: { thresholdsStyle: { mode: "line" }, showPoints: "always" } } },
    })
    expect(y).toMatchObject({ options: { legend: { showLegend: false, calcs: [] } } })
    const ySeen = y && typeof y === "object" && !Array.isArray(y) ? y.fieldConfig : null
    expect(JSON.stringify(ySeen)).not.toContain("thresholdsStyle")
  })
  test("a column can be a gauge or a colored cell by its thresholds; a cell without a color is an error", () => {
    expect(
      col("week", {
        unit: "percent",
        cell: "gauge",
        min: 0,
        max: 100,
        thresholds: [
          { color: "green", value: null },
          { color: "red", value: 90 },
        ],
      }),
    ).toEqual({
      matcher: { id: "byName", options: "week" },
      properties: [
        { id: "unit", value: "percent" },
        { id: "custom.cellOptions", value: { type: "gauge", mode: "gradient", valueDisplayMode: "text" } },
        {
          id: "thresholds",
          value: {
            mode: "absolute",
            steps: [
              { color: "green", value: null },
              { color: "red", value: 90 },
            ],
          },
        },
        { id: "min", value: 0 },
        { id: "max", value: 100 },
        { id: "color", value: { mode: "thresholds" } },
      ],
    })
    expect(col("state", { cell: "background", color: "blue", values: { "1": { text: "on" } } }).properties).toEqual([
      { id: "custom.cellOptions", value: { type: "color-background", mode: "gradient" } },
      { id: "color", value: { mode: "fixed", fixedColor: "blue" } },
      { id: "mappings", value: [{ type: "value", options: { "1": { index: 0, text: "on" } } }] },
    ])
    expect(() => col("x", { cell: "text" })).toThrow(/needs thresholds or a color/)
    expect(() => col("x", { color: "blue", thresholds: [{ color: "red", value: null }] })).toThrow(
      /thresholds or color/,
    )
  })
  test("colorsFor hands out the palette in order and refuses a thirteenth name", () => {
    expect(colorsFor(["a", "b", "c"])).toEqual([
      ["a", "blue"],
      ["b", "orange"],
      ["c", "green"],
    ])
    expect(colorsFor(["a", "b"], ["red", "green"])).toEqual([
      ["a", "red"],
      ["b", "green"],
    ])
    expect(() => colorsFor(Array.from({ length: 13 }, (_, i) => `s${i}`))).toThrow(/13 names/)
  })
})
