import { describe, expect, test } from "bun:test"
import { metric, prometheus, promql, raw } from "../src/index.ts"

describe("metric builder", () => {
  test("selector, matchers, rate and aggregation read like the PromQL they make", () => {
    expect(metric("up").text).toBe("up")
    expect(metric("up", { job: "node", pod: { re: "api-.*" }, container: { not: "POD" } }).text).toBe(
      'up{job="node",pod=~"api-.*",container!="POD"}',
    )
    expect(metric("container_cpu_usage_seconds_total").where({ node: "node-1" }).rate("5m").sumBy("node").text).toBe(
      'sum by (node) (rate(container_cpu_usage_seconds_total{node="node-1"}[5m]))',
    )
    expect(metric("a").rate().text).toBe("rate(a[$__rate_interval])")
  })

  test("arithmetic with matching, and the bool/or idioms", () => {
    const used = metric("node_memory_MemTotal_bytes").minus(metric("node_memory_MemAvailable_bytes"))
    expect(used.text).toBe("(node_memory_MemTotal_bytes) - (node_memory_MemAvailable_bytes)")
    expect(metric("x").sumBy("node").over(metric("y"), ["node"]).text).toBe(
      "(sum by (node) (x)) / on (node) group_left () (y)",
    )
    expect(metric("kube_node_status_condition", { status: "true" }).sumBy().gtBool(0).orVector(0).text).toBe(
      '((sum(kube_node_status_condition{status="true"})) > bool 0) or vector(0)',
    )
    expect(raw("1").fn("histogram_quantile", "0.9").text).toBe("histogram_quantile(0.9, 1)")
  })

  test("promql takes the builder directly", () => {
    expect(promql(prometheus("p"), metric("up").sumBy("job")).json.expr).toBe("sum by (job) (up)")
  })
})
