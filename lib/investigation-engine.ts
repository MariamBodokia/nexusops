import {
    Incident,
    Deployment,
    Metrics,
    LogEntry,
    Investigation,
    Evidence,
    ToolExecution,
    TimelineEvent,
    Signal,
    Recommendation,
    AgentRole,
    AgentId,
    AgentPerspective,
    CommanderAssessment,
    CausalChainNode,
} from './types';
import { executeTool } from './nexus-data';

const executeTrackedTool = async (
    toolName: string,
    args: Record<string, unknown>,
    onToolExecution: (execution: ToolExecution) => void,
    agent?: AgentRole,
    rationale?: string,
): Promise<any> => {
    const startTime = Date.now();
    let success = false;
    let result: any;
    try {
        result = await executeTool(toolName, args, agent);
        success = !(result && typeof result === 'object' && (result.error || result.success === false));
        return result;
    } catch (e) {
        result = e instanceof Error ? e.message : String(e);
        throw e;
    } finally {
        const endTime = Date.now();
        const duration = endTime - startTime;
        onToolExecution({
            id: `tool-${Date.now()}`,
            toolName,
            args,
            startTime,
            endTime,
            duration,
            result,
            success,
            agent,
            rationale,
        });
    }
};

const extractEvidenceFromTools = (toolExecutions: ToolExecution[], incidentId: string): Evidence[] => {
    const evidence: Evidence[] = [];
    for (const exec of toolExecutions) {
        if (!exec.success) continue;

        const baseEvidence = {
            incidentId,
            timestamp: new Date(exec.endTime).toISOString(),
            source: `tool:${exec.toolName}`,
        };

        if (exec.toolName === 'get_deployment_history' && exec.result.deployments) {
            exec.result.deployments.forEach((d: Deployment) => {
                evidence.push({
                    ...baseEvidence,
                    id: `ev-dep-${d.version}-${d.time}`,
                    time: d.time,
                    type: 'Deployment',
                    description: `Service ${d.service} deployed version ${d.version}`,
                    details: d,
                });
            });
        } else if (exec.toolName === 'get_logs' && exec.result.logs) {
            exec.result.logs.forEach((l: LogEntry, i: number) => {
                if (l[3].includes('error') || l[3].includes('timeout')) {
                    evidence.push({
                        ...baseEvidence,
                        id: `ev-log-${l[0]}-${i}`,
                        time: l[1],
                        type: 'Log',
                        description: `Log entry: ${l[3]}`,
                        details: l,
                    });
                }
            });
        } else if (exec.toolName === 'get_metrics' && exec.result) {
            evidence.push({
                ...baseEvidence,
                id: `ev-metrics-${exec.result.service}`,
                time: new Date(exec.endTime).toLocaleTimeString('en-US', { hour12: false }),
                type: 'Metrics',
                description: `Metrics snapshot for ${exec.result.service}`,
                details: exec.result,
            });
        } else if (exec.toolName === 'get_incident' && exec.result) {
            evidence.push({
                ...baseEvidence,
                id: `ev-incident-${exec.result.id}`,
                time: exec.result.started,
                type: 'Incident',
                description: `Incident ${exec.result.id}: ${exec.result.title}`,
                details: exec.result,
            });
        }
    }
    return evidence;
};

const buildTimeline = (evidence: Evidence[], incident: Incident): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    for (const ev of evidence) {
        if (ev.type === 'Deployment') {
            events.push({ time: ev.time, description: ev.description, source: 'Deployments', type: 'deployment' });
        } else if (ev.type === 'Log') {
            events.push({ time: ev.time, description: ev.description, source: 'Logs', type: 'log_error' });
        }
    }

    // Add incident start to timeline
    events.push({ time: incident.started, description: 'Incident symptoms first observed', source: 'Monitoring', type: 'incident_start' });

    // A real implementation would parse metric timestamps, but for this demo we'll infer it
    const metricEvidence = evidence.find(e => e.type === 'Metrics');
    if (metricEvidence) {
        const highLatency = metricEvidence.details.latency_ms.slice(-1)[0] > 1000;
        const highErrors = metricEvidence.details.error_rate.slice(-1)[0] > 5;
        if (highLatency || highErrors) {
            // Find the approximate time of the metric spike. For the demo, this is a fixed offset.
             const incidentTimeParts = incident.started.split(':').map(Number);
             const metricTime = new Date();
             metricTime.setHours(incidentTimeParts[0]);
             metricTime.setMinutes(incidentTimeParts[1] + 4);
             const metricTimeString = metricTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false});
            events.push({ time: metricTimeString, description: '5xx errors and latency spike detected', source: 'Metrics', type: 'metric_anomaly' });
        }
    }


    return events.sort((a, b) => a.time.localeCompare(b.time));
};

