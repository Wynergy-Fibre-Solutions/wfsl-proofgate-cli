\# WFSL Licence Core



WFSL Licence Core enforces \*\*paid authority over outputs\*\*, not users.



> Evidence without authority is non-authoritative.



This module provides cryptographic enforcement so that only paid, authorised executions can produce \*\*verifiable, authoritative artefacts\*\*.



---



\## What this solves



Most software can be run without permission once installed.



WFSL takes a different approach:



\- You can run the software.

\- You cannot mint legitimacy without authority.

\- Authority is cryptographically provable.

\- Outputs can be verified independently.



Fraud does not scale. Legitimacy does.



---



\## How it works (end to end)



1\. \*\*Entitlement verification\*\*  

&nbsp;  A signed licence token is verified using a WFSL public key.



2\. \*\*Execution gating\*\*  

&nbsp;  Pro-only operations require a valid entitlement.



3\. \*\*Authoritative output\*\*  

&nbsp;  Pro executions emit a signed receipt bound to the output hash.



4\. \*\*Independent verification\*\*  

&nbsp;  Anyone can verify a receipt offline using the public key.



No telemetry. No surveillance. No DRM tricks.



---



\## Demo (real repo)



This pattern is wired into `wfsl-evidence-guard`.



\### Community mode

```sh

node dist/cli.js



