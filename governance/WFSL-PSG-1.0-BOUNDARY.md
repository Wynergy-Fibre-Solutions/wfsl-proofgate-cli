\# WFSL-PSG-1.0 Boundary Contract (ProofGate)



ProofGate adapters and wrappers treat PowerShell as an untrusted emitter.



Canonical standard:

\- wfsl-standards/powerShell/WFSL-PSG-1.0.md



Boundary requirements:

\- Consumers SHOULD expect UTF-16 and BOM artefacts from PowerShell tooling.

\- Consumers MUST enforce JSON-root correctness for machine verification workflows.

\- Non-JSON stdout or human language contamination may be wrapped as evidence\_class=adapter-wrap with denial signalling.



Operational rule:

\- Stdout from governed PowerShell guards must be treated as a single-object JSON contract.

\- Any deviation is a governed failure condition and must be recorded deterministically.