const analyzeSignals = (metrics: Metrics): Signal[] => {
    if (!metrics) return [];
    const signals: Signal[] = [];

    const createSignal = (metric: string, unit: string, data: number[], type: Signal['type']): Signal | null => {
        if (data.length < 2) return null;
        const before = data[0];
        const after = data[data.length - 1];
        const change = after - before;
        const percentageChange = before !== 0 ? (change / before) * 100 : Infinity;
        return {
            metric,
            valueBefore: `${before.toFixed(1)}`,
            valueAfter: `${after.toFixed(1)}`,
            change: `${change > 0 ? '+' : ''}${change.toFixed(1)} (${percentageChange.toFixed(0)}%)`,
            unit,
            type
        };
    };

    const latencySignal = createSignal('Latency', 'ms', metrics.latency_ms, 'latency');
    if (latencySignal) signals.push(latencySignal);

    const errorSignal = createSignal('Error Rate', '%', metrics.error_rate, 'error_rate');
    if (errorSignal) signals.push(errorSignal);

    const cpuSignal = createSignal('CPU', '%', metrics.cpu_percent, 'resource_utilization');
    if (cpuSignal) signals.push(cpuSignal);

    const memorySignal = createSignal('Memory', '%', metrics.memory_percent, 'resource_utilization');
    if (memorySignal) signals.push(memorySignal);

    const dbConnectionsSignal = createSignal('DB Connections', '', metrics.db_connections, 'resource_utilization');
    if (dbConnectionsSignal) {
        dbConnectionsSignal.unit = 'connections';
        signals.push(dbConnectionsSignal);
    }

    return signals;
};

const generateRecommendation = (commander: CommanderAssessment | null, incident: Incident): Recommendation | null => {
    if (!commander) return null;

    return {
        title: `Review: ${commander.rootCause}`,
        action: `Investigate ${incident.service} against the evidence behind "${commander.rootCause}" and apply the corresponding fix (for example a rollback or configuration change) if it continues to correlate.`,
        risk: commander.confidence >= 70 ? 'medium' : 'low',
        reason: commander.reasoning[0] || `The Incident Commander's arbitration points to: ${commander.rootCause}.`,
        status: 'pending',
    };
}


// =================================================================
// Multi-agent perspectives, disagreement and Incident Commander arbitration
//
// Each perspective reads the SAME evidence pool already extracted from real
// tool results above; agents cannot invent facts, only interpret them
// differently. Confidence is always derived deterministically from numeric
// evidence deltas or timing gaps, never randomized.
// =================================================================

const resultOfTool = (toolExecutions: ToolExecution[], toolName: string) =>
    toolExecutions.find(t => t.toolName === toolName && t.success)?.result;

