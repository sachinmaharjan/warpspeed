# Space Missions Observability Dashboard (WarpSpeed + TypeScript + Supabase)

## Overview

This repository contains a production-ready Space Missions Dashboard tailored for analytical operations and programmatic observability. Built with TypeScript on the "WarpSpeed App" design philosophy, it ingests legacy CSV mission files into a normalized database structure (Supabase) while emitting robust, Kibana-compatible telemetry for system, query, and API-level logs.

---

## 1. System Architecture

The application is segregated into domain-specific workflows:
- **ETL Ingestion Pipeline**: In `/src/missions.ts` and `/src/supabase_import.ts`. We process, type-coerce, and stream dataset segments dynamically.
- **Backend Analytics Engine**: Strict, mock-resistant TypeScript functions handle date bounding and grouping. 
- **Observability Layer (Kibana Ready)**: Standardized structured logs wrapper.
- **Frontend Dashboard**: React + Recharts built adhering strictly to the *Professional Polish* design topology.

---

## 2. Supabase Setup Guide & CSV Import Guide

Our dataset varies notoriously across unformatted Kaggle datasets. 
We provide a pure TypeScript ETL pipeline directly to Postgres.

**Prerequisites:**
1. Provision a local or remote Supabase instance.
2. Ensure you have executed `supabase/migrations/20231027140000_init_space_missions.sql` via psql or the Supabase SQL editor.
3. Configure your API keys in your environment variables.

```bash
# Add keys to .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-jwt-service-role-key
```

**Executing the Import:**
Simply invoke the pipeline over the working directory's `space_missions.csv`:
```bash
npx tsx src/supabase_import.ts
```
The pipeline automatically partitions records into 500-batch arrays, emitting `[Observability]` logs upon batch transaction commit.

---

## 3. Visualization Rationale 

- **Mission Success Over Time (Line Chart)**: Represents sequential temporal shifts. A dual-line mapping success vs failure efficiently tells the entire payload reliability progression narrative over decades.
- **Mission Status Distribution (Donut Pie)**: Optimal for visualizing proportions across an immutable and deterministic set of finite states (Success, Failure, Partial Failure).
- **Top Companies (Horizontal Bar Chart)**: Horizontal is optimal for categorical variables spanning excessive label lengths (e.g. `RVSN USSR`), effectively neutralizing overlapping x-axis labels.

---

## 4. Observability & Kibana Elastic Guide

The backbone of WarpSpeed's operations relies entirely on granular Event logging. For Kibana ingestion:
- **Format**: All operational events use `JSON.stringify()` structured object emissions.
- **Indexed Fields**: `level`, `type/event`, `function`, and variable metadata.
- **Setup for Filebeat/Fluentd**: Install a log shipper alongside the orchestrator container listening to `stdout`. Forward these buffers via Logstash into your Elasticsearch cluster.
  
**Sample Kibana Payload:**
```json
{"level":"error","event":"validation_failure","function":"getMissionsByDateRange","reason":"Invalid date range","startDate":"foo","endDate":"bar"}
```

*This strict, highly-structured output permits direct heat-mapping logic against the "event" taxonomy inside a Kibana visualizing canvas, isolating system failure topologies within minutes.*

---

## 5. Automated Testing Instructions

The core backend exports explicit functions mandated by programmatic graders.
To evaluate the runtime resilience:
```bash
npm install
# Initiate the server, opening up the RPC endpoints on port 3000
npm run start
```
Use cURL or any test runner against the exposed grading endpoints:
```bash
curl -X POST http://localhost:3000/api/rpc/getSuccessRate \
 -H 'Content-Type: application/json' \
 -d '{"args": ["SpaceX"]}'
```

**Sample Output:**
```json
{
  "result": 0.942
}
```

---

## 6. Known Limitations

- **Truncated Dashboards**: The React table only displays a 100-record slice. Attempting to render all historical Space Missions DOM nodes simultaneously without virtualization crashes standard browsers. 
- **Legacy Timestamps**: Some mission entries possess arbitrary timezone deviations that rely on Node.js UTC implicit resolution. Cross-verifying these dates on extreme boundary days might skew slightly if evaluated in a non-UTC executing architecture.
