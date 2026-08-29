export type Status = 'healthy' | 'degraded' | 'warning' | 'critical'
export type AgentRole = 'NOC Agent' | 'SRE Agent' | 'Human Operator'

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
export const timeline = [['14:29', 'Payment API deployment completed', 'deploy'], ['14:31', 'Request rate increased', 'info'], ['14:32', 'API latency begins increasing', 'warn'], ['14:33', 'Database connections increase', 'warn'], ['14:34', 'HTTP 5xx errors increase', 'error'], ['14:35', 'Incident created', 'incident']]
export const logs = [['14:32:01', 'INFO', 'payment request received', 'request_id=req_8f21 route=/v1/charge'], ['14:32:03', 'WARN', 'database connection pool utilization', 'utilization=87% pool=payments'], ['14:33:02', 'ERROR', 'database connection timeout', 'waited_ms=3000 pool=payments'], ['14:33:18', 'WARN', 'retrying transaction', 'attempt=2 request_id=req_8f21'], ['14:34:18', 'ERROR', 'payment request failed', 'status=503 error=connection_timeout'], ['14:34:42', 'ERROR', 'payment request failed', 'status=500 error=upstream_unavailable']]
export const metrics = { service: 'payment-api', window: 'last_60m', latency_ms: [120, 140, 180, 420, 980, 2400], request_rate: [1120, 1240, 1380, 1610, 1790, 1840], error_rate: [0.4, 0.6, 1.2, 4.8, 16.2, 23.4], cpu_percent: [48, 55, 64, 76, 87, 91], memory_percent: [62, 65, 69, 73, 76, 78], db_connections: [42, 48, 61, 74, 87, 93] }
export const deployments = [{ version: 'v2.7.3', service: 'payment-api', time: '14:29', status: 'successful', actor: 'release-bot', change: 'Connection pooling configuration' }, { version: 'v2.7.2', service: 'payment-api', time: 'yesterday 18:02', status: 'successful', actor: 'release-bot', change: 'PCI logging updates' }]