const generateAgentPerspectives = (
    incident: Incident,
    evidence: Evidence[],
    timeline: TimelineEvent[],
    toolExecutions: ToolExecution[],
): AgentPerspective[] => {
    const deploymentEvidence = evidence.find(e => e.type === 'Deployment');
    // Any log evidence item already passed the generic error/timeout filter in
    // extractEvidenceFromTools, so it can stand in as "the error signal" for any
    // service/incident, not just one specific error string.
    const logEvidence = evidence.find(e => e.type === 'Log');
    const metricsEvidence = evidence.find(e => e.type === 'Metrics');
    const incidentEvidence = evidence.find(e => e.type === 'Incident');

    // ---- SRE Agent: resource / database saturation --------------------------
    const compare = resultOfTool(toolExecutions, 'compare_metrics');
    const serviceHealth = resultOfTool(toolExecutions, 'get_service_health');
    const baseline = compare?.baseline || {};
    const delta = compare?.delta || {};
    const ratio = (d: number, b: number) => (b ? Math.max(0, d / b) : 0);
    const dbRatio = ratio(delta.db_connections ?? 0, baseline.db_connections ?? 0);
    const cpuRatio = ratio(delta.cpu_percent ?? 0, baseline.cpu_percent ?? 0);
    const memRatio = ratio(delta.memory_percent ?? 0, baseline.memory_percent ?? 0);
    const sreConfidence = Math.max(5, Math.min(95, Math.round(dbRatio * 50 + cpuRatio * 30 + memRatio * 20)));

    const sre: AgentPerspective = {
        id: 'sre',
        name: 'SRE Agent',
        focus: 'Service health, latency, error rate, CPU/memory and database connection utilization.',
        toolsConsulted: ['get_service_health', 'get_metrics', 'compare_metrics'],
        hypothesis: `Resource / database connection saturation on ${incident.service}`,
        confidence: sreConfidence,
        supportingEvidenceIds: metricsEvidence ? [metricsEvidence.id] : [],
        contradictingEvidenceIds: deploymentEvidence ? [deploymentEvidence.id] : [],
        reasoning: `Database connections are ${Math.round(dbRatio * 100)}% above baseline and CPU is ${Math.round(cpuRatio * 100)}% above baseline${serviceHealth?.status ? `, and service health reports status "${serviceHealth.status}"` : ''}. This resource pressure begins immediately after a deployment, suggesting it may be a downstream symptom rather than the triggering event.`,
    };

    // ---- NOC Agent: operational timing / sequence ----------------------------
    const dependencies = resultOfTool(toolExecutions, 'get_dependencies');
    const deploymentEvent = timeline.find(t => t.type === 'deployment');
    const incidentStartEvent = timeline.find(t => t.type === 'incident_start');
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const gapMinutes = deploymentEvent && incidentStartEvent
        ? toMinutes(incidentStartEvent.time) - toMinutes(deploymentEvent.time)
        : null;
    const nocConfidence = gapMinutes !== null && gapMinutes >= 0
        ? Math.max(5, Math.min(95, Math.round(100 - gapMinutes * 3)))
        : 20;
    const degradedDependency = dependencies?.health
        ? Object.entries(dependencies.health as Record<string, string>).find(([id, status]) => id !== incident.service && status !== 'healthy')
        : undefined;

    const noc: AgentPerspective = {
        id: 'noc',
        name: 'NOC Agent',
        focus: 'Incident timing, timeline sequencing, and dependency health.',
        toolsConsulted: ['get_incident', 'get_incident_timeline', 'get_dependencies'],
        hypothesis: 'Incident timing is closely correlated with a recent production change',
        confidence: nocConfidence,
        supportingEvidenceIds: [deploymentEvidence, incidentEvidence].filter((e): e is Evidence => !!e).map(e => e.id),
        contradictingEvidenceIds: [],
        reasoning: gapMinutes !== null
            ? `The incident was opened only ${gapMinutes} minute${gapMinutes === 1 ? '' : 's'} after the last deployment completed${degradedDependency ? `, and dependency health shows ${degradedDependency[0]} degraded to "${degradedDependency[1]}" while other dependencies remain healthy` : ''}.`
            : 'No clear timing correlation between a deployment and the incident was found in the timeline.',
    };

    // ---- Developer Agent: deployment / configuration regression --------------
    const errorPeak = metricsEvidence?.details.error_rate?.slice(-1)[0];
    const latencyPeak = metricsEvidence?.details.latency_ms?.slice(-1)[0];
    const errorSpike = typeof errorPeak === 'number' && errorPeak > 5;
    const latencySpike = typeof latencyPeak === 'number' && latencyPeak > 1000;
    const devSignals = [Boolean(deploymentEvidence), Boolean(logEvidence), errorSpike, latencySpike];
    const devConfidence = Math.max(5, Math.min(96, devSignals.filter(Boolean).length * 23));

    const developer: AgentPerspective = {
        id: 'developer',
        name: 'Developer Agent',
        focus: 'Deployment history, configuration changes, application logs and regressions.',
        toolsConsulted: ['get_deployment_history', 'get_logs', 'correlate_events'],
        hypothesis: deploymentEvidence
            ? `${incident.service} ${deploymentEvidence.details.version} deployment (${deploymentEvidence.details.change}) correlates with the incident`
            : `A recent change to ${incident.service} correlates with the incident`,
        confidence: devConfidence,
        supportingEvidenceIds: [deploymentEvidence, logEvidence, metricsEvidence].filter((e): e is Evidence => !!e).map(e => e.id),
        contradictingEvidenceIds: [],
        reasoning: `${deploymentEvidence ? `The deployment changed: ${deploymentEvidence.details.change}` : 'No recent deployment was found for this service'}${logEvidence ? `, and application logs recorded "${logEvidence.description}" shortly after` : ''}${errorSpike ? `, and the HTTP error rate rose to ${errorPeak}%` : ''}${latencySpike ? ` with latency increasing to ${latencyPeak}ms` : ''}.`,
    };

    // ---- SOC Agent: rule out a security-related cause -------------------------
    const securityPattern = /auth|login|token|unauthorized|forbidden|401|403|breach|intrusion|credential/i;
    const allLogs = (resultOfTool(toolExecutions, 'get_logs')?.logs || []) as LogEntry[];
    const suspiciousLogs = allLogs.filter(l => securityPattern.test(`${l[2]} ${l[3]}`));
    const suspiciousEvidence = suspiciousLogs.length > 0
        ? evidence.find(e => e.type === 'Log' && suspiciousLogs.some(l => l[0] === e.details[0]))
        : undefined;
    const socConfidence = suspiciousLogs.length > 0 ? Math.min(90, 20 + suspiciousLogs.length * 15) : 12;

    const soc: AgentPerspective = {
        id: 'soc',
        name: 'SOC Agent',
        focus: 'Security-relevant log signals and suspicious authentication activity.',
        toolsConsulted: ['get_logs', 'get_incident_evidence', 'correlate_events'],
        hypothesis: suspiciousLogs.length > 0 ? 'Security-related event contributing to the incident' : 'No security-related cause identified',
        confidence: socConfidence,
        supportingEvidenceIds: suspiciousEvidence ? [suspiciousEvidence.id] : [],
        contradictingEvidenceIds: [deploymentEvidence, metricsEvidence].filter((e): e is Evidence => !!e).map(e => e.id),
        reasoning: suspiciousLogs.length > 0
            ? `${suspiciousLogs.length} suspicious authentication or authorization log entries were found.`
            : `No authentication or authorization anomalies were found across ${allLogs.length} reviewed log entries; the observed error rate and latency increases are better explained by the deployment and database connection evidence.`,
    };

    return [sre, noc, developer, soc];
};

