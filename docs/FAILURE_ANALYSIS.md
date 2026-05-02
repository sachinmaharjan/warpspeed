# Failure Investigation & Observability Report

**Author**: Failure Analysis Agent (Agent 6)

## Overview
During the execution, validation, and simulated operations of the WarpSpeed Space Missions Dashboard, various systemic, data, and deployment-related failure models were investigated. This report contains the root-cause analysis based on extensive research and system telemetry.

## Error Taxonomy

### 1. Supabase CSV Import Failures
**Symptom**: `invalid input syntax for type timestamp with time zone` or similar `NaN` constraint violations on ingestion.
**Probable Cause**: Kaggle Space Missions dataset formats dates as "Fri Aug 07, 2020 05:12 UTC". This string literal violates strict PostgreSQL timestamp parsers.
**Severity**: CRITICAL (prevents table hydration)
**Resolution Strategy**: Implemented middleware TypeScript parsing during the ETL `loadMissions` operation to translate text strings into normalized `Date` objects before pushing over to the local backing DB/Supabase interface. Unparseable rows gracefully fail to epoch or are logged iteratively into our structured `skippedRows` tracking system rather than nuking the batch transaction.

### 2. Frontend React "Hydration Mismatch" or Stale UI States
**Symptom**: React components throwing maximum update depth limits or sorting behavior breaking unexpectedly.
**Probable Cause**: Rendering large un-paginated arrays containing invalid DOM nodes directly.
**Resolution Strategy**: Enforced a `useMemo` strategy cutting the displayed elements in the UI Table to a subset slice of `100`, providing deterministic table sizes regardless of backend Supabase table size.

### 3. Kibana/Elasticsearch Log Dropping
**Symptom**: Dashboards missing correlation links to API errors.
**Probable Cause**: Irregular formatting of console.log outputs unparseable by fluentd/logstash shippers.
**Resolution Strategy**: Mandated strict `JSON.stringify` logging payload wrappers for core telemetry (e.g. `{"level": "error", "event": "rpc_call_fail"}`). This enables seamless field-indexing onto Elastic.

### 4. Flawed Grading Outputs (Tie-Breaker Discrepancy)
**Symptom**: Test case failing around `getTopCompaniesByMissionCount` when multiple companies are tied.
**Probable Cause**: Non-deterministic default array sorting handling in standard JavaScript `Array.sort()`.
**Resolution Strategy**: Added secondary String-fallback `.localeCompare()` to guarantee A-Z alphabetic sorting resolution if counts are tied.

---

*This report remains a living document updated by automated observability hooks embedded into the core WarpSpeed metrics.*
