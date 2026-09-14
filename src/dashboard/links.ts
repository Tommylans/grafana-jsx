// Links in the dashboard header: to other dashboards by tag, or to any URL.
import type { JsonObject } from "../core/node.ts"

/** A dropdown of every dashboard carrying these tags, keeping the time range and variables. */
export const dashboardsByTag = (title: string, tags: string[]): JsonObject => ({
  title,
  type: "dashboards",
  tags,
  asDropdown: true,
  includeVars: true,
  keepTime: true,
  targetBlank: false,
  icon: "external link",
  tooltip: "",
  url: "",
})

/** A plain link. */
export const link = (title: string, url: string, { newTab = true }: { newTab?: boolean } = {}): JsonObject => ({
  title,
  type: "link",
  url,
  targetBlank: newTab,
  tags: [],
  asDropdown: false,
  includeVars: false,
  keepTime: false,
  icon: "external link",
  tooltip: "",
})
