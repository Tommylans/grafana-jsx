import { describe, expect, test } from "bun:test"
import {
  BarGauge,
  customVariable,
  Dashboard,
  fieldValues,
  Gauge,
  Heatmap,
  Histogram,
  h,
  Logs,
  labelValues,
  logql,
  logsql,
  loki,
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
  victorialogs,
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

  test("`display` names every series through fieldConfig.defaults.displayName", () => {
    const [gauge] = panelsOf(
      <Dashboard file="d.json" title="d" uid="d">
        <Gauge
          title="g"
          query={up}
          unit="short"
          max={1}
          thresholds={[{ color: "green", value: null }]}
          display="${__field.labels.pod}"
        />
      </Dashboard>,
    )
    expect(gauge?.fieldConfig).toMatchObject({ defaults: { displayName: "${__field.labels.pod}", unit: "short" } })
  })

  test("the key null maps the missing value as a special mapping, after the values", () => {
    expect(valueMap({ "1": { text: "on" }, null: { text: "", color: "transparent" } })).toEqual([
      { type: "value", options: { "1": { index: 0, text: "on" } } },
      { type: "special", options: { match: "null", result: { index: 1, text: "", color: "transparent" } } },
    ])
    expect(valueMap({ null: { color: "transparent" } })).toEqual([
      { type: "special", options: { match: "null", result: { index: 0, color: "transparent" } } },
    ])
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

describe("BarGauge", () => {
  test("keeps every row for a Loki instant query, reduces a Prometheus vector per series", () => {
    const [prom, lokiTop] = panelsOf(
      <Dashboard file="b.json" title="B" uid="b">
        <BarGauge title="prom" query={up} unit="short" />
        <BarGauge
          title="loki"
          query={logql(loki("loki"), 'topk(3, sum by (pod) (count_over_time({a="b"} [$__range])))', {
            type: "instant",
          })}
          unit="short"
        />
      </Dashboard>,
    )
    expect(prom?.options).toMatchObject({ reduceOptions: { values: false } })
    expect(lokiTop?.options).toMatchObject({ reduceOptions: { values: true } })
  })
})

describe("customVariable", () => {
  test("opens on All when includeAll is set and nothing else is asked, else on the first value", () => {
    const all = customVariable({ name: "level", values: ["error", "warn"], multi: true, includeAll: true })
    expect(all.current).toEqual({ text: "All", value: "$__all" })
    expect(all.options).toEqual([
      { text: "All", value: "$__all", selected: true },
      { text: "error", value: "error", selected: false },
      { text: "warn", value: "warn", selected: false },
    ])
    const first = customVariable({ name: "level", values: ["error", "warn"] })
    expect(first.current).toEqual({ text: "error", value: "error" })
    expect(
      customVariable({ name: "level", values: ["error", "warn"], includeAll: true, current: "warn" }).current,
    ).toEqual({ text: "warn", value: "warn" })
  })
})

describe("logsql", () => {
  test("maps the four query kinds to the plugin's queryType", () => {
    const VL = victorialogs("victorialogs")
    expect(logsql(VL, '{a="b"}').json).toMatchObject({ queryType: "instant", expr: '{a="b"}', refId: "A" })
    expect(logsql(VL, "x | stats by (_time:1m) count() rows", { type: "range", ref: "B" }).json).toMatchObject({
      queryType: "statsRange",
      refId: "B",
    })
    expect(logsql(VL, "x", { type: "hits", fields: ["ns"], step: "1m" }).json).toMatchObject({
      queryType: "hits",
      fields: ["ns"],
      step: "1m",
    })
    expect(logsql(VL, "x", { type: "instant" }).json.queryType).toBe("stats")
    expect(logsql(VL, "x", { limit: 500 }).json.maxLines).toBe(500)
  })

  test("a variable on VictoriaLogs keeps the plugin's query object", () => {
    const VL = victorialogs("victorialogs")
    const v = queryVariable({ name: "ns", datasource: VL, query: fieldValues("kubernetes.pod_namespace") })
    expect(v.query).toEqual({ type: "fieldValue", field: "kubernetes.pod_namespace", query: "*" })
    expect(typeof v.definition).toBe("string")
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

describe("logql", () => {
  test("a Loki target carries the query type and the optional legend, line limit and step", () => {
    const LOKI = loki("loki")
    expect(logql(LOKI, '{namespace="app"}', { limit: 500 }).json).toEqual({
      refId: "A",
      datasource: { type: "loki", uid: "loki" },
      expr: '{namespace="app"}',
      queryType: "range",
      editorMode: "code",
      maxLines: 500,
    })
    expect(
      logql(LOKI, 'sum(count_over_time({a="b"}[1m]))', { type: "instant", legend: "{{pod}}", step: "1m", ref: "B" })
        .json,
    ).toMatchObject({
      refId: "B",
      queryType: "instant",
      legendFormat: "{{pod}}",
      step: "1m",
    })
  })
  test("a variable on Loki is the plugin's label-values query object", () => {
    const v = queryVariable({ name: "ns", datasource: loki("loki"), query: labelValues("namespace") })
    expect(v.query).toEqual({ refId: "LokiVariableQueryEditor-VariableQuery", type: 1, label: "namespace" })
    expect(labelValues("pod", '{namespace="$ns"}')).toMatchObject({ label: "pod", stream: '{namespace="$ns"}' })
  })
})
