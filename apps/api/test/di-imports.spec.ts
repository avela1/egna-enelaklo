/**
 * Guard: NestJS resolves constructor dependencies from the TypeScript
 * `design:paramtypes` metadata. A class imported with `import type` is erased
 * at compile time, so the metadata becomes `Function` and the DI container
 * fails at boot with "Nest can't resolve dependencies ... Function".
 *
 * This test reads the source and fails when any class marked `@Injectable()`
 * is imported with `import type` (or an inline `type` specifier) anywhere in
 * the API — including multi-line import blocks. Type-only imports of plain
 * types (Prisma.Session, RequestMeta, express Response, ...) are fine and are
 * not flagged.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const API_ROOT = join(__dirname, '..', 'src');

function listSourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listSourceFiles(full));
      continue;
    }
    if (entry.endsWith('.ts')) files.push(full);
  }

  return files;
}

/** Line number (1 based) of the character at the given source index. */
function lineOf(source: string, index: number | undefined): number {
  return source.slice(0, index ?? 0).split('\n').length;
}

describe('dependency injection metadata', () => {
  it('never imports an @Injectable class as a type-only import', () => {
    const files = listSourceFiles(API_ROOT);

    const injectables = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/@Injectable\(\)\s*\nexport class (\w+)/g)) {
        if (match[1]) injectables.add(match[1]);
      }
    }

    expect(injectables.size).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const file of files) {
      const relative = join(file).replace(API_ROOT, 'src');
      const source = readFileSync(file, 'utf8');

      // Every import clause of the file: `import type {...}` and `import {type A, B}`.
      for (const match of source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from/g)) {
        const isTypeOnlyImport = Boolean(match[1]);
        const names = (match[2] ?? '')
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);

        for (const name of names) {
          const inlineType = /^type\s+(\w+)$/.exec(name);
          const bare = inlineType?.[1] ?? name;

          if (!injectables.has(bare)) continue;
          if (!isTypeOnlyImport && !inlineType) continue;

          offenders.push(`${relative}:${lineOf(source, match.index)} -> ${bare}`);
        }
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        'Injectable classes must be VALUE imports so Nest keeps their metadata ' +
          '(an `import type` erases the class and breaks dependency injection):\n' +
          offenders.map((entry) => `  ${entry}`).join('\n'),
      );
    }
  });
});
