// Links: in the dashboard header (`dashboardsByTag`, `link`) and on the data itself — a data link is
// what makes a panel a step in a route instead of a dead end, so `linkTo` and `linkToDashboard` build
// the entries a panel or a column keeps under `links`.
import type { JsonObject } from "../core/node.ts"

/** One data link: Grafana shows it on a value, a series or a table cell. */
export type DataLink = { title: string; url: string; targetBlank?: boolean }

export type LinkOptions = {
  /** Carry the current time range along; off by default so a dashboard opens on the range it was designed for. */
  keepTime?: boolean
  /** Carry the current variable values along (a matching variable on the target picks them up). */
  includeVars?: boolean
}

/** A dropdown of every dashboard carrying these tags. */
export const dashboardsByTag = (
  title: string,
  tags: string[],
  { keepTime = false, includeVars = true }: LinkOptions = {},
): JsonObject => ({
  title,
  type: "dashboards",
  tags,
  asDropdown: true,
  includeVars,
  keepTime,
  targetBlank: false,
  icon: "external link",
  tooltip: "",
  url: "",
})

/** A plain link; `keepTime` carries the current range along (the jump from a spike to the logs of that moment). */
export const link = (
  title: string,
  url: string,
  { newTab = true, keepTime = false, includeVars = false }: LinkOptions & { newTab?: boolean } = {},
): JsonObject => ({
  title,
  type: "link",
  url,
  targetBlank: newTab,
  tags: [],
  asDropdown: false,
  includeVars,
  keepTime,
  icon: "external link",
  tooltip: "",
})

// What a data link reads from the point under the cursor: Grafana's own interpolations. They have to
// reach the JSON literally, hence the escaped `\${`: Grafana resolves them, TypeScript must not.
/** The value of one of the series' labels: the node, the pod, the instance the point belongs to. */
export const fieldLabel = (label: string): string => `\${__field.labels.${label}}`
/** The cell's own value, unformatted. */
export const VALUE = `\${__value.raw}`
/** The dashboard's time range as URL parameters (`from=…&to=…`), without a leading separator. */
const TIME_RANGE = `\${__url_time_range}`

export type DataLinkOptions = {
  title: string
  /** Fills the target's template variables by name: `{ node: fieldLabel("node") }`. */
  vars?: Record<string, string>
  newTab?: boolean
  /** Carry the range the reader is looking at along, so the target opens on the same moment. */
  keepTime?: boolean
}

/** A data link to another dashboard by uid: `linkTo("platform-cluster", { title: "Node", vars: { node: fieldLabel("node") } })`
 * on a panel (`links`) or a column (`col(…, { links })`) turns a value into the way there. */
export const linkTo = (
  uid: string,
  { title, vars = {}, newTab = true, keepTime = true }: DataLinkOptions,
): DataLink => {
  const query = Object.entries(vars).map(([name, value]) => `var-${name}=${value}`)
  if (keepTime) query.push(TIME_RANGE)
  return { title, url: query.length ? `/d/${uid}?${query.join("&")}` : `/d/${uid}`, targetBlank: newTab }
}

/** A data link to a URL outside Grafana with the cell's own value appended: the id column of a table
 * that opens that run, that session, that ticket. */
export const linkToValue = (title: string, base: string, path: string): DataLink => ({
  title,
  url: `${base}${path}/${VALUE}`,
  targetBlank: true,
})
