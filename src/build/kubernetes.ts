// A ConfigMap per dashboard for Grafana's dashboard sidecar: label `grafana_dashboard: "1"` makes the
// sidecar pick it up, the annotation `grafana_folder` says which folder it lands in.

export type Kubernetes = {
  namespace: string
  folder: string
  /** ConfigMap name per file; default `dashboard-<file without .json>`. */
  name?: (file: string) => string
}

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
const yamlString = (s: string) => JSON.stringify(s)

export const configMapName = (file: string, k8s: Kubernetes): string => {
  const name = k8s.name ? k8s.name(file) : `dashboard-${file.replace(/\.json$/, "")}`
  if (!DNS_LABEL.test(name) || name.length > 253) throw new Error(`${name} is not a valid ConfigMap name (DNS label)`)
  if (!DNS_LABEL.test(k8s.namespace)) throw new Error(`${k8s.namespace} is not a valid namespace`)
  return name
}

export function configMap(file: string, json: string, k8s: Kubernetes): string {
  const name = configMapName(file, k8s)
  const body = json
    .trimEnd()
    .split("\n")
    .map((line) => (line ? `    ${line}` : ""))
    .join("\n")
  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${yamlString(name)}
  namespace: ${yamlString(k8s.namespace)}
  labels:
    grafana_dashboard: "1"
  annotations:
    grafana_folder: ${yamlString(k8s.folder)}
data:
  ${yamlString(file)}: |
${body}
`
}
