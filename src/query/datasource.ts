// A datasource is named by type and uid, exactly as Grafana references it in a panel. Every target
// carries its own datasource, so one dashboard may mix sources; one panel may not.
import type { Json } from "../core/node.ts"

export type Datasource = { readonly type: string; readonly uid: string }
/** What a panel sends to Grafana for one query, and the datasource it belongs to. */
export type Target = { datasource: Datasource; json: Record<string, Json> }

/** A Prometheus-compatible datasource (Prometheus, VictoriaMetrics, Mimir, …) by uid. */
export const prometheus = (uid: string): Datasource => ({ type: "prometheus", uid })
/** A PostgreSQL datasource by uid. */
export const postgres = (uid: string): Datasource => ({ type: "grafana-postgresql-datasource", uid })
/** A Loki datasource by uid. */
export const loki = (uid: string): Datasource => ({ type: "loki", uid })
/** A VictoriaLogs datasource (plugin `victoriametrics-logs-datasource`) by uid. */
export const victorialogs = (uid: string): Datasource => ({ type: "victoriametrics-logs-datasource", uid })