const arbitratePerspectives = (perspectives: AgentPerspective[], evidence: Evidence[]): CommanderAssessment | null => {
    if (perspectives.length === 0) return null;

    // Cross-agent corroboration: perspectives that independently point to the
    // same evidence reinforce each other, instead of the Commander simply
    // picking whichever single agent scored highest.
    const corroboration = new Map<AgentId, number>();
    perspectives.forEach(p => {
        const shared = perspectives
            .filter(o => o.id !== p.id)
            .reduce((count, o) => count + o.supportingEvidenceIds.filter(id => p.supportingEvidenceIds.includes(id)).length, 0);
        corroboration.set(p.id, shared);
    });

    const scored = perspectives
        .map(p => ({ perspective: p, adjusted: Math.max(0, Math.min(100, Math.round(p.confidence + (corroboration.get(p.id) || 0) * 4))) }))
        .sort((a, b) => b.adjusted - a.adjusted);

    const winner = scored[0];
    const corroborators = scored.filter(s => s.perspective.id !== winner.perspective.id &&
        s.perspective.supportingEvidenceIds.some(id => winner.perspective.supportingEvidenceIds.includes(id)));

    const supportingEvidence = winner.perspective.supportingEvidenceIds
        .map(id => evidence.find(e => e.id === id))
        .filter((e): e is Evidence => !!e);

    const reasoning = [winner.perspective.reasoning, ...supportingEvidence.map(e => e.description)];
    corroborators.forEach(c => reasoning.push(`${c.perspective.name}'s independent analysis ("${c.perspective.hypothesis}") corroborates this evidence.`));

    const rejected = scored.slice(1).map(s => ({
        agent: s.perspective.id,
        name: s.perspective.name,
        reason: s.perspective.confidence <= 20
            ? s.perspective.reasoning
            : `${s.perspective.hypothesis} (${s.adjusted}% confidence) is a real signal but explains a downstream symptom rather than the triggering event.`,
    }));

    return {
        rootCause: winner.perspective.hypothesis,
        confidence: winner.adjusted,
        reasoning,
        consideredHypotheses: scored.map(s => ({ agent: s.perspective.id, name: s.perspective.name, hypothesis: s.perspective.hypothesis, confidence: s.adjusted })),
        rejected,
    };
};

