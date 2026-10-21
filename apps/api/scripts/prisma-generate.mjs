#!/usr/bin/env node
/**
 * Runs `prisma generate` before the API is type checked, tested or built.
 *
 * On Windows the generated Prisma engine (`query_engine-windows.dll.node`) is
 * locked while the API is running, so regenerating it fails with `EPERM ...
 * rename`. In that case the previously generated client is still valid and we
 * keep it, instead of blocking every other command. Any other failure is a
 * real error and stops the build.
 */
import { spawn } from 'node:child_process';

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['prisma', 'generate'];

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === 'win32',
});

let output = '';

const capture = (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stdout.write(text);
};

child.stdout.on('data', capture);
child.stderr.on('data', capture);

child.on('error', (error) => {
  process.stderr.write(`prisma generate could not be started: ${error.message}\n`);
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    process.exit(0);
  }

  const isLockedEngine =
    output.includes('EPERM') && output.includes('rename') && output.includes('query_engine');

  if (isLockedEngine) {
    process.stdout.write(
      '\n[prisma-generate] The Prisma engine is locked by a running API process.\n' +
        '[prisma-generate] Keeping the previously generated client. Stop `npm run dev` and run\n' +
        '[prisma-generate] `npm run prisma:generate -w @egna-enelaklo/api` if you changed the schema.\n',
    );
    process.exit(0);
  }

  process.exit(code ?? 1);
});
