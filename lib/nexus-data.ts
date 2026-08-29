export type Status = 'healthy' | 'degraded' | 'warning' | 'critical'

export const services = [
  { id: 'api-gateway', name: 'API Gateway', status: 'healthy' as Status, latency: 42, errorRate: 0.12, requestRate: 8420, cpu: 38, memory: 54, dependencies: ['network', 'authentication', 'payment-api', 'order-service'], events: ['09:42 route cache refreshed', '08:16 TLS certificate renewed'], deployment: 'v4.18.2 · 08:12' },
  { id: 'authentication', name: 'Authentication Service', status: 'healthy' as Status, latency: 86, errorRate: 0.08, requestRate: 3210, cpu: 44, memory: 61, dependencies: ['postgresql', 'redis'], events: ['09:12 token signing keys rotated'], deployment: 'v3.12.0 · yesterday' },
  { id: 'payment-api', name: 'Payment API', status: 'degraded' as Status, latency: 2400, errorRate: 23.4, requestRate: 1840, cpu: 91, memory: 78, dependencies: ['postgresql', 'redis'], events: ['14:34 5xx rate crossed P1 threshold', '14:29 deployment completed'], deployment: 'v2.7.3 · 14:29' },
  { id: 'order-service', name: 'Order Service', status: 'healthy' as Status, latency: 120, errorRate: 0.42, requestRate: 1290, cpu: 52, memory: 63, dependencies: ['postgresql', 'payment-api'], events: ['13:05 queue depth normalized'], deployment: 'v8.4.1 · 11:45' },
  { id: 'postgresql', name: 'PostgreSQL', status: 'warning' as Status, latency: 18, errorRate: 1.8, requestRate: 11800, cpu: 74, memory: 82, dependencies: ['network'], events: ['14:33 connection pool at 93%', '14:30 read replica lag 1.8s'], deployment: '15.6 · 4 days ago' },
  { id: 'redis', name: 'Redis', status: 'healthy' as Status, latency: 3, errorRate: 0.02, requestRate: 24500, cpu: 29, memory: 68, dependencies: ['network'], events: ['12:00 snapshot completed'], deployment: '7.2.4 · 6 days ago' },
  { id: 'message-queue', name: 'Message Queue', status: 'healthy' as Status, latency: 12, errorRate: 0.14, requestRate: 6400, cpu: 35, memory: 48, dependencies: ['network'], events: ['10:33 consumer rebalance completed'], deployment: '3.9.0 · Monday' },
  { id: 'network', name: 'Network', status: 'healthy' as Status, latency: 8, errorRate: 0.01, requestRate: 42000, cpu: 21, memory: 32, dependencies: [], events: ['11:02 edge health checks nominal'], deployment: 'edge · managed' },
  { id: 'monitoring', name: 'Monitoring Service', status: 'healthy' as Status, latency: 64, errorRate: 0.05, requestRate: 890, cpu: 28, memory: 47, dependencies: ['postgresql', 'message-queue'], events: ['14:35 incident INC-1042 opened'], deployment: 'v6.2.0 · 09:01' },
]

export const incident = { id: 'INC-1042', title: 'Payment API degradation', severity: 'P1', status: 'Investigating', service: 'payment-api', started: '14:35', symptoms: ['Increased latency', 'Elevated HTTP 5xx rate', 'High database connection utilization', 'Increased traffic', 'Recent deployment'] }

export const timeline = [
  ['14:29', 'Payment API deployment completed', 'deploy'], ['14:31', 'Request rate increased', 'info'], ['14:32', 'API latency begins increasing', 'warn'], ['14:33', 'Database connections increase', 'warn'], ['14:34', 'HTTP 5xx errors increase', 'error'], ['14:35', 'Incident created', 'incident']
]

export const logs = [
  ['14:32:01', 'INFO', 'payment request received', 'request_id=req_8f21 route=/v1/charge'],
  ['14:32:03', 'WARN', 'database connection pool utilization', 'utilization=87% pool=payments'],
  ['14:33:02', 'ERROR', 'database connection timeout', 'waited_ms=3000 pool=payments'],
  ['14:33:18', 'WARN', 'retrying transaction', 'attempt=2 request_id=req_8f21'],
  ['14:34:18', 'ERROR', 'payment request failed', 'status=503 error=connection_timeout'],
  ['14:34:42', 'ERROR', 'payment request failed', 'status=500 error=upstream_unavailable'],
]

