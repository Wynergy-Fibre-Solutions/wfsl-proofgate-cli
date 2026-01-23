import fs from "fs";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv({
  allErrors: true,
  strict: false
});

addFormats(ajv);

const schemaPath = "./schema/wfsl.health.report.schema.json";
const dataPath = "./evidence/wfsl.health.report.json";

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const validate = ajv.compile(schema);
const valid = validate(data);

if (!valid) {
  console.error("SCHEMA_VALIDATION_FAILED");
  console.error(validate.errors);
  process.exit(1);
}

console.log("SCHEMA_VALIDATION_PASS");
