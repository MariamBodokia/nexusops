import {
  services,
  incident,
  logs,
  metrics,
  deployments,
  healthyMetrics,
  remediationState,
  timeline,
} from './operational-state';

// Service-related functions
export const getServices = () => services;

export const getService = (id: string) => services.find(s => s.id === id);

// Incident-related functions
export const getActiveIncidents = () => [incident]; // For now, we only have one

export const getIncident = (id: string) => {
  if (id === incident.id) {
    return incident;
  }
  return undefined;
};

export const getIncidentTimeline = (incidentId: string) => {
  if (incidentId === incident.id) {
    return timeline;
  }
  return [];
};

// Deployment-related functions
export const getRecentDeployments = (serviceId: string) => {
  return deployments.filter(d => d.service === serviceId);
};

// Log-related functions
export const getLogs = (serviceId: string) => {
    if(serviceId === 'payment-api') {
        return logs;
    }
    return [];
};

// Metrics-related functions
export const getMetrics = (serviceId: string) => {
  if (serviceId === metrics.service) {
    return metrics;
  }
  return undefined;
};

// Dependency-related functions
export const getServiceDependencies = (serviceId: string) => {
    const service = getService(serviceId);
    if (!service) {
        return undefined;
    }

    const dependencyGraph: { [key: string]: string[] } = {};
    const exploredServices = new Set<string>();

    const findDeps = (sId: string) => {
        if (exploredServices.has(sId)) {
            return;
        }
        exploredServices.add(sId);
        const s = getService(sId);
        if (s && s.dependencies.length > 0) {
            dependencyGraph[sId] = s.dependencies;
            s.dependencies.forEach(findDeps);
        }
    };

    findDeps(serviceId);
    return dependencyGraph;
};

// Evidence correlation (initial implementation)
export const getOperationalEvidence = (incidentId: string) => {
  if (incidentId !== incident.id) {
    return undefined;
  }
  return {
    incident,
    timeline,
    logs,
    metrics,
    deployments: getRecentDeployments(incident.service),
    dependencies: getServiceDependencies(incident.service),
  };
};

// A function to get all data, for convenience in larger components
export const getSystemSnapshot = () => ({
    services,
    incidents: [incident],
    timelines: { [incident.id]: timeline },
    logs: { [metrics.service]: logs },
    metrics: { [metrics.service]: metrics },
    deployments,
});