export const metrics = { service: 'payment-api', window: 'last_60m', latency_ms: [120, 140, 180, 420, 980, 2400], request_rate: [1120, 1240, 1380, 1610, 1790, 1840], error_rate: [0.4, 0.6, 1.2, 4.8, 16.2, 23.4], cpu_percent: [48, 55, 64, 76, 87, 91], memory_percent: [62, 65, 69, 73, 76, 78], db_connections: [42, 48, 61, 74, 87, 93] }

export const deployments = [{ version: 'v2.7.3', service: 'payment-api', time: '14:29', status: 'successful', actor: 'release-bot', change: 'Connection pooling configuration' }, { version: 'v2.7.2', service: 'payment-api', time: 'yesterday 18:02', status: 'successful', actor: 'release-bot', change: 'PCI logging updates' }]

export const tools = [
  { name: 'get_active_incidents', category: 'OBSERVATION', description: 'List active production incidents requiring operator attention.', input: 'none', output: 'Structured JSON' },
  { name: 'get_incident_evidence', category: 'OBSERVATION', description: 'Return correlated metrics, logs, timeline, and deployment evidence for an incident.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'create_investigation_finding', category: 'INVESTIGATION', description: 'Store a human- or agent-authored finding against an incident for operator review.', input: '{ incident_id, finding }', output: 'Structured JSON' },
  { name: 'verify_incident', category: 'VERIFICATION', description: 'Verify the current service and incident state after an action.', input: '{ incident_id }', output: 'Structured JSON' },
  ...['get_services','get_service_health','get_incident','get_metrics','get_logs','get_dependencies','get_deployment_history'].map(name => ({ name, category: 'OBSERVATION', description: `Retrieve structured ${name.replaceAll('_',' ')} from the simulated production environment.`, input: name === 'get_incident' ? '{ incident_id }' : name === 'get_services' ? 'none' : '{ service_id }', output: 'Structured JSON' })),
  ...['run_diagnostic','compare_metrics','get_incident_timeline','correlate_events'].map(name => ({ name, category: 'INVESTIGATION', description: `Run an evidence-based ${name.replaceAll('_',' ')} across incident telemetry.`, input: '{ service_id, incident_id }', output: 'Structured JSON' })),
  { name: 'propose_remediation', category: 'RECOMMENDATION', description: 'Generate a safe, human-reviewable mitigation recommendation for the active incident.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'approve_remediation', category: 'HUMAN CONTROL', description: 'Record explicit operator approval for the proposed simulated rollback.', input: '{ incident_id, action }', output: 'Structured JSON' },
  { name: 'execute_remediation', category: 'ACTION', description: 'Execute the approved, non-destructive simulated rollback and return resulting state.', input: '{ incident_id, action, approved }', output: 'Structured JSON' },
  { name: 'verify_remediation', category: 'VERIFICATION', description: 'Verify the simulated service and incident state after remediation.', input: '{ incident_id }', output: 'Structured JSON' }
  ]

const investigationFindings: Record<string, string[]> = {}
let remediationExecuted = false

export function getToolResult(name: string, args: Record<string, unknown> = {}) {
  const incidentId = String(args.incident_id || 'INC-1042')
  const serviceId = String(args.service_id || args.service || 'payment-api')
  if (name === 'get_active_incidents') return { incidents: [incident] }
  if (name === 'get_incident_evidence') return incidentId === incident.id ? { incident, metrics, logs, timeline, deployment: deployments[0], findings: investigationFindings[incidentId] || [] } : { error: `Unknown incident: ${incidentId}`, valid_incident_ids: [incident.id] }
  if (name === 'create_investigation_finding') { const finding = String(args.finding || '').trim(); if (!finding) return { error: 'finding is required' }; investigationFindings[incidentId] = [...(investigationFindings[incidentId] || []), finding]; return { incident_id: incidentId, finding, stored: true, findings: investigationFindings[incidentId] } }
  if (name === 'verify_incident') return remediationExecuted ? { incident_id: incidentId, verified: true, service_status: 'healthy', error_rate: 0.6, latency_ms: 142, incident_status: 'mitigated', note: 'Simulated rollback verified.' } : { incident_id: incidentId, verified: true, service_status: 'degraded', incident_status: 'Investigating', note: 'No remediation has been executed.' }
  const svc = services.find(s => s.id === serviceId)
  if (name === 'get_services') return { services }
  if (name === 'get_service_health') return svc || { error: `Unknown service: ${serviceId}`, valid_service_ids: services.map(s => s.id) }
  if (name === 'get_incident') return incident
  if (name === 'get_metrics' || name === 'compare_metrics') return metrics
  if (name === 'get_logs') return { service: serviceId, logs }
  if (name === 'get_dependencies') return { root: 'internet', graph: { internet: ['api-gateway'], 'api-gateway': ['payment-api'], 'payment-api': ['redis','postgresql'] } }
  if (name === 'get_deployment_history') return { service: serviceId, deployments }
  if (name === 'get_incident_timeline') return { incident_id: 'INC-1042', timeline }
  if (name === 'correlate_events' || name === 'run_diagnostic') return { finding: 'Likely connection pool saturation introduced by v2.7.3 under increased traffic.', confidence: 0.94, evidence: ['latency rose 3 minutes after deployment', 'database connections reached 93%', '5xx errors correlate with connection timeouts'], next_action: 'Review connection pooling change and roll back if approved by the incident commander.' }
  if (name === 'propose_remediation') return { incident_id: 'INC-1042', recommendation: 'Rollback payment-api v2.7.3', reason: 'Connection pooling configuration correlates with latency, 5xx errors, and 93% database connection utilization.', requires_human_approval: true, safe_action: 'rollback_payment_api' }
  if (name === 'approve_remediation') return { incident_id: 'INC-1042', approved: true, approved_by: 'operator', action: String(args.action || 'rollback_payment_api'), note: 'Human approval recorded; execution is now permitted.' }
  if (name === 'execute_remediation') { if (args.approved !== true || String(args.action || '') !== 'rollback_payment_api') return { error: 'Human approval is required before executing the supported remediation.', requires_approval: true, valid_action: 'rollback_payment_api' }; remediationExecuted = true; return { incident_id: 'INC-1042', action: 'rollback_payment_api', executed: true, result: 'payment-api v2.7.3 rollback simulated', state: 'mitigating' } }
  if (name === 'verify_remediation') return { incident_id: 'INC-1042', verified: true, service_status: 'healthy', error_rate: 0.6, latency_ms: 142, incident_status: 'mitigated', evidence: '5xx rate and latency returned to normal after simulated rollback.' }
  return { error: `Unknown tool: ${name}` }
}

export const statusStyles: Record<Status, string> = { healthy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', degraded: 'text-amber-300 bg-amber-300/10 border-amber-300/20', warning: 'text-orange-300 bg-orange-300/10 border-orange-300/20', critical: 'text-red-400 bg-red-400/10 border-red-400/20' }
export const statusDot: Record<Status, string> = { healthy: 'bg-emerald-400', degraded: 'bg-amber-300', warning: 'bg-orange-300', critical: 'bg-red-400' }
export type Tool = (typeof tools)[number]

export const toolDefinitions = tools.map(t => { const properties = t.input === 'none' ? {} : { service_id: { type: 'string', description: 'Service identifier, for example payment-api' }, incident_id: { type: 'string', description: 'Incident identifier, for example INC-1042' }, action: { type: 'string', description: 'Approved action, must be rollback_payment_api' }, approved: { type: 'boolean', description: 'Must be true after human approval' }, finding: { type: 'string', description: 'Finding to store for operator review' } }; const required = t.name === 'get_active_incidents' ? [] : t.name === 'get_incident' || t.name === 'get_incident_evidence' || t.name === 'verify_incident' || t.name === 'propose_remediation' ? ['incident_id'] : t.name === 'create_investigation_finding' ? ['incident_id', 'finding'] : t.name === 'execute_remediation' ? ['incident_id', 'action', 'approved'] : []; return { name: t.name, title: t.name.replaceAll('_', ' '), description: t.description, inputSchema: { type: 'object', properties, required, additionalProperties: false } } })
export const executeTool = (name: string, args: Record<string, unknown>) => getToolResult(name, args)
