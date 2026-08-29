# NexusOps

NexusOps is an agent-native command center for enterprise operations. It is a simulated SRE/NOC workspace where humans investigate incidents and compatible browser agents use WebMCP tools to retrieve the same structured operational evidence.

## Why WebMCP?

NexusOps exposes capabilities directly from the web page via the browser-native `document.modelContext.registerTool(...)` API. There is no remote MCP server or chatbot proxy: an agent can call `get_metrics`, `get_logs`, or `run_diagnostic`, receive structured JSON, and leave the final decision with the human operator.

## Available WebMCP tools

Observation: `get_services`, `get_service_health`, `get_incident`, `get_metrics`, `get_logs`, `get_dependencies`, `get_deployment_history`.

Investigation: `run_diagnostic`, `compare_metrics`, `get_incident_timeline`, `correlate_events`.

## Human + agent collaboration

A human opens INC-1042, an agent gathers correlated evidence through the tools, and the human reviews the evidence before approving an operational decision. The Agent Activity view shows real invocations from the browser WebMCP execution mechanism.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The simulated environment requires no credentials or environment variables.

## Test WebMCP

Use Chrome with WebMCP enabled, or a compatible browser agent. Open the WebMCP Tools page to confirm the 11 registered capabilities. Ask the agent to call `get_service_health` with `service_id: payment-api`, then inspect Agent Activity. On unsupported browsers the UI remains fully usable and the tool registry explains the browser bridge status.

## Deployment

Deploy this Next.js project to Vercel with the default settings. No environment variables are required.

## Architecture

Next.js App Router + TypeScript + Tailwind CSS. `lib/nexus-data.ts` is the deterministic simulated data layer. `app/page.tsx` renders the command center and registers tools in a client-side effect using the official WebMCP API.

## License

MIT License. See `LICENSE`.
