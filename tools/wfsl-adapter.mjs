import crypto from "node:crypto";
import fs from "node:fs";

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function deepSort(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deepSort);
  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = deepSort(value[k]);
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(deepSort(value));
}

function readStdinUtf8Normalised() {
  let raw = fs.readFileSync(0);

  // Strip UTF-16 NUL bytes if present
  if (raw.includes(0x00)) {
    raw = Buffer.from(raw.toString("utf16le"));
  }

  let text = raw.toString("utf8");

  // Strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  return text;
}

function nowUtcIso() {
  return new Date().toISOString();
}

function fail(message) {
  const err = {
    error: {
      schema_version: "wfsl-error.v1",
      timestamp_utc: nowUtcIso(),
      error_class: "WFSL_ADAPTER_FAILURE",
      message,
    },
  };
  process.stdout.write(stableStringify(err));
  process.exitCode = 1;
}

try {
  const rawText = readStdinUtf8Normalised();

  if (!rawText || !rawText.trim()) {
    fail("No input on stdin. Pipe a tool output into wfsl-adapter.mjs");
  }

  const native_output_hash = `sha256:${sha256(rawText)}`;

  let native;
  let native_kind = "text";
  try {
    native = JSON.parse(rawText);
    native_kind = "json";
  } catch {
    native = { raw_text: rawText };
  }

  const evidence = {
    schema_version: "wfsl-evidence.v1",
    timestamp_utc: nowUtcIso(),
    timestamp_trust: "system-clock",
    producer: {
      system: "wfsl-proofgate-cli",
      component: "wfsl-adapter",
      language: "nodejs",
    },
    payload: {
      evidence_class: "adapter-wrap",
      native_kind,
      native_output_hash,
      note: "Native tool output wrapped into WFSL Evidence v1 by wfsl-proofgate-cli adapter",
    },
    native,
  };

  const canonical = stableStringify(evidence);
  const hash = sha256(canonical);

  process.stdout.write(stableStringify({ evidence, hash }));
} catch (e) {
  fail(e instanceof Error ? e.message : "Unknown adapter failure");
}
