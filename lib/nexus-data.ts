import { invokeTool } from './data-access';
import { Status, Tool } from './types';
import { getActivity as getAgentActivity, subscribe, recordActivity } from './activity-store';

let toolExecutor: ((name: string, args: Record<string, unknown>) => Promise<any>) | null = null;

export const setToolExecutor = (executor: (name: string, args: Record<string, unknown>) => Promise<any>) => {
  toolExecutor = executor;
};

/*
|--------------------------------------------------------------------------
| WebMCP TOOL CATALOG
|--------------------------------------------------------------------------
*/

export const tools: Omit<Tool, 'inputSchema'>[] = [
  {
    name: 'get_active_incidents',
    category: 'OBSERVATION',
    description:
      'List active production incidents requiring operator attention. Call this first to discover what is currently broken before investigating a specific incident. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['NOC Agent'],
  },

  {
    name: 'get_incident',
    category: 'OBSERVATION',
    description:
      'Retrieve the current state of a specific incident: severity, status, affected service and symptoms. Use this to confirm incident details before further investigation. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['NOC Agent'],
  },
  {
    name: 'get_services',
    category: 'OBSERVATION',
    description: 'List all services and their current health status. Use this to see the broader service landscape and confirm which services are healthy vs. degraded. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['NOC Agent'],
  },

  {
    name: 'get_incident_evidence',
    category: 'OBSERVATION',
    description:
      'Return the consolidated metrics, logs, timeline, deployment and prior-finding evidence already gathered for an incident in one call. Use this to get a single evidence snapshot instead of calling multiple observation tools individually. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['SOC Agent', 'Incident Commander'],
  },

  {
    name: 'get_service_health',
    category: 'OBSERVATION',
    description:
      "Retrieve a service's current health signals: status, latency, error rate, request rate, CPU and memory. Use this to quickly assess whether a service is under resource pressure. Read-only; safe to call at any time.",
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['SRE Agent'],
  },

  {
    name: 'get_dependencies',
    category: 'OBSERVATION',
    description:
      "Retrieve a service's dependency graph and the health of each dependency. Use this to check whether a failure is isolated to one service or part of a broader dependency chain. Read-only; safe to call at any time.",
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['NOC Agent'],
  },

  {
    name: 'get_deployment_history',
    category: 'OBSERVATION',
    description:
      'Retrieve recent deployments for a service, including what changed and when. Use this to check whether a recent release could explain a regression. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['Developer Agent'],
  },

  {
    name: 'get_metrics',
    category: 'OBSERVATION',
    description:
      "Retrieve a time series of a service's telemetry: latency, request rate, error rate, CPU, memory and database connections. Use this to quantify how severe a degradation is. Read-only; safe to call at any time.",
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['SRE Agent'],
  },

  {
    name: 'get_logs',
    category: 'OBSERVATION',
    description:
      'Retrieve structured application logs for a service. Use this to find the specific error or timeout events that explain elevated metrics. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['Developer Agent', 'SOC Agent'],
  },

  {
    name: 'get_incident_timeline',
    category: 'INVESTIGATION',
    description:
      'Retrieve the chronological sequence of events leading up to an incident. Use this to establish whether a deployment or other change preceded the incident. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['NOC Agent'],
  },

  {
    name: 'compare_metrics',
    category: 'INVESTIGATION',
    description:
      "Compare an incident's current telemetry against its prior healthy baseline and return the delta for each metric. Use this to measure how far a service has drifted from normal. Read-only; safe to call at any time.",
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['SRE Agent'],
  },

  {
    name: 'correlate_events',
    category: 'INVESTIGATION',
    description:
      'Cross-reference deployment events, telemetry changes, log signals and incident timing into one correlation summary. Use this after gathering individual evidence to look for a consistent causal pattern. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'medium',
    requiresApproval: false,
    agentRoles: ['Developer Agent', 'SOC Agent'],
  },

  {
    name: 'run_diagnostic',
    category: 'INVESTIGATION',
    description:
      "Run a structured diagnostic comparing a service's current telemetry, deployments and logs against baseline, returning a diagnosis, confidence and recommended next step. Use this as a final cross-check before proposing remediation. Read-only: it never executes remediation.",
    readOnly: true,
    mutating: false,
    riskLevel: 'medium',
    requiresApproval: false,
    agentRoles: ['Incident Commander'],
  },

  {
    name: 'create_investigation_finding',
    category: 'INVESTIGATION',
    description:
      'Store a human-readable investigation finding for operator review. Use this to persist a conclusion so a human can audit how it was reached. Mutating but low-risk: it only appends to the investigation record and cannot affect production.',
    readOnly: false,
    mutating: true,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['Incident Commander'],
  },

  {
    name: 'propose_remediation',
    category: 'RECOMMENDATION',
    description:
      'Generate a specific, evidence-based mitigation recommendation (target action, rationale, risk) for a human to review. Use this once a root cause is established. Read-only: it proposes an action but never executes anything and always requires human approval first.',
    readOnly: true,
    mutating: false,
    riskLevel: 'medium',
    requiresApproval: false,
    agentRoles: ['Incident Commander'],
  },

  {
    name: 'approve_remediation',
    category: 'HUMAN CONTROL',
    description:
      'Record an explicit human operator approval for a specific remediation action on a specific incident. This tool represents a human decision, not an agent decision, and is the only way execute_remediation can subsequently succeed.',
    readOnly: false,
    mutating: true,
    riskLevel: 'medium',
    requiresApproval: false,
    agentRoles: ['Human Operator'],
  },

  {
    name: 'execute_remediation',
    category: 'ACTION',
    description:
      'Execute a previously proposed, simulated remediation action (e.g. a rollback). Mutating and high-risk: this call is rejected unless a matching approve_remediation call was already recorded for the same incident and action. Never call this without confirmed human approval.',
    readOnly: false,
    mutating: true,
    riskLevel: 'high',
    requiresApproval: true,
    agentRoles: ['Incident Commander'],
  },

  {
    name: 'verify_remediation',
    category: 'VERIFICATION',
    description:
      "Verify whether a service has actually recovered after remediation, based on its real current status and metrics. Use this after execute_remediation; it reports no recovery if remediation hasn't run yet. Read-only; safe to call at any time.",
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['Incident Commander'],
  },

  {
    name: 'verify_incident',
    category: 'VERIFICATION',
    description:
      'Verify the current state of an incident (open vs. resolved) based on real service status. Use this to check overall incident closure independent of any specific remediation. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['Incident Commander'],
  },

  {
    name: 'get_agent_activity',
    category: 'OBSERVATION',
    description:
      'Read the live audit trail of every tool invocation made so far: agent, tool, arguments, duration and success. Use this to review what has already been investigated or executed before duplicating work. Read-only; safe to call at any time.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['Incident Commander'],
  },
]

