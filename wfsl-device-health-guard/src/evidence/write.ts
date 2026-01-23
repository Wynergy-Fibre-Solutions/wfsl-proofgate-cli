import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function writeEvidenceFile(data: unknown) {
  const evidenceDir = path.resolve(process.cwd(), "evidence");

  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const jsonPath = path.join(evidenceDir, "wfsl.health.report.json");
  const shaPath = path.join(evidenceDir, "wfsl.health.report.sha256");

  const payload = JSON.stringify(data, null, 2);
  fs.writeFileSync(jsonPath, payload, "utf-8");

  const hash = crypto
    .createHash("sha256")
    .update(payload, "utf-8")
    .digest("hex");

  fs.writeFileSync(shaPath, `${hash}\n`, "utf-8");
}
