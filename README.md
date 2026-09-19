# grafana-jsx

Grafana dashboards as TSX components. Write a dashboard as JSX, render it to the JSON Grafana
reads, ship it as a ConfigMap for the Grafana sidecar, and let `check` fail the moment a committed
file is no longer what its component renders. Bun renders TSX itself: no React, no bundler.

```tsx
import { Dashboard, Row, Stat, TimeSeries, Table, col, h, postgres, sql } from "@devv/grafana"

const DB = postgres("app-db") // the datasource uid as Grafana knows it

export default (
  <Dashboard file="traffic.json" title="Traffic & cost" uid="app-traffic" tags={["app"]}>
    <Row>
      <Stat title="Requests" unit="short" query={sql(DB, "select count(*) from requests where $__timeFilter(ts)", { format: "table" })} />
      <Stat title="Cost" unit="currencyUSD" decimals={0} query={sql(DB, "select sum(cost) from requests where $__timeFilter(ts)", { format: "table" })} />
    </Row>
    <TimeSeries title="Cost per hour, per model" unit="currencyUSD" bars stack interval="1h" queries={[sql(DB, "…")]} />
    <Table title="Most expensive sessions" w={24} queries={[sql(DB, "…", { format: "table" })]} columns={[col("cost", { unit: "currencyUSD", decimals: 2 })]} />
  </Dashboard>
)
```

```ts
// build.ts in your project
import { buildDashboards } from "@devv/grafana"
import traffic from "./traffic.tsx"

const ok = await buildDashboards([traffic], {
  outDir: `${import.meta.dir}/out`,
  check: process.argv.includes("--check"),
  kubernetes: { namespace: "app", folder: "App" }, // omit for JSON only
})
if (!ok) process.exit(1)
```

`bun build.ts` writes `out/traffic.json` and `out/traffic.configmap.yaml`; `bun build.ts --check` is
the gate: it reports every file that differs from its component, and every `.json` in `out/` that no
component claims (add hand-written ones to `keep`).

## What is in the box