const buildCausalChain = (incident: Incident, evidence: Evidence[]): CausalChainNode[] => {
    const chain: CausalChainNode[] = [];
    const deployment = evidence.find(e => e.type === 'Deployment');
    const metricsEvidence = evidence.find(e => e.type === 'Metrics');
    const logEvidence = evidence.find(e => e.type === 'Log');

    if (deployment) {
        chain.push({ label: `${deployment.details.version} DEPLOYMENT`, detail: `${deployment.time} \u00b7 ${deployment.details.change}` });
        chain.push({ label: 'CONFIGURATION CHANGE', detail: deployment.details.change });
    }
    if (metricsEvidence) {
        const dbPeak = metricsEvidence.details.db_connections?.slice(-1)[0];
        if (dbPeak !== undefined) chain.push({ label: 'DB CONNECTION UTILIZATION', detail: `${dbPeak} connections (peak)` });
    }
    if (logEvidence) {
        chain.push({ label: 'APPLICATION ERROR SIGNAL', detail: logEvidence.description });
    }
    if (metricsEvidence) {
        const errPeak = metricsEvidence.details.error_rate?.slice(-1)[0];
        if (errPeak !== undefined) chain.push({ label: 'HTTP 5XX ERROR RATE', detail: `${errPeak}% of requests` });
        const latPeak = metricsEvidence.details.latency_ms?.slice(-1)[0];
        if (latPeak !== undefined) chain.push({ label: 'LATENCY INCREASE', detail: `${latPeak}ms p95` });
    }
    chain.push({ label: `${incident.severity} INCIDENT`, detail: `${incident.id} \u00b7 ${incident.title}` });
    return chain;
};

const analyzeEvidence = (incident: Incident, toolExecutions: ToolExecution[]): Investigation => {
    const startTime = Math.min(...toolExecutions.map(t => t.startTime));
    const endTime = Math.max(...toolExecutions.map(t => t.endTime));

    const allEvidence = extractEvidenceFromTools(toolExecutions, incident.id);
    const timeline = buildTimeline(allEvidence, incident);
    const metrics = toolExecutions.find(t => t.toolName === 'get_metrics')?.result as Metrics;
    const signals = analyzeSignals(metrics);

    const perspectives = generateAgentPerspectives(incident, allEvidence, timeline, toolExecutions);
    const commander = arbitratePerspectives(perspectives, allEvidence);
    const causalChain = buildCausalChain(incident, allEvidence);
    const recommendation = generateRecommendation(commander, incident);

    return {
        id: `inv-${incident.id}`,
        incidentId: incident.id,
        status: 'complete',
        summary: {
            toolCount: toolExecutions.length,
            evidenceSources: [...new Set(allEvidence.map(e => e.source.split(':')[1] || 'Unknown'))],
            durationMs: endTime - startTime,
            status: 'complete',
        },
        timeline,
        signals,
        recommendation,
        perspectives,
        commander,
        causalChain,
        rawEvidence: allEvidence,
    };
};


