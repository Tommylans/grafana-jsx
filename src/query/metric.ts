// A small builder for PromQL, for the expressions dashboards write over and over: a metric with
// label matchers, a rate over a window, an aggregation by labels, and arithmetic between two of
// them. It builds a string; anything it cannot say is written as PromQL text, as before.
type Matchers = Record<string, string | { re: string } | { not: string } | { notRe: string }>

const matcher = (label: string, value: Matchers[string]): string => {
  if (typeof value === "string") return `${label}="${value}"`
  if ("re" in value) return `${label}=~"${value.re}"`
  if ("not" in value) return `${label}!="${value.not}"`
  return `${label}!~"${value.notRe}"`
}

/** A PromQL expression that can grow: `metric("up").where({ job: "node" }).rate("5m").sumBy("node")`. */
export class Expr {
  constructor(readonly text: string) {}
  toString(): string {
    return this.text
  }
  /** `sum by (labels) (expr)`; without labels a plain `sum(expr)`. */
  sumBy(...labels: string[]): Expr {
    return this.agg("sum", labels)
  }
  maxBy(...labels: string[]): Expr {
    return this.agg("max", labels)
  }
  countBy(...labels: string[]): Expr {
    return this.agg("count", labels)
  }
  avgBy(...labels: string[]): Expr {
    return this.agg("avg", labels)
  }
  private agg(fn: string, labels: string[]): Expr {
    return new Expr(labels.length ? `${fn} by (${labels.join(", ")}) (${this.text})` : `${fn}(${this.text})`)
  }
  plus(other: Expr | number): Expr {
    return this.op("+", other)
  }
  minus(other: Expr | number): Expr {
    return this.op("-", other)
  }
  times(other: Expr | number): Expr {
    return this.op("*", other)
  }
  /** Division; `on` names the labels both sides are matched on (`/ on (node) …`). */
  over(other: Expr | number, on?: string[]): Expr {
    return this.op("/", other, on)
  }
  private op(sign: string, other: Expr | number, on?: string[]): Expr {
    const rhs = typeof other === "number" ? String(other) : other.text
    const match = on ? ` on (${on.join(", ")}) group_left ()` : ""
    return new Expr(`(${this.text}) ${sign}${match} (${rhs})`)
  }
  /** Compare and keep the value: `> bool 0`. */
  gtBool(n: number): Expr {
    return new Expr(`(${this.text}) > bool ${n}`)
  }
  /** `expr or vector(n)`: a value when the series is absent. */
  orVector(n: number): Expr {
    return new Expr(`(${this.text}) or vector(${n})`)
  }
  /** Wraps the text in any PromQL function: `.fn("histogram_quantile", "0.9")`. */
  fn(name: string, ...leading: string[]): Expr {
    return new Expr(`${name}(${[...leading, this.text].join(", ")})`)
  }
}

/** A metric with matchers, still a range-less selector until `.rate()`/`.increase()` names the window. */
export class Selector extends Expr {
  constructor(
    readonly name: string,
    readonly matchers: Matchers = {},
  ) {
    super(selector(name, matchers))
  }
  /** More label matchers; a later `where` adds to the earlier ones. */
  where(more: Matchers): Selector {
    return new Selector(this.name, { ...this.matchers, ...more })
  }
  /** `rate(metric{…}[window])`; `window` is a PromQL duration or Grafana's `$__rate_interval`. */
  rate(window = "$__rate_interval"): Expr {
    return new Expr(`rate(${this.text}[${window}])`)
  }
  increase(window: string): Expr {
    return new Expr(`increase(${this.text}[${window}])`)
  }
  irate(window = "$__rate_interval"): Expr {
    return new Expr(`irate(${this.text}[${window}])`)
  }
}

const selector = (name: string, matchers: Matchers): string => {
  const parts = Object.entries(matchers).map(([label, value]) => matcher(label, value))
  return parts.length ? `${name}{${parts.join(",")}}` : name
}

/** The start of a PromQL expression: `metric("container_cpu_usage_seconds_total")`. */
export const metric = (name: string, matchers: Matchers = {}): Selector => new Selector(name, matchers)
/** Any PromQL text as an `Expr`, for what the builder does not say. */
export const raw = (text: string): Expr => new Expr(text)
