\## Purpose



WFSL ProofGate CLI is the primary operator-facing command-line interface for interacting with the WFSL platform.



It orchestrates evidence consumption, admission checks, and verification flows by coordinating upstream WFSL components and presenting explicit, auditable outcomes.



This tool is the \*\*controlled entry point\*\* for demonstrations, operator workflows, and system-level validation.



---



\## Functional Guarantees



WFSL ProofGate CLI provides:



\- Deterministic command execution

\- Explicit input and output boundaries

\- Evidence-referenced operations

\- Machine-verifiable results suitable for audit and replay



All operations are declarative and traceable.



---



\## What This Component Does Not Do



WFSL ProofGate CLI explicitly does \*\*not\*\*:



\- Emit primary truth

\- Generate evidence independently

\- Perform inference

\- Bypass admission or verification layers

\- Execute uncontrolled system actions



It coordinates and reports only.



---



\## Evidence and Dependency Flow



WFSL ProofGate CLI consumes and coordinates outputs from:



\- wfsl-evidence-guard (Platform Tier-0)

\- wfsl-shell-guard (Platform Tier-1), when available

\- wfsl-admission-guard (Platform Tier-2), when available



If required upstream components are missing or unverifiable, commands must fail explicitly.



---



\## Classification and Licence



\*\*Classification:\*\* WFSL Open  

\*\*Licence:\*\* Apache License 2.0



This repository is open-source and auditable.  

It represents the principal interface layer for WFSL platform interaction.



---



\## Execution and Verification



Execution characteristics:



\- Deterministic command parsing

\- Structured, replayable outputs

\- Offline-capable verification

\- Explicit success or failure states



Verification consists of re-running commands with identical inputs and confirming identical outputs.



---



\## Role in the WFSL Platform



WFSL ProofGate CLI occupies a \*\*coordination tier\*\* above evidence, boundary, and admission layers.



It is used by:

\- Operators

\- Test harnesses

\- Demonstration environments

\- Governance workflows



No WFSL demonstration or operator interaction should occur without passing through this interface.



---



\## Stability



This repository is considered \*\*active\*\* once command determinism and dependency validation are verified.



Behavioural changes require explicit versioning and proof.

---

## WFSL Platform Membership

**Platforms:**  
- WFSL Evidence Platform  
- WFSL Verification Platform  

**Role:**  
Provides deterministic command-line tooling for generating, validating, and reporting verification artefacts across WFSL platforms.

**Guarantees:**  
- Deterministic artefact generation  
- Evidence integrity validation  
- Verifiable status outputs  
- No behavioural inference  
- No hidden control or telemetry  

**Boundary:**  
This repository operates within WFSL evidence and verification boundaries and does not perform surveillance, attribution, or policy enforcement.

See: WFSL-PLATFORM-INDEX.md