export function invokeTool(
  name: string,
  args: Record<string, unknown> = {},
) {
  const incidentId = String(
    args.incident_id || 'INC-1042',
  );

  const serviceId = String(
    args.service_id || 'payment-api',
  );

  const svc = getService(serviceId);

  let result: Record<
    string,
    unknown
  >

  if (
    name === 'get_active_incidents'
  ) {
    result = { incidents: getActiveIncidents() }
  }

  else if (
    name === 'get_incident'
  ) {
    const incident = getIncident(incidentId)
    if (
      !incident
    ) {
      result = {
        error: `Unknown incident: ${incidentId}`,
      }
    } else {
      result = {
        incident_id: incident.id,
        severity:
          incident.severity,
        status:
          incident.status.toLowerCase(),
        service:
          incident.service,
        title:
          incident.title,
        started:
          incident.started,
        symptoms:
          incident.symptoms,
      }
    }
  }

  else if (
    name ===
    'get_incident_evidence'
  ) {
    const evidence = getOperationalEvidence(incidentId);
    if (!evidence) {
      result = {
        error: `Unknown incident: ${incidentId}`,
      }
    } else {
      result = {
        ...evidence,
        baseline: healthyMetrics,
        findings: [],
      }
    }
  }

  else if (
    name === 'get_services'
  ) {
    result = {
      services: getServices(),
    }
  }

  else if (
    name === 'get_service_health'
  ) {
    if (!svc) {
      result = {
        error: `Unknown service: ${serviceId}`,
        valid_service_ids:
          getServices().map(
            (service) =>
              service.id,
          ),
      }
    } else {
      result = {
        service: svc.id,
        status: svc.status,
        latency_ms: svc.latency,
        error_rate: svc.errorRate,
        request_rate: svc.requestRate,
        cpu_percent: svc.cpu,
        memory_percent: svc.memory,
        dependencies:
          svc.dependencies,
      }
    }
  }

  else if (
    name === 'get_metrics'
  ) {
    result = getMetrics(serviceId) || {};
  }

  else if (
    name === 'compare_metrics'
  ) {
    const incidentMetrics = getMetrics(serviceId);
    if (!incidentMetrics) {
      result = {
        error: `Metrics not found for service: ${serviceId}`,
      };
    } else {
      result = {
        service:
          serviceId,

        incident_id:
          incidentId,

        baseline: {
          latency_ms:
            healthyMetrics.latency_ms,

          error_rate:
            healthyMetrics.error_rate,

          db_connections:
            healthyMetrics.db_connections,

          cpu_percent:
            healthyMetrics.cpu_percent,

          memory_percent:
            healthyMetrics.memory_percent,
        },

        incident_peak: {
          latency_ms: incidentMetrics.latency_ms[incidentMetrics.latency_ms.length - 1],
          error_rate: incidentMetrics.error_rate[incidentMetrics.error_rate.length - 1],
          db_connections: incidentMetrics.db_connections[incidentMetrics.db_connections.length - 1],
          cpu_percent: incidentMetrics.cpu_percent[incidentMetrics.cpu_percent.length - 1],
          memory_percent: incidentMetrics.memory_percent[incidentMetrics.memory_percent.length - 1],
        },

        delta: {
          latency_ms:
          incidentMetrics.latency_ms[incidentMetrics.latency_ms.length - 1] -
            healthyMetrics.latency_ms,

          error_rate:
          incidentMetrics.error_rate[incidentMetrics.error_rate.length - 1] -
            healthyMetrics.error_rate,

          db_connections:
          incidentMetrics.db_connections[incidentMetrics.db_connections.length - 1] -
            healthyMetrics.db_connections,

          cpu_percent:
          incidentMetrics.cpu_percent[incidentMetrics.cpu_percent.length - 1] -
            healthyMetrics.cpu_percent,

          memory_percent:
          incidentMetrics.memory_percent[incidentMetrics.memory_percent.length - 1] -
            healthyMetrics.memory_percent,
        },
      }
    }
  }

  else if (
    name === 'get_logs'
  ) {
    result = {
      service:
        serviceId,

      logs: getLogs(serviceId),
    }
  }

  else if (
    name === 'get_dependencies'
  ) {
    const dependencies = getServiceDependencies(serviceId);
    const services = getServices();
    result = {
      root: 'internet',

      graph: {
        internet: ['api-gateway'],
        ...dependencies,
      },

      health:
        Object.fromEntries(
          services.map(
            (service) => [
              service.id,
              service.status,
            ],
          ),
        ),
    }
  }

  else if (
    name ===
    'get_deployment_history'
  ) {
    result = {
      service:
        serviceId,

      deployments: getRecentDeployments(serviceId),
    }
  }

  else if (
    name ===
    'get_incident_timeline'
  ) {
    result = {
      incident_id:
        incidentId,

      timeline: getIncidentTimeline(incidentId),
    }
  }

  else if (
    name ===
    'correlate_events'
  ) {
    const incident = getIncident(incidentId);
    const deployments = incident ? getRecentDeployments(incident.service) : [];
    const timeline = getIncidentTimeline(incidentId);
    const logs = incident ? getLogs(incident.service) : [];
    const metrics = incident ? getMetrics(incident.service) : undefined;

    result = {
      incident_id:
        incidentId,

      service_id:
        serviceId,

      correlations: [
        {
          type:
            'deployment_before_degradation',

          finding:
            'Payment API deployment v2.7.3 completed six minutes before the incident was opened.',

          deployment:
            deployments[0],

          timeline:
            timeline.filter(
              (event: any) =>
                [
                  '14:29',
                  '14:31',
                  '14:32',
                  '14:33',
                  '14:34',
                ].includes(
                  event[0],
                ),
            ),
        },

        {
          type:
            'telemetry_change',

          finding:
            'Latency, HTTP error rate and database connection utilization increased together while request volume also increased.',

          metrics: {
            latency_ms:
              metrics?.latency_ms,

            error_rate:
              metrics?.error_rate,

            db_connections:
              metrics?.db_connections,

            request_rate:
              metrics?.request_rate,
          },
        },

        {
          type:
            'database_connection_pressure',

          finding:
            'Database connection utilization reached 93%, coinciding with connection timeout errors.',

          database_connection_peak_percent:
            93,

          baseline:
            healthyMetrics.db_connections,
        },

        {
          type:
            'log_signal',

          finding:
            'Application logs contain database connection timeout and transaction retry events before the 5xx spike.',

          matching_logs:
            logs.filter(
              (entry: any) =>
                String(
                  entry[2],
                )
                  .toLowerCase()
                  .includes(
                    'connection',
                  ) ||
                String(
                  entry[3],
                )
                  .toLowerCase()
                  .includes(
                    'connection',
                  ),
            ),
        },

        {
          type:
            'dependency_health',

          finding:
            'PostgreSQL shows warning-level pressure while Redis and the network remain healthy.',

          dependencies: {
            postgresql:
              getService('postgresql')?.status,

            redis:
              getService('redis')?.status,

            network:
              getService('network')?.status,
          },
        },
      ],
    }
  }

  else if (
    name === 'run_diagnostic'
  ) {
    result = {
        success: true,
        message: 'This is a real tool execution!',
        incident_id: incidentId,
        service_id: serviceId,
        timestamp: new Date().toISOString()
    };
  }

  else if (
    name ===
    'create_investigation_finding'
  ) {
    const finding = String(
      args.finding || '',
    ).trim()

    if (!finding) {
      result = {
        error:
          'finding is required',
      }
    } else {
      result = {
        incident_id:
          incidentId,
        finding,
        stored: true,
        findings: [finding],
      }
    }
  }

  else if (
    name ===
    'propose_remediation'
  ) {
    result = {
      incident_id:
        incidentId,

      recommendation:
        'Rollback payment-api from v2.7.3 to the previous known-good version v2.7.2.',

      action:
        'rollback_payment_api',

      target_service:
        'payment-api',

      current_version:
        'v2.7.3',

      target_version:
        'v2.7.2',

      rationale: [
        'The deployment preceded the degradation.',
        'The deployment changed connection pooling configuration.',
        'Database connection utilization reached 93%.',
        'Connection timeout errors appeared in application logs.',
        'HTTP 5xx rate increased to 23.4%.',
      ],

      requires_human_approval:
        true,

      approved: false,
    }
  }

  else if (
    name ===
    'approve_remediation'
  ) {
    const incident = getIncident(incidentId);
    const valid =
      incident &&
      String(
        args.action || '',
      ) ===
        'rollback_payment_api'

    if (valid) {
      remediationState.approved = true;
    }

    result = valid
      ? {
          success: true,
          incident_id:
            incidentId,
          approved: true,
          action:
            'rollback_payment_api',
          approved_by:
            'Human Operator',
        }
      : {
          success: false,
          error:
            'Valid incident and rollback action are required.',
        }
  }

  else if (
    name ===
    'execute_remediation'
  ) {
    const incident = getIncident(incidentId);
    const valid =
      args.approved === true &&
      incident &&
      String(
        args.action || '',
      ) ===
        'rollback_payment_api' &&
      remediationState.approved

    if (!valid) {
      result = {
        success: false,

        blocked: true,

        reason: !remediationState.approved
          ? 'Human approval has not been recorded for this action.'
          : 'Human approval required',
      }
    } else {
      // Mutate the real operational state so verification reflects an actual rollback,
      // instead of returning a hardcoded response regardless of what happened.
      const paymentApi = getService('payment-api');
      if (paymentApi) {
        paymentApi.status = 'healthy';
        paymentApi.latency = 168;
        paymentApi.errorRate = 0.5;
        paymentApi.cpu = 54;
        paymentApi.memory = 66;
        paymentApi.deployment = 'v2.7.2 · rolled back'
      }
      incident.status = 'Resolved';
      remediationState.executed = true;

      result = {
        success: true,

        action:
          'rollback',

        service:
          'Payment API',

        previous_version:
          'v2.7.3',

        restored_version:
          'v2.7.2',

        status:
          'healthy',

        incident_id:
          incidentId,

        human_approval_verified:
          true,
      }
    }
  }

  else if (
    name ===
      'verify_remediation' ||
    name ===
      'verify_incident'
  ) {
    const paymentApi = getService('payment-api');
    const recovered = remediationState.executed && paymentApi?.status === 'healthy';

    result = recovered
      ? {
          success: true,
          incident_id: incidentId,
          status: 'resolved',
          incident_status: 'resolved',
          service_status: paymentApi?.status,
          latency_ms: paymentApi?.latency,
          error_rate: paymentApi?.errorRate,
          reason: 'Rollback to v2.7.2 verified: latency and error rate returned to baseline.',
        }
      : {
          success: false,
          incident_id: incidentId,
          status: 'investigating',
          incident_status: 'investigating',
          reason: 'Remediation has not been executed.',
        }
  }

  else {
    result = {
      error:
        `Unknown tool: ${name}`,
    }
  }

  return result
}
