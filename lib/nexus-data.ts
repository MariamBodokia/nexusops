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
      'List active production incidents requiring operator attention.',
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
      'Retrieve the current state of a specific incident.',
    readOnly: true,
    mutating: false,
    riskLevel: 'low',
    requiresApproval: false,
    agentRoles: ['NOC Agent'],
  },
  {
    name: 'get_services',
    category: 'OBSERVATION',
    description: 'Get a list of all services.',
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
      'Return correlated metrics, logs, timeline, deployment and finding evidence for an incident.',
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
      'Retrieve current health signals for a service.',
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
      'Retrieve the current service dependency graph and dependency health.',
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
      'Retrieve deployment history for a service.',
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
      'Retrieve current telemetry metrics for a service.',
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
      'Retrieve structured application logs for a service.',
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
      'Retrieve the chronological timeline of an incident.',
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
      'Compare incident telemetry against the prior healthy baseline.',
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
      'Correlate deployment events, telemetry changes, logs and incident timing.',
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
      'Run an evidence-based diagnostic across incident telemetry without executing remediation.',
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
      'Store an investigation finding for human operator review.',
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
      'Generate a safe, human-reviewable mitigation recommendation.',
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
      'Record explicit human operator approval for the simulated rollback.',
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
      'Execute the approved non-destructive simulated rollback.',
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
      'Verify service recovery after remediation.',
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
      'Verify the current incident state.',
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
      'Read the live audit trail of tool invocations.',
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
