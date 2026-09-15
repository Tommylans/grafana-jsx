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
  Children stack top to bottom; **`<Row>`** puts panels side by side on their own `w`. The grid is 24
  wide; a wider row is a build error. `y` and the panel ids follow the reading order, so an id is a
  place rather than a name.
- **Panels** — `<Stat>`, `<Gauge>`, `<BarGauge>`, `<TimeSeries>` (lines or bars, stacked, `step`
  for series that only get a point when something changes, `repeat` per variable), `<BarChart>`,
  `<Histogram>`, `<PieChart>`, `<Heatmap>`, `<StateTimeline>` and `<StatusHistory>` (a lane per
  series, `values` maps a value to a text and a color), `<Logs>`, `<Table>` (`col` for column
  formatting, `sort`, `transformations`), `<Text>` (markdown as children), `<NodeGraph>`, `<Canvas>`.
  Each panel type is one file under `src/panels/` named after the component (`PieChart.tsx`); a new
  panel type is a new file that returns a `PanelNode` through the exported `panel()` helper. `thresholds`, `valueMap`, `byName`
  and `col` are the small shared pieces of field config.
- **Dashboard-level** — `queryVariable`, `customVariable`, `intervalVariable`, `textboxVariable` and
  `datasourceVariable` build the template variables (`ref("name")` is `$name` for a query);
  `promqlAnnotation` marks moments on every time panel; `dashboardsByTag` and `link` fill the header.
- **Queries** — `sql(datasource, text, { format })` for PostgreSQL, `promql(datasource, expr, {
  legend, instant, format })` for Prometheus-compatible sources, `logsql(datasource, expr, { type })`
  for VictoriaLogs (`raw` lines for `<Logs>`, `range`/`hits` for time panels, `fields` to group hits, `fieldValues(field)` as a variable query); `prometheus(uid)`,
  `postgres(uid)` and `victorialogs(uid)` name the sources. A target carries its datasource; one panel has one datasource, mixing is an error.
- **Maps** — `drawMap(groups, cards, lines, bars)` draws a topology in a `<Canvas>`: cards with an
  icon, a status dot, a corner `value` or up to four `metrics` in rows of two, groups per place
  (`groupAround(label, cards)` computes the box), and lines that run straight, as an L or as a Z
  between the cards with the value next to them. Cards that overlap, a value that lands on a card
  and a line through a card it does not join are build errors, not surprises on screen.
- **`<Map>`** — the map as one component: `cards` (a typed list of `CardSpec`), `lines` between them,
  and a `<YStack>`/`<XStack>` tree as children saying what sits next to what (`gap`, `label` makes a
  group, `justify`, `align`). The layout places the cards, the panel height fits the result, and the
  `drawMap` checks run on it. Underneath: `layoutMap`, `placeCards`, `drawMap`.

```tsx
<Map title="" cards={CARDS} lines={LINES} queries={queries} fieldConfig={trafficFieldConfig(10_000_000)} cardWidth={190} gap={100}>
  <YStack gap={120}>
    <XStack label="Network">{[internet, router, core]}</XStack>
    <XStack label="Rack" justify="center">{[node1, node2, node3]}</XStack>
  </YStack>
</Map>
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

Facts that cost an afternoon, kept here so nobody finds them twice: Grafana draws Canvas
`connections` in an SVG above all elements, and no Canvas element can be smaller than 10 px (a
data: URL as icon path is looked up under `/public/build/` and 404s); `$__timeGroup` as well as
`$__timeGroupAlias` append `AS "time"` (Grafana 13), so every branch of a `union` has to yield epoch
seconds; in a JSX attribute `"a\\b"` is literally two backslashes.

## Layout of the repository

| Path | |
| --- | --- |
| `src/jsx.ts` | the `h` factory and the JSX types |
| `src/core/` | nodes, the 24-column grid, rendering a dashboard to JSON |
| `src/dashboard/` | `<Dashboard>`, `<Row>`, variables, annotations, links |
| `src/panels/` | one component per panel type, `fieldConfig.ts` for the shared pieces |
| `src/map/` | `<Map>`, `<XStack>`/`<YStack>`, the layout engine, the router and the drawing |
| `src/query/` | datasources and the `sql`/`promql`/`logsql` targets |
| `src/build/` | `buildDashboards`, ConfigMaps for the Grafana sidecar |