export const executeTool = async (
  name: string,
  args: Record<string, unknown>,
  agent?: import('./types').AgentRole,
) => {
  // The 'get_agent_activity' tool is a special case that reads from the local activity store
  // and is not itself recorded, to avoid the activity feed observing itself.
  if (name === 'get_agent_activity') {
    return { activity: getAgentActivity() };
  }

  const startTime = performance.now();
  let result: any;

  try {
    result = toolExecutor
      ? await toolExecutor(name, args)
      // All other tools are invoked through the deterministic data access layer.
      : invokeTool(name, args);
  } catch (error) {
    result = { error: error instanceof Error ? error.message : String(error) };
  }

  const duration = Math.round(performance.now() - startTime);

  // This is the single source of truth for the Agent Activity audit trail: every
  // execution, whether triggered by the Tool Inspector, an investigation, or a
  // real WebMCP agent call, is recorded exactly once, here.
  recordActivity(name, args, result, duration, agent);

  return result;
}

export { getAgentActivity, subscribe };

/*
|--------------------------------------------------------------------------
| UI STATUS STYLES
|--------------------------------------------------------------------------
*/

export const statusStyles: Record<
  Status,
  string
> = {
  healthy:
    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',

  degraded:
    'text-amber-300 bg-amber-300/10 border-amber-300/20',

  warning:
    'text-orange-300 bg-orange-300/10 border-orange-300/20',

  critical:
    'text-red-400 bg-red-400/10 border-red-400/20',
}

export const statusDot: Record<
  Status,
  string
> = {
  healthy:
    'bg-emerald-400',

  degraded:
    'bg-amber-300',

  warning:
    'bg-orange-300',

  critical:
    'bg-red-400',
}

export type ToolInfo =
  (typeof tools)[number]

/*
|--------------------------------------------------------------------------
| PRECISE WEBMCP SCHEMAS
|--------------------------------------------------------------------------
*/

const noInput = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
}

const incidentInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
      description:
        'Incident identifier, for example INC-1042.',
    },
  },
  required: [
    'incident_id',
  ],
  additionalProperties: false,
}

const serviceInput = {
  type: 'object',
  properties: {
    service_id: {
      type: 'string',
      description:
        'Service identifier, for example payment-api.',
    },
  },
  required: [
    'service_id',
  ],
  additionalProperties: false,
}

const incidentServiceInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
      description:
        'Incident identifier.',
    },

    service_id: {
      type: 'string',
      description:
        'Service identifier.',
    },
  },
  required: [
    'incident_id',
    'service_id',
  ],
  additionalProperties: false,
}

const findingInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
      description:
        'Incident identifier.',
    },

    finding: {
      type: 'string',
      description:
        'Investigation finding to store for operator review.',
    },
  },
  required: [
    'incident_id',
    'finding',
  ],
  additionalProperties: false,
}

const approvalInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
    },

    action: {
      type: 'string',
      enum: [
        'rollback_payment_api',
      ],
    },
  },
  required: [
    'incident_id',
    'action',
  ],
  additionalProperties: false,
}

const executionInput = {
  type: 'object',
  properties: {
    incident_id: {
      type: 'string',
    },

    action: {
      type: 'string',
      enum: [
        'rollback_payment_api',
      ],
    },

    approved: {
      type: 'boolean',
      description:
        'Must be true and must match recorded human approval.',
    },
  },
  required: [
    'incident_id',
    'action',
    'approved',
  ],
  additionalProperties: false,
}

const schemaFor = (
  name: string,
) => {
  switch (name) {
    case 'get_active_incidents':
    case 'get_agent_activity':
    case 'get_services':
      return noInput

    case 'get_incident':
    case 'get_incident_evidence':
    case 'get_incident_timeline':
    case 'propose_remediation':
    case 'verify_remediation':
    case 'verify_incident':
      return incidentInput

    case 'get_service_health':
    case 'get_dependencies':
    case 'get_deployment_history':
    case 'get_metrics':
    case 'get_logs':
      return serviceInput

    case 'compare_metrics':
    case 'correlate_events':
      return incidentServiceInput

    case 'create_investigation_finding':
      return findingInput

    case 'approve_remediation':
      return approvalInput

    case 'execute_remediation':
      return executionInput

    default:
      return noInput
  }
}

export const toolDefinitions =
  tools.map((tool) => ({
    name: tool.name,

    title:
      tool.name.replaceAll(
        '_',
        ' ',
      ),

    description:
      tool.description,

    inputSchema:
      schemaFor(tool.name),
  }))
