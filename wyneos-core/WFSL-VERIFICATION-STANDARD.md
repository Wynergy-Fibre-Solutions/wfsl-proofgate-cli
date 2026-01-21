WFSL VERIFICATION STANDARD

Version: 1.0

Status: Foundational



Purpose



This standard defines the minimum requirements for a WFSL system to be described as verified.



Verification at WFSL means the system has been executed on a real, unprepared machine, without trusting the host platform, and with behaviour supported by evidence rather than claims.



Anything not meeting this standard is unverified.



Evidence Over Assertion



No statement about behaviour, safety, determinism, or correctness is valid without supporting evidence.



Console output, logs, and narrative descriptions are not evidence.



Evidence must be machine-verifiable.



Non-Destructive Verification



Verification must not alter the host system.



Forbidden actions include:



Changing execution policy

Editing registry values

Installing software

Modifying system configuration

Starting, stopping, or reconfiguring services

Writing outside the designated evidence directory



If verification requires mutation, the system is not verifiable.



Explicit Execution Context



All verification runs must explicitly declare:



Shell used

Runtime version

Privilege level

Profile loading state

Invocation method



Implicit execution is forbidden.



Deterministic Evidence Emission



Verification must emit structured evidence in deterministic formats.



Requirements:



Stable key ordering

Explicit nulls for missing data

Failure states captured as data

No silent success



Repeated runs must produce comparable artefacts.



Failure Is a Valid Outcome



Verification may fail.



A failed run is acceptable only if:



The failure is captured as evidence

The cause is attributable

No system state is mutated



Suppressed or retried failures invalidate verification.



Required Repository Structure



Every WFSL repository claiming verification must contain:



VERIFY.md

evidence/example/environment.json

evidence/example/execution-context.json

evidence/example/run-001.json

evidence/example/verification-summary.md

scripts/verify.ps1



Evidence is append-only.

Past evidence must never be edited or deleted.



Execution Rules



All verification must be executed with:



No profile loading

No elevation

Explicit script invocation

Declared execution policy bypass if used



Verification observes. It does not fix.



Versioning



When verification is complete:



Evidence is committed in a dedicated commit

A tag is applied using the format verified-v1



Tags are immutable.



Scope



This standard applies to:



Open source repositories

Internal WFSL tooling

Commercial offerings

Demonstrations used for sales or assurance



No exceptions exist.



Close



WFSL does not trade in promises.



WFSL publishes evidence.



Verification is not a phase.

It is the cost of credibility.