export const runInvestigation = async (
    incidentId: string,
    onStep: (step: string) => void,
    // onEvidence is no longer needed during the run, it's all at the end.
    onRawEvidence: (evidence: Evidence) => void,
    onToolExecution: (execution: ToolExecution) => void
): Promise<Investigation> => {
    const toolExecutions: ToolExecution[] = [];
    const onToolExecutionAndCollect = (execution: ToolExecution) => {
        toolExecutions.push(execution);
        onToolExecution(execution);
    };

    onStep('NOC Agent: fetching incident details...');
    const incident: Incident = await executeTrackedTool('get_incident', { incident_id: incidentId }, onToolExecutionAndCollect, 'NOC Agent', 'Establishing the current incident state before investigating further.');

    onStep('NOC Agent: reconstructing incident timeline...');
    await executeTrackedTool('get_incident_timeline', { incident_id: incidentId }, onToolExecutionAndCollect, 'NOC Agent', 'Sequencing events to see what happened just before the incident.');

    onStep('NOC Agent: checking dependency health...');
    await executeTrackedTool('get_dependencies', { service_id: incident.service }, onToolExecutionAndCollect, 'NOC Agent', 'Ruling out a broader platform issue by checking dependent services.');

    onStep('Developer Agent: correlating deployment history...');
    await executeTrackedTool('get_deployment_history', { service_id: incident.service }, onToolExecutionAndCollect, 'Developer Agent', 'Checking deployment history because the incident began shortly after a production deployment.');

    onStep('SRE Agent: checking service health...');
    await executeTrackedTool('get_service_health', { service_id: incident.service }, onToolExecutionAndCollect, 'SRE Agent', 'Checking current health signals for resource saturation.');

    onStep('SRE Agent: fetching service metrics...');
    await executeTrackedTool('get_metrics', { service_id: incident.service }, onToolExecutionAndCollect, 'SRE Agent', 'Pulling telemetry to quantify the severity of the degradation.');

    onStep('SRE Agent: comparing telemetry against healthy baseline...');
    await executeTrackedTool('compare_metrics', { incident_id: incidentId, service_id: incident.service }, onToolExecutionAndCollect, 'SRE Agent', 'Comparing against baseline to measure how far metrics have drifted.');

    onStep('Developer Agent: querying service logs...');
    await executeTrackedTool('get_logs', { service_id: incident.service }, onToolExecutionAndCollect, 'Developer Agent', 'Reviewing logs for errors that would explain a deployment regression.');

    onStep('Developer Agent: correlating deployment, telemetry and log signals...');
    await executeTrackedTool('correlate_events', { incident_id: incidentId, service_id: incident.service }, onToolExecutionAndCollect, 'Developer Agent', 'Cross-referencing the deployment, metrics and logs for a consistent causal chain.');

    onStep('SOC Agent: reviewing consolidated evidence for security signals...');
    await executeTrackedTool('get_incident_evidence', { incident_id: incidentId }, onToolExecutionAndCollect, 'SOC Agent', 'Ruling out a security-related cause before accepting an operational explanation.');

    onStep('Incident Commander: running evidence-based diagnostic...');
    await executeTrackedTool('run_diagnostic', { incident_id: incidentId, service_id: incident.service }, onToolExecutionAndCollect, 'Incident Commander', "Running a final automated diagnostic to cross-check the agents' conclusions.");

    onStep('Incident Commander: arbitrating agent disagreement and analyzing root cause...');
    const investigationResult = analyzeEvidence(incident, toolExecutions);

    // This callback is just to satisfy the old signature, can be removed later
    investigationResult.rawEvidence.forEach(onRawEvidence);

    if (investigationResult.commander) {
        onStep('Incident Commander: recording investigation finding...');
        await executeTrackedTool('create_investigation_finding', {
            incident_id: incidentId,
            finding: `${investigationResult.commander.rootCause} (confidence ${investigationResult.commander.confidence}%).`,
        }, onToolExecutionAndCollect, 'Incident Commander', 'Storing the arbitrated conclusion for operator review.');
    }

    return investigationResult;
};