export const tools = [
  { name: 'get_active_incidents', category: 'OBSERVATION', description: 'List active production incidents requiring operator attention.', input: 'none', output: 'Structured JSON' },
  { name: 'get_incident', category: 'OBSERVATION', description: 'Retrieve the current state of an incident.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'get_incident_evidence', category: 'OBSERVATION', description: 'Return correlated metrics, logs, timeline, and deployment evidence for an incident.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'get_service_health', category: 'OBSERVATION', description: 'Retrieve current health signals for a service.', input: '{ service_id }', output: 'Structured JSON' },
  { name: 'get_dependencies', category: 'OBSERVATION', description: 'Retrieve the current service dependency graph.', input: '{ service_id }', output: 'Structured JSON' },
  { name: 'get_deployment_history', category: 'OBSERVATION', description: 'Retrieve deployment history for a service.', input: '{ service_id }', output: 'Structured JSON' },
  { name: 'get_metrics', category: 'OBSERVATION', description: 'Retrieve current metrics for a service.', input: '{ service_id }', output: 'Structured JSON' },
  { name: 'get_logs', category: 'OBSERVATION', description: 'Retrieve structured logs for a service.', input: '{ service_id }', output: 'Structured JSON' },
  { name: 'get_incident_timeline', category: 'INVESTIGATION', description: 'Retrieve the incident timeline.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'compare_metrics', category: 'INVESTIGATION', description: 'Compare incident metrics against the prior healthy baseline.', input: '{ service_id, incident_id }', output: 'Structured JSON' },
  { name: 'correlate_events', category: 'INVESTIGATION', description: 'Correlate deployments, telemetry, and incident events.', input: '{ service_id, incident_id }', output: 'Structured JSON' },
  { name: 'run_diagnostic', category: 'INVESTIGATION', description: 'Run an evidence-based diagnostic across incident telemetry.', input: '{ service_id, incident_id }', output: 'Structured JSON' },
  { name: 'create_investigation_finding', category: 'INVESTIGATION', description: 'Store a finding for operator review.', input: '{ incident_id, finding }', output: 'Structured JSON' },
  { name: 'propose_remediation', category: 'RECOMMENDATION', description: 'Generate a safe, human-reviewable mitigation recommendation.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'approve_remediation', category: 'HUMAN CONTROL', description: 'Record explicit operator approval for the simulated rollback.', input: '{ incident_id, action }', output: 'Structured JSON' },
  { name: 'execute_remediation', category: 'ACTION', description: 'Execute the approved, non-destructive simulated rollback.', input: '{ incident_id, action, approved }', output: 'Structured JSON' },
  { name: 'verify_remediation', category: 'VERIFICATION', description: 'Verify service recovery after remediation.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'verify_incident', category: 'VERIFICATION', description: 'Verify the current incident state.', input: '{ incident_id }', output: 'Structured JSON' },
  { name: 'get_agent_activity', category: 'OBSERVATION', description: 'Read the live audit trail of tool invocations.', input: 'none', output: 'Structured JSON' },
]

export type ActivityEntry = { time: string; role: AgentRole; name: string; args: string; success: boolean; summary: string }
let activity: ActivityEntry[] = []
let approved = false
let remediationExecuted = false
const findings: string[] = []
const listeners = new Set<() => void>()
export const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) }
export const getActivity = () => activity
export const getWorkflowState = () => ({ approved, remediationExecuted })
const notify = () => listeners.forEach(listener => listener())
const roleFor = (name: string): AgentRole => ['get_active_incidents', 'get_incident', 'get_service_health'].includes(name) ? 'NOC Agent' : ['approve_remediation'].includes(name) ? 'Human Operator' : 'SRE Agent'
const summarize = (name: string, result: Record<string, unknown>) => name === 'get_service_health' ? `${String(result.name)} is ${String(result.status)}` : name === 'execute_remediation' ? String(result.success ? 'Rollback executed' : result.reason) : name === 'verify_remediation' || name === 'verify_incident' ? `Incident ${String(result.status || result.incident_status)}` : name === 'create_investigation_finding' ? 'Finding stored for operator review' : 'Structured result returned'
const record = (name: string, args: Record<string, unknown>, result: Record<string, unknown>) => { const failed = Boolean(result.error || result.success === false); activity = [{ time: new Date().toLocaleTimeString('en-US', { hour12: false }), role: roleFor(name), name, args: Object.values(args).join(' ') || '—', success: !failed, summary: summarize(name, result) }, ...activity].slice(0, 50); notify() }

export function getToolResult(name: string, args: Record<string, unknown> = {}) {
  const incidentId = String(args.incident_id || 'INC-1042')
  const serviceId = String(args.service_id || 'payment-api')
  const svc = services.find(s => s.id === serviceId)
  let result: Record<string, unknown>
  if (name === 'get_active_incidents') result = remediationExecuted ? { incidents: [] } : { incidents: [incident] }
  else if (name === 'get_agent_activity') result = { activity }
  else if (name === 'get_incident') result = incidentId === incident.id ? { incident_id: incident.id, severity: incident.severity, status: remediationExecuted ? 'resolved' : incident.status.toLowerCase(), service: 'Payment API', title: incident.title } : { error: `Unknown incident: ${incidentId}` }
  else if (name === 'get_incident_evidence') result = incidentId === incident.id ? { incident, metrics, logs, timeline, deployment: deployments[0], findings } : { error: `Unknown incident: ${incidentId}` }
  else if (name === 'get_services') result = { services }
  else if (name === 'get_service_health') result = svc ? { service: svc.id, status: svc.status, latency_ms: svc.latency, error_rate: svc.errorRate, request_rate: svc.requestRate, dependencies: svc.dependencies } : { error: `Unknown service: ${serviceId}`, valid_service_ids: services.map(s => s.id) }
  else if (name === 'get_metrics') result = remediationExecuted ? { ...metrics, latency_ms: [...metrics.latency_ms.slice(0, -1), 142], error_rate: [...metrics.error_rate.slice(0, -1), 0.6], db_connections: [...metrics.db_connections.slice(0, -1), 48] } : metrics
  else if (name === 'compare_metrics') result = { service: serviceId, baseline: { latency_ms: 142, error_rate: 0.6 }, incident_peak: { latency_ms: 2400, error_rate: 23.4 }, delta: { latency_ms: 2258, error_rate: 22.8 } }
  else if (name === 'get_logs') result = { service: serviceId, logs }
  else if (name === 'get_dependencies') result = { root: 'internet', graph: { internet: ['api-gateway'], 'api-gateway': ['payment-api'], 'payment-api': ['redis', 'postgresql'] }, health: Object.fromEntries(services.map(s => [s.id, s.status])) }
  else if (name === 'get_deployment_history') result = { service: serviceId, deployments }
  else if (name === 'get_incident_timeline') result = { incident_id: incident.id, timeline }
  else if (name === 'correlate_events' || name === 'run_diagnostic') result = { finding: 'Most likely trigger is a regression introduced by payment-api v2.7.3 affecting PostgreSQL interaction.', confidence: 0.94, evidence: ['v2.7.3 deployed at 14:29 UTC', 'latency rose at 14:32 UTC', 'database connections reached 93%', 'HTTP 5xx rose to 23.4% by 14:34 UTC'], next_action: 'Create a finding and propose rollback for human approval.' }
  else if (name === 'create_investigation_finding') { const finding = String(args.finding || '').trim(); result = finding ? { incident_id: incidentId, finding, stored: true, findings: [...findings, finding] } : { error: 'finding is required' }; if (finding) findings.push(finding) }
  else if (name === 'propose_remediation') result = { incident_id: incidentId, recommendation: 'Rollback payment-api from v2.7.3 to the previous known-good version.', requires_human_approval: true, approved }
  else if (name === 'approve_remediation') { approved = incidentId === incident.id && String(args.action || '') === 'rollback_payment_api'; result = approved ? { success: true, incident_id: incidentId, approved: true, action: 'rollback_payment_api' } : { success: false, error: 'Valid incident and rollback action are required.' } }
  else if (name === 'execute_remediation') { if (!approved || args.approved !== true || String(args.action || '') !== 'rollback_payment_api') result = { success: false, blocked: true, reason: 'Human approval required' }; else { remediationExecuted = true; const payment = services.find(s => s.id === 'payment-api')!; payment.status = 'healthy'; payment.latency = 142; payment.errorRate = 0.6; const db = services.find(s => s.id === 'postgresql')!; db.status = 'healthy'; db.errorRate = 0.4; result = { success: true, action: 'rollback', service: 'Payment API', status: 'healthy', incident_id: incidentId }; } }
  else if (name === 'verify_remediation' || name === 'verify_incident') result = remediationExecuted ? { success: true, incident_id: incidentId, status: 'resolved', payment_api: 'healthy', postgresql: 'healthy', error_rate: 0.6, latency_ms: 142 } : { success: false, incident_id: incidentId, status: 'investigating', reason: 'Remediation has not been executed.' }
  else result = { error: `Unknown tool: ${name}` }
  record(name, args, result)
  return result
}
export const executeTool = (name: string, args: Record<string, unknown>) => getToolResult(name, args)
export const statusStyles: Record<Status, string> = { healthy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', degraded: 'text-amber-300 bg-amber-300/10 border-amber-300/20', warning: 'text-orange-300 bg-orange-300/10 border-orange-300/20', critical: 'text-red-400 bg-red-400/10 border-red-400/20' }
export const statusDot: Record<Status, string> = { healthy: 'bg-emerald-400', degraded: 'bg-amber-300', warning: 'bg-orange-300', critical: 'bg-red-400' }
export type Tool = (typeof tools)[number]
const commonProperties = { service_id: { type: 'string' }, incident_id: { type: 'string' }, action: { type: 'string', enum: ['rollback_payment_api'] }, approved: { type: 'boolean' }, finding: { type: 'string' } }
export const toolDefinitions = tools.map(t => ({ name: t.name, title: t.name.replaceAll('_', ' '), description: t.description, inputSchema: { type: 'object', properties: t.input === 'none' ? {} : commonProperties, required: t.input === 'none' ? [] : t.name === 'create_investigation_finding' ? ['incident_id', 'finding'] : t.name === 'execute_remediation' ? ['incident_id', 'action', 'approved'] : t.name === 'approve_remediation' ? ['incident_id', 'action'] : t.name === 'get_incident' || t.name.includes('incident') || t.name.includes('remediation') || t.name === 'propose_remediation' ? ['incident_id'] : [], additionalProperties: false } }))
