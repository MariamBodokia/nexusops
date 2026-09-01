import { AgentRole, ActivityEntry } from './types';

let activity: ActivityEntry[] = [];

const listeners = new Set<() => void>();

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notify = () => listeners.forEach(listener => listener());

const roleFor = (name: string): AgentRole => {
  if (['get_metrics', 'compare_metrics', 'get_service_health'].includes(name)) {
    return 'SRE Agent';
  }
  if (['get_incident', 'get_active_incidents', 'get_incident_timeline', 'get_dependencies', 'get_services'].includes(name)) {
    return 'NOC Agent';
  }
  if (['get_deployment_history', 'get_logs', 'correlate_events'].includes(name)) {
    return 'Developer Agent';
  }
  if (['get_incident_evidence'].includes(name)) {
    return 'SOC Agent';
  }
  if (name === 'approve_remediation') {
    return 'Human Operator';
  }
  if (['run_diagnostic', 'create_investigation_finding', 'propose_remediation', 'execute_remediation', 'verify_remediation', 'verify_incident', 'get_agent_activity'].includes(name)) {
    return 'Incident Commander';
  }
  return 'Incident Commander';
};

const summarize = (name: string, result: Record<string, unknown>) => {
    if (name === 'get_service_health') {
        return `${String(result.service)} is ${String(result.status)}`;
    }

    if (name === 'execute_remediation') {
        return String(result.success ? 'Rollback executed' : result.reason);
    }

    if (name === 'verify_remediation' || name === 'verify_incident') {
        return `Incident ${String(result.status || result.incident_status || 'unknown')}`;
    }

    if (name === 'create_investigation_finding') {
        return 'Finding stored for operator review';
    }

    if (name === 'run_diagnostic') {
        return 'Evidence-based diagnostic completed';
    }

    if (name === 'correlate_events') {
        return 'Deployment, telemetry and log signals correlated';
    }

    return 'Structured result returned';
};

export const recordActivity = (name: string, args: Record<string, unknown>, result: Record<string, unknown>, duration = 0, agentOverride?: AgentRole) => {
  const failed = Boolean(result.error) || result.success === false;

  activity = [
    {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      role: agentOverride || roleFor(name),
      name,
      args: Object.values(args).join(' ') || '—',
      success: !failed,
      summary: summarize(name, result),
      duration,
    },
    ...activity,
  ].slice(0, 50);

  notify();
};

export const getActivity = () => activity;
