# NexusOps

**An agent-native operations control plane, built on WebMCP.**

NexusOps lets specialized operational agents — SRE, NOC, Developer, SOC, and an Incident Commander — investigate a live production incident by directly calling ~20 real WebMCP tools exposed on this page, disagree about the root cause, arbitrate that disagreement with evidence, and hand a proposed remediation to a human for explicit approval before anything runs.

## Why WebMCP

Incident response tooling today is either fully manual (a human clicking through dashboards) or fully automated (a bot with unsupervised write access). WebMCP makes a third mode possible: **an agent operating directly on the same page a human is looking at**, through capabilities the page itself defines and controls.

- **Why this use case fits WebMCP**: production operations tools are naturally page-shaped (services, incidents, metrics, logs) and naturally require both machine speed and human judgment — exactly what `document.modelContext.registerTool()` is for.
- **How WebMCP creates a better experience**: an agent can discover the full operational tool surface at runtime (`document.modelContext.registerTool`) instead of needing a bespoke API integration per tool; the human sees the exact same execution trace the agent produced, because it's the same page and the same tool calls.
- **What becomes possible that wasn't before**: a compatible agent can read incident state, correlate deployments/metrics/logs, and propose a fix — but the destructive action (`execute_remediation`) is registered as a tool the agent can only call successfully after a separate, human-only tool (`approve_remediation`) has already recorded approval. That safety boundary lives in the same tool graph the agent is exploring.

## How it works

```
OBSERVE → INVESTIGATE → MULTI-AGENT DISAGREEMENT → INCIDENT COMMANDER ARBITRATION
        → RECOMMEND → HUMAN APPROVAL → ACTION → VERIFY
```

The simulated scenario is **INC-1042 — P1 Payment API degradation**, caused by a deployment that changed database connection-pooling configuration.

### What humans can do
- Open the **WebMCP Tools** console, inspect any of the ~20 registered tools (schema, risk level, read/write classification, which agent roles use it), and execute it directly.
- Run the **Investigation** and watch four agent perspectives disagree, then see the Incident Commander's arbitrated conclusion.
- Review the recommended remediation's rationale and risk, then explicitly **approve** or decline it — the app never approves or executes on its own.
- Watch the **Agent Activity** audit trail, filterable by agent, to see every real tool call, its arguments, duration, and result.

### What agents can do
- Discover all registered capabilities via `document.modelContext.registerTool()` — no separate API docs or auth needed.
- Call observation tools (`get_services`, `get_metrics`, `get_logs`, `get_deployment_history`, ...) to gather real evidence.
- Call investigation tools (`compare_metrics`, `correlate_events`, `run_diagnostic`, `get_incident_timeline`) to build a case.
- Call `propose_remediation` to hand a human a reviewable recommendation — but `execute_remediation` will only succeed if a prior, human-attributed `approve_remediation` call has already been recorded for that incident and action.

### How agents collaborate
Four specialized **agent perspectives** (SRE, NOC, Developer, SOC) each read a different subset of the *same* evidence pool gathered by real tool calls — none of them can invent facts the tools didn't return. Each produces its own hypothesis, a deterministic confidence score derived from the actual numeric evidence (metric deltas, timing gaps, log matches — never randomized), and a list of supporting/contradicting evidence. An **Incident Commander** then arbitrates: it doesn't just pick the highest confidence score, it checks for cross-agent corroboration (agents independently pointing at the same evidence) and explains why the alternatives were rejected.

> Honesty note: these four "agents" are specialized, deterministic analysis perspectives over real WebMCP tool results — not four independent LLM calls. The collaboration that's real is the *tool-driven evidence pipeline* and the *human approval boundary*, which is the part that matters for WebMCP.

### Why human approval exists
`execute_remediation` is registered with `requiresApproval: true` in the tool catalog and is enforced in the data layer: it checks that a matching `approve_remediation` call was already recorded for that incident and action, and blocks otherwise. The UI makes this explicit — Recommend → Human Approval → Action → Verify are shown as separate, clearly labeled steps (AGENT / HUMAN / ACTION / VERIFICATION), and remediation never executes automatically.

## How WebMCP tools are implemented

Every tool is registered with the real, unmodified browser API:

```ts
await document.modelContext.registerTool({
  name: 'get_metrics',
  title: 'get metrics',
  description: 'Retrieve current telemetry metrics for a service.',
  inputSchema: { type: 'object', properties: { service_id: { type: 'string' } }, required: ['service_id'] },
  execute: (args) => executeTool('get_metrics', args),
});
```

`execute` calls the exact same function (`lib/nexus-data.ts#executeTool`) used by the in-app Tool Inspector and the Investigation engine — there is no separate "fake" execution path. If `document.modelContext` isn't available, the app reports **WebMCP unavailable** and disables execution; it does not silently fall back to a local-only mode.

Tool catalog metadata (category, `readOnly`/`mutating`, `riskLevel`, `requiresApproval`, `agentRoles`) lives in the application's own catalog (`lib/nexus-data.ts`) and is surfaced in the UI — it is not part of the WebMCP registration payload itself, so it can't affect wire compatibility.

## Architecture

- `lib/operational-state.ts` — the deterministic simulated operational data (services, incident, metrics, logs, deployments, timeline).
- `lib/data-access.ts` — `invokeTool()`, the real handler behind every tool, including the human-approval gate and post-remediation state mutation.
- `lib/nexus-data.ts` — the WebMCP tool catalog (schemas + metadata) and `executeTool()`, the single execution + audit-logging path used everywhere.
- `lib/investigation-engine.ts` — runs the real tool sequence, extracts evidence, builds the timeline/signals, generates the four agent perspectives, arbitrates them, and derives the causal chain — all from real tool results.
- `lib/activity-store.ts` — the shared Agent Activity audit trail (timestamp, agent, tool, args, duration, success, summary).
- `components/live-investigation.tsx` — the Investigation UI (execution trace, agent disagreement, Commander assessment, evidence graph, human-approval remediation panel).
- `app/page.tsx` — the shell, WebMCP tool registration effect, and the WebMCP Tool Console / Tool Inspector.

## Run locally

```bash
pnpm install
pnpm run dev
```

Open `http://localhost:3000`. No environment variables or credentials are required.

## Test WebMCP

Use Chrome with WebMCP enabled, or a compatible browser agent. Open **WebMCP Tools** to confirm the ~20 registered capabilities and execute one directly. Open **Investigation** and run it to see real tool calls populate the execution trace, agent disagreement, and Commander arbitration. Try prompts such as "Investigate the active P1 incident" or "Why is the Payment API degraded?" with a compatible agent, then check **Agent Activity** for the resulting audit trail.

## Demo flow

1. **Overview** — an active P1 incident is visible immediately.
2. **WebMCP Tools** — prove real registration by inspecting and executing one tool.
3. **Investigation** — run it; watch the WebMCP execution trace populate tool-by-tool.
4. **Agent Disagreement** — SRE, NOC, Developer and SOC each produce a hypothesis and confidence score from the same evidence.
5. **Incident Commander** — arbitrates the disagreement and explains why one hypothesis wins.
6. **Evidence / Causal Chain** — the deployment → config change → DB utilization → timeout → 5xx → latency → incident chain, derived from real data.
7. **Recommendation → Human Approval → Action → Verification** — a human explicitly approves before the simulated rollback executes and recovery is verified from real mutated state.
8. **Agent Activity** — the complete, filterable audit trail of everything that just happened.

## Deployment

Deployed via Vercel with default Next.js settings. No environment variables are required.

## License

MIT License. See `LICENSE`.


## License

MIT License. See `LICENSE`.
