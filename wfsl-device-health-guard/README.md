{
  "name": "wfsl-device-health-guard",
  "version": "0.1.0",
  "description": "Deterministic device health inspection and remediation tooling for Windows engineering workstations.",
  "type": "module",
  "bin": {
    "wfsl-health": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "verify": "node dist/index.js --verify"
  },
  "keywords": [
    "wfsl",
    "device-health",
    "windows",
    "powershell",
    "compliance",
    "evidence",
    "deterministic"
  ],
  "author": "Wynergy Fibre Solutions Ltd",
  "license": "WFSL-OpenCore",
  "devDependencies": {
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2"
  }
}
