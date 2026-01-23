import { runPowerShellFormattingProbe } from "./probe/powershellFormatting.js";
import { runDefenderPressureProbe } from "./probe/defenderPressure.js";
import { writeEvidenceFile } from "./evidence/write.js";

async function main() {
  const probes = [];

  probes.push(await runPowerShellFormattingProbe());
  probes.push(await runDefenderPressureProbe());

  const report = {
    tool: "wfsl-device-health-guard",
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    data: {
      probes
    }
  };

  await writeEvidenceFile(report);
  console.log(JSON.stringify(report, null, 2));
}

const mode = process.argv[2];
if (mode === "probe") {
  main();
} else {
  console.error("Usage: node dist/index.js probe");
  process.exit(1);
}
