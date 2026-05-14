-- M9 · Post-audit fix · Grant SELECT on sync_progress to authenticated.
-- Migration 02_catalog added sync_progress via ALTER TABLE but never re-granted
-- after 01_connections REVOKE ALL. This left sync_progress readable only by
-- service_role. PostgREST returns 403 when a client selects a column the role
-- lacks privilege on, blocking loadConnection() in use-shopify-connection.ts.
-- This migration closes that hole. No schema change.
GRANT SELECT (sync_progress) ON shopify_connections TO authenticated;
