import { describe, expect, test } from "bun:test"
import {
  customVariable,
  Dashboard,
  Gauge,
  Heatmap,
  Histogram,
  h,
  Logs,
  PieChart,
  prometheus,
  promql,
  promqlAnnotation,
  queryVariable,
  ref,
  renderDashboard,
  StateTimeline,
  StatusHistory,
  Text,
  valueMap,
} from "../src/index.ts"

const PROM = prometheus("prometheus")
const up = promql(PROM, "up")

const panelsOf = (node: Parameters<typeof renderDashboard>[0]) => {
  const { json } = renderDashboard(node)
  if (!Array.isArray(json.panels)) throw new Error("no panels")
  return json.panels.map((p) => (typeof p === "object" && p && !Array.isArray(p) ? p : {}))
}

describe("the newer panel types", () => {
  test("each renders its Grafana type with the shared head", () => {
    const panels = panelsOf(
      <Dashboard file="p.json" title="P" uid="p">
        <Logs title="lines" queries={[up]} />
        <StateTimeline title="states" queries={[up]} values={{ "0": { text: "down", color: "red" } }} />
        <StatusHistory title="history" queries={[up]} />
        <Heatmap title="heat" queries={[up]} calculate xBucket="1h" />
        <Gauge title="gauge" query={up} unit="percent" max={100} thresholds={[{ color: "green", value: null }]} />
        <PieChart title="pie" queries={[up]} donut />
        <Histogram title="hist" queries={[up]} unit="ms" bucketSize={10} />
        <Text title="note">Hello **there**</Text>
      </Dashboard>,
    )
    expect(panels.map((p) => p.type)).toEqual([
      "logs",
      "state-timeline",
      "status-history",
      "heatmap",
      "gauge",
      "piechart",
      "histogram",
      "text",
    ])
    const [logs, states, , heat, , pie, hist, text] = panels
    expect(logs?.options).toMatchObject({ sortOrder: "Descending", wrapLogMessage: true, dedupStrategy: "none" })
    expect(states?.fieldConfig).toMatchObject({
      defaults: { mappings: valueMap({ "0": { text: "down", color: "red" } }) },
    })
    expect(heat?.options).toMatchObject({ calculate: true, calculation: { xBuckets: { mode: "size", value: "1h" } } })
    expect(pie?.options).toMatchObject({ pieType: "donut" })
    expect(hist?.options).toMatchObject({ bucketSize: 10 })
    expect(text?.options).toEqual({ mode: "markdown", content: "Hello **there**" })
    expect(text?.datasource).toBeUndefined()
  })

  test("value mappings number the entries in the order JavaScript keeps them", () => {
    expect(valueMap({ up: { text: "running", color: "green" }, down: { text: "stopped" } })).toEqual([
      {
        type: "value",
        options: { up: { index: 0, text: "running", color: "green" }, down: { index: 1, text: "stopped" } },
      },
    ])
  })
})

describe("variables, annotations and links", () => {
  test("a query variable on Prometheus wraps the query, on SQL it stays a string", () => {
    const prom = queryVariable({
      name: "node",
      datasource: PROM,
      query: "label_values(up, node)",
      multi: true,
      includeAll: true,
    })
    expect(prom).toMatchObject({
      type: "query",
      name: "node",
      query: { query: "label_values(up, node)" },
      multi: true,
      includeAll: true,
      refresh: 1,
    })
    const pg = queryVariable({
      name: "repo",
      datasource: { type: "grafana-postgresql-datasource", uid: "db" },
      query: "select slug from repos",
    })
    expect(pg.query).toBe("select slug from repos")
    expect(ref("node")).toBe("$node")
  })

  test("a custom variable selects the first value unless told otherwise", () => {
    expect(customVariable({ name: "env", values: ["prod", "test"], current: "test" })).toMatchObject({
      current: { value: "test" },
      options: [
        { value: "prod", selected: false },
        { value: "test", selected: true },
      ],
    })
  })

  test("the dashboard carries Grafana's built-in annotations first, then ours", () => {
    const { json } = renderDashboard(
      <Dashboard
        file="a.json"
        title="A"
        uid="a"
        annotations={[promqlAnnotation({ name: "deploys", datasource: PROM, expr: "changes(x[5m]) > 0" })]}
      >
        <Text title="t">x</Text>
      </Dashboard>,
    )
    const list = (json.annotations as { list: Array<{ name: string }> }).list
    expect(list.map((a) => a.name)).toEqual(["Annotations & Alerts", "deploys"])
  })
})
