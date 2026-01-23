/**
 * Evidence Emitter
 *
 * Responsible for producing deterministic evidence objects
 * suitable for hashing, signing, and archival.
 */

export interface EvidenceEnvelope<T> {
  tool: string;
  version: string;
  generatedAt: string;
  data: T;
}

export function emitEvidence<T>(
  tool: string,
  version: string,
  data: T
): EvidenceEnvelope<T> {
  return {
    tool,
    version,
    generatedAt: new Date().toISOString(),
    data
  };
}
