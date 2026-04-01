import type { ConnectionType, EndpointSemantic } from '@cloudblocks/schema';

/** Human-readable display labels for legacy ConnectionType values. */
export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  dataflow: 'Data Flow',
  http: 'HTTP',
  internal: 'Internal',
  data: 'Data',
  async: 'Async',
};

/** Human-readable display labels for v4 EndpointSemantic values. */
export const ENDPOINT_SEMANTIC_LABELS: Record<EndpointSemantic, string> = {
  http: 'HTTP',
  event: 'Event',
  data: 'Data',
};

/** Resolve a display label for an EndpointSemantic. Falls back to the raw value. */
export function resolveSemanticLabel(semantic: EndpointSemantic | string | undefined): string {
  if (!semantic) return 'Unknown';
  return (ENDPOINT_SEMANTIC_LABELS as Record<string, string>)[semantic] ?? semantic;
}
