import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ajv = new Ajv2020({ allErrors: true, strict: false });

const schemaPath = path.resolve(__dirname, '../public/data/schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

const hacksDir = path.resolve(__dirname, '../public/data/hacks');
const files = fs
  .readdirSync(hacksDir)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .sort();

let totalErrors = 0;

for (const file of files) {
  const filePath = path.join(hacksDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const valid = validate(data);
  if (!valid) {
    console.log(`\n❌ ${file}:`);
    for (const err of validate.errors) {
      console.log(`  - ${err.instancePath || 'root'}: ${err.message}`);
    }
    totalErrors += validate.errors.length;
  } else {
    console.log(`✅ ${file}`);
  }
}

console.log(`\n${files.length} files checked, ${totalErrors} errors total.`);
process.exit(totalErrors > 0 ? 1 : 0);
