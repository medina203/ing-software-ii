import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const checks = [
  {
    file: '.env.example',
    required: ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'POSTGRES_PORT'],
  },
  {
    file: 'backend/.env.example',
    required: ['DATABASE_URL', 'JWT_SECRET', 'PORT', 'FRONTEND_URL'],
  },
  {
    file: 'frontend/.env.example',
    required: ['VITE_API_URL'],
  },
];

let failed = false;

for (const check of checks) {
  const path = resolve(root, check.file);
  if (!existsSync(path)) {
    console.error(`FALLA: no existe ${check.file}`);
    failed = true;
    continue;
  }

  const content = readFileSync(path, 'utf8');
  const missing = check.required.filter((key) => !content.includes(`${key}=`));

  if (missing.length > 0) {
    console.error(`FALLA: ${check.file} no define ${missing.join(', ')}`);
    failed = true;
    continue;
  }

  console.log(`OK: ${check.file}`);
}

if (failed) {
  process.exit(1);
}

console.log('OK: plantillas .env.example verificadas.');
