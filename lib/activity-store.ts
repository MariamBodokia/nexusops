import { AgentRole, ActivityEntry } from './types';

let activity: ActivityEntry[] = [];

const listeners = new Set<() => void>();

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notify = () => listeners.forEach(listener => listener());

const roleFor = (name: string): AgentRole => {
  if (['get_active_incidents', 'get_incident', 'get_service_health'].includes(name)) {
    return 'Incident Commander';
  }
  if (name === 'approve_remediation') {
    return 'Human Operator';
  }
  if (['get_recent_logs', 'search_operational_evidence', 'get_error_metrics', 'get_latency_metrics'].includes(name)) {
    return 'Observability Agent';
  }
  if (['get_recent_deployments', 'get_deployment', 'get_change_history'].includes(name)) {
    return 'DevOps Agent';
  }
  if (['get_network_health', 'get_dns_events', 'get_service_dependencies', 'get_network_events'].includes(name)) {
    return 'Network Agent';
  }
  if (['get_resource_health', 'get_compute_metrics', 'get_storage_health', 'get_infrastructure_events'].includes(name)) {
    return 'Cloud / Infrastructure Agent';
  }
  if (['get_security_events', 'get_authentication_events', 'search_security_evidence'].includes(name)) {
    return 'Security Agent';
  }
  return 'SRE Agent';
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

export const recordActivity = (name: string, args: Record<string, unknown>, result: Record<string, unknown>, duration = 0) => {
  const failed = Boolean(result.error) || result.success === false;

  activity = [
    {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      role: roleFor(name),
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
