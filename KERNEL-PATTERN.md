\# Kernel Pattern Standard



Version: 1.0  

Declared: 2026-01-04 (UTC)



\## Purpose



This document defines the mandatory pattern for any kernel within the WFSL / Wynergy ecosystem.



A kernel is the smallest truth-bearing execution unit.

Everything else is built above it.



\## What qualifies as a kernel



A component qualifies as a kernel only if all are true:



1\. It has a single, explicit input boundary

2\. Input is shaped into a declared, stable structure

3\. Handling is deterministic for a given input class

4\. Evidence is emitted for every accepted input

5\. Behaviour is replayable from evidence alone



If any condition is false, the component is not a kernel.



\## Mandatory kernel properties



Every kernel MUST:



\- Enforce strict schema boundaries

\- Reject invalid input explicitly

\- Emit append-only evidence

\- Avoid side effects

\- Avoid external calls

\- Avoid heuristics

\- Avoid intelligence or optimisation

\- Be explainable without context



\## Forbidden behaviour inside kernels



A kernel MUST NOT:



\- Learn

\- Predict

\- Optimise

\- Execute workflows

\- Call external systems

\- Modify global state

\- Perform policy tuning

\- Make autonomous decisions

\- Hide or summarise evidence



Any such behaviour is above-kernel by definition.



\## Evidence model



Kernels produce evidence, not outcomes.



Evidence MUST be:

\- Append-only

\- Timestamped

\- Structured

\- Replayable

\- Sealable



Runtime data MAY exist outside version control.

Seals and summaries MUST be versioned.



\## Sealing and replay



Every kernel SHOULD support:



\- Hash-based sealing of runtime evidence

\- Replay scripts that reconstruct behaviour

\- Human-readable summaries

\- Independent verification



\## Reference implementations



\- ACE Public Intake Kernel — live, sealed, replayable

\- WyneOS Kernel — mapped, not yet instantiated

\- TriggerGuard Kernel — mapped, not yet instantiated



\## Review rule



Any future component claiming to be a kernel MUST be reviewed against this document.



If it does not comply, it is not a kernel.