- **`<Dashboard>`** — title, uid, tags, time range, refresh, timezone, links, template variables.
  Children stack top to bottom; **`<Row>`** puts panels side by side on their own `w`; **`<Section
  title>`** is a titled header (Grafana's row panel, foldable by the reader) over the rows under it,
  and sections do not nest. The grid is 24 wide; a wider row is a build error. `y` and the panel ids
  follow the reading order, so an id is a place rather than a name.
- **`repeat` and `collapsed`** — `repeat="node"` on a panel or on a `<Section>` is one copy per value
  of that dashboard variable, so a node the autoscaler creates appears by itself; a panel fits as
  many copies per line as its `w` allows, a section repeats everything under it and `$node` in the
  title tells the copies apart. `<Section collapsed>` opens folded — the panels then live inside the
  row panel, which is where Grafana keeps them, and unfolding puts them back where they were laid
  out.
- **Panels** — `<Stat>` (`thresholds` color the number, `background` fills the panel with that color,
  `sparkline` draws the series behind it), `<Gauge>`, `<BarGauge>`, `<TimeSeries>` (lines or bars,
  stacked, `step` for series that only get a point when something changes, `points` for sparse ones,
  `repeat` per variable, `legend="table"` with `legendValues={["last", "max"]}` per series, `thresholds`
  as reference lines in `thresholdStyle` line/dashed/area), `<BarChart>`, `<Histogram>`, `<PieChart>`,
  `<Heatmap>`, `<StateTimeline>` and `<StatusHistory>` (a lane per series, `values` maps a value to a
  text and a color), `<Logs>`, `<Table>` (`col` for column formatting, `sort`, `transformations`),
  `<Text>` (markdown as children), `<NodeGraph>`, `<Canvas>`. Each panel type is one file under
  `src/panels/` named after the component (`PieChart.tsx`); a new panel type is a new file that returns
  a `PanelNode` through the exported `panel()` helper. `thresholds`, `valueMap`, `byName` and `col` are
  the small shared pieces of field config: `col("week", { unit: "percent", cell: "gauge", min: 0, max:
  100, thresholds })` is a bar behind the number, `cell: "background"` or `"text"` color the cell, and
  `values` maps exact values to a text and color (the key `null` is the missing value: `{ null: { color: "transparent" } }` keeps an empty colored cell blank).
  `cell: "sparkline"` draws a whole series inside one cell, which is what `timeSeriesTable` (below)
  puts there; it colors itself, so it is the one cell that needs no thresholds, and it wants
  `rowHeight="md"` or `"lg"` — in a small row the line is a few pixels tall and says nothing.
- **Transformations** — typed, and on every panel rather than only the table: `joinByField(field)`,
  `organize({ exclude, rename, order })`, `sortBy(field, desc)`, `filterByValue(field)` (an outer
  join becomes a left join: only rows where that field has a value stay), `calculateField(alias, { left,
  operator, right })` or `calculateField(alias, { reduce, of })`, and `timeSeriesTable({ A: "mean" })`,
  which turns every series of query `A` into a row — its labels as columns, its shape in the column
  `trend("A")`. One row per node with a mini graph is therefore two lines:

  ```tsx
  <Table title="Nodes" rowHeight="lg" queries={[promql(PROM, cpu, { legend: "{{node}}" })]}
    transformations={[timeSeriesTable({ A: "mean" })]}
    columns={[col(trend("A"), { cell: "sparkline", width: 140 })]} />
  ```
- **Data links** — `links` on any panel (and on a column through `col`) says where a value leads.
  `linkTo(uid, { title, vars })` builds the URL to another dashboard: `vars` fills its template
  variables — `fieldLabel("node")` is the label of the series under the cursor — and the time range
  comes along unless `keepTime` is off, so the target opens on the same moment. `linkToValue(title,
  base, path)` appends the cell's own value to a URL outside Grafana.
- **One color per entity** — `colorsFor(["tijn", "tom"])` hands out `PALETTE` (twelve of Grafana's named
  colors) in order; the same list on every panel keeps an account, a node or a model the same color
  wherever it shows up, which a per-panel palette never does. More names than colors is an error, not
  a thirteenth hue: that panel wants a facet or an "other" bucket.
- **Dashboard-level** — `queryVariable`, `customVariable`, `intervalVariable`, `textboxVariable` and
  `datasourceVariable` build the template variables (`ref("name")` is `$name` for a query);
  `promqlAnnotation` marks moments on every time panel; `dashboardsByTag` and `link` fill the header.
- **Queries** — `sql(datasource, text, { format })` for PostgreSQL, `promql(datasource, expr, {
  legend, instant, format })` for Prometheus-compatible sources, `logsql(datasource, expr, { type })`
  for VictoriaLogs (`raw` lines for `<Logs>`, `range`/`hits` for time panels, `fields` to group hits, `fieldValues(field)` as a variable query),
  `logql(datasource, expr, { type, legend, limit, step })` for Loki (`labelValues(label, stream)` as a variable query); `prometheus(uid)`,
  `postgres(uid)`, `loki(uid)` and `victorialogs(uid)` name the sources. PromQL that dashboards write over and over
  has a small builder: `metric("container_cpu_usage_seconds_total").where({ node: "a" }).rate("5m").sumBy("node")`,
  arithmetic with `.over(other, ["node"])`, `.gtBool(0).orVector(0)`; `promql()` takes it directly and
  `raw("…")` is the escape hatch. A target carries its datasource; one panel has one datasource, mixing is an error.
- **Maps** — `drawMap(groups, cards, lines, bars)` draws a topology in a `<Canvas>`: cards with an
  icon, a status dot, a corner `value` or up to four `metrics` in rows of two, groups per place
  (`groupAround(label, cards)` computes the box), and lines that run straight, as an L or as a Z
  between the cards with the value next to them. A line is one Canvas connection with its corners
  as `vertices` (rounded by `cornerRadius`), dashed and flowing from source to target unless
  `flow` is off; its color and width follow the series. Cards that overlap, a value that lands on
  a card and a line through a card it does not join are build errors, not surprises on screen.
- **`<CardMap>`** — the map as one component: `cards` (a typed list of `CardSpec`), `lines` between them,
  and a `<YStack>`/`<XStack>` tree as children saying what sits next to what (`gap`, `label` makes a
  group, `justify`, `align`; `<Spacer size>` is empty room along the axis, to push a card right above
  the one it is wired to). The layout places the cards, the panel height fits the result, and the
  `drawMap` checks run on it; `transparent` drops the panel's own frame so the groups do the framing,
  and a map without a title gets the 40 px the title bar would have taken. Underneath: `layoutMap`,
  `placeCards`, `drawMap`.

```tsx
<CardMap title="" cards={CARDS} lines={LINES} queries={queries} fieldConfig={trafficFieldConfig(10_000_000)} cardWidth={190} gap={100}>
  <YStack gap={120}>
    <XStack label="Network">{[internet, router, core]}</XStack>
    <XStack label="Rack" justify="center">{[node1, node2, node3]}</XStack>
  </YStack>
</CardMap>
``` Card names are a union type, so a line to an unknown card
  fails at typecheck time. `trafficFieldConfig(max)` colors lines by rate and dots by `up:*`.
- **Build** — `buildDashboards(dashboards, { outDir, check, kubernetes, keep })`. With `kubernetes`,
  every dashboard also gets a ConfigMap (label `grafana_dashboard: "1"`, folder as annotation
  `grafana_folder`); names are validated as DNS labels. Duplicate files or uids are an error.

## Using it in a project

```sh
bun add github:Tommylans/grafana-jsx#v0.2.0
```

A new version is a new tag. Your project keeps `dashboards/*.tsx`, a `build.ts` as above, the
rendered files in git, and ships the ConfigMaps in its own namespace with its own deploy. Grafana's
dashboard sidecar then needs to watch that namespace (`sidecar.dashboards.searchNamespace` in the
kube-prometheus-stack / VictoriaMetrics chart, plus a Role on ConfigMaps for Grafana's
ServiceAccount there); the datasource — a read role on your database, a datasource in Grafana with
its password — stays your own business.

`tsconfig.json` needs:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "types": ["bun"],
    "strict": true
  }
}
```

and every `.tsx` starts with `import { h } from "@devv/grafana"` (the factory tsconfig names).

## Developing

```sh
bun install
bun run check     # biome, typecheck, tests — also the workflow on every push
bun run format    # biome --write
```

Facts that cost an afternoon, kept here so nobody finds them twice (measured in Grafana 13.1):
Canvas `connections` draw in an SVG above all elements, so a value can never sit on a line; a
connection's `vertices` are canvas pixels once `sourceOriginal` is (0,0) and `targetOriginal` (1,1);
`direction` has to be a dimension object, a bare `"none"` grows an arrowhead; `panZoom` does nothing
without the feature toggle `canvasPanelPanZoom`; no Canvas element can be smaller than 10 px, text
neither wraps nor scales, and a data: URL as icon path is looked up under `/public/build/` and 404s
(raw `<svg xmlns=…>` markup is inlined instead); `$__timeGroup` as well as
`$__timeGroupAlias` append `AS "time"` (Grafana 13), so every branch of a `union` has to yield epoch
seconds; in a JSX attribute `"a\\b"` is literally two backslashes.

## Layout of the repository

| Path | |
| --- | --- |
| `src/jsx.ts` | the `h` factory and the JSX types |
| `src/core/` | nodes, the 24-column grid, rendering a dashboard to JSON |
| `src/dashboard/` | `<Dashboard>`, `<Row>`, variables, annotations, links |
| `src/panels/` | one component per panel type, `fieldConfig.ts` for the shared pieces |
| `src/map/` | `<CardMap>`, `<XStack>`/`<YStack>`, the layout engine, the router and the drawing |
| `src/query/` | datasources and the `sql`/`promql`/`logsql` targets |
| `src/build/` | `buildDashboards`, ConfigMaps for the Grafana sidecar |
