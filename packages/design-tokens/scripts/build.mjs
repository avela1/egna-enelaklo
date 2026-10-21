#!/usr/bin/env node
/**
 * Builds the egna-enelaklo design tokens into:
 *   dist/tokens.css          -> CSS custom properties consumed by apps/web
 *   dist/tailwind-preset.js  -> Tailwind preset (ESM) consumed by apps/web
 *   dist/tailwind-preset.d.ts-> types for the preset
 *
 * Run with `npm run build -w @egna-enelaklo/design-tokens`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..');
const tokensPath = join(packageRoot, 'tokens.json');
const outDir = join(packageRoot, 'dist');

/** @typedef {{ color: Record<string, any>, font: Record<string, any>, fontSize: Record<string, any>, radius: Record<string, any>, control: Record<string, any>, focus: Record<string, any>, statusChip: Record<string, any>, space: Record<string, string> }} Tokens */

/** @type {Tokens} */
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

const kebab = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Flattens a nested token group into `css-var -> value` pairs.
 * A `DEFAULT` key collapses onto its parent (e.g. `color.line.DEFAULT` -> `--color-line`).
 * @param {Record<string, any>} node
 * @param {string[]} prefix
 * @param {(path: string[]) => string} [nameOf]
 * @returns {[string, string][]}
 */
function flatten(node, prefix = [], nameOf = (path) => `--${path.join('-').toLowerCase()}`) {
  /** @type {[string, string][]} */
  const entries = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'DEFAULT') {
      entries.push([nameOf(prefix), String(value)]);
      continue;
    }
    const path = [...prefix, key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flatten(value, path, nameOf));
    } else {
      entries.push([nameOf(path), String(value)]);
    }
  }
  return entries;
}

function buildCss() {
  /** @type {string[]} */
  const lines = [
    '/**',
    ' * egna-enelaklo design tokens - GENERATED FILE, do not edit by hand.',
    ' * Source: packages/design-tokens/tokens.json',
    ' */',
    ':root {',
  ];

  const push = (entries) => {
    for (const [name, value] of entries) lines.push(`  ${name}: ${value};`);
  };

  push(flatten(tokens.color, ['color']));
  push(
    flatten(tokens.font, ['font'], (path) => `--${path.join('-').toLowerCase()}`).filter(
      ([name]) => !name.endsWith('-weights'),
    ),
  );
  push(flatten(tokens.radius, ['radius']));
  push(
    Object.entries(tokens.control).map(([key, value]) => [
      `--control-${kebab(key)}`,
      String(value),
    ]),
  );
  push(
    Object.entries(tokens.focus).map(([key, value]) => [`--focus-${kebab(key)}`, String(value)]),
  );
  push(
    Object.entries(tokens.statusChip).map(([key, value]) => [
      `--status-chip-${kebab(key)}`,
      String(value),
    ]),
  );
  push(Object.entries(tokens.space).map(([key, value]) => [`--space-${key}`, String(value)]));

  for (const [name, value] of Object.entries(tokens.fontSize)) {
    lines.push(`  --text-${name.toLowerCase()}-size: ${value.size};`);
    lines.push(`  --text-${name.toLowerCase()}-line-height: ${value.lineHeight};`);
    if (value.letterSpacing) {
      lines.push(`  --text-${name.toLowerCase()}-letter-spacing: ${value.letterSpacing};`);
    }
    if (value.fontWeight)
      lines.push(`  --text-${name.toLowerCase()}-font-weight: ${value.fontWeight};`);
  }

  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

function buildPreset() {
  return `/**
 * egna-enelaklo Tailwind preset - GENERATED FILE, do not edit by hand.
 * Source: packages/design-tokens/tokens.json
 */

/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          500: 'var(--color-brand-500)',
          700: 'var(--color-brand-700)',
          DEFAULT: 'var(--color-brand-500)',
        },
        ink: {
          500: 'var(--color-ink-500)',
          700: 'var(--color-ink-700)',
          900: 'var(--color-ink-900)',
          DEFAULT: 'var(--color-ink-900)',
        },
        line: { DEFAULT: 'var(--color-line)' },
        surface: { DEFAULT: 'var(--color-surface)' },
        canvas: { DEFAULT: 'var(--color-canvas)' },
        warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
        danger: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
        chip: { bg: 'var(--color-chip-bg)', text: 'var(--color-chip-text)' },
        logo: { speed: 'var(--color-logo-speed)' },
      },
      fontFamily: {
        heading: 'var(--font-heading-family)',
        body: 'var(--font-body-family)',
        ethiopic: 'var(--font-ethiopic-family)',
      },
      fontSize: {
        pageTitle: [
          'var(--text-pagetitle-size)',
          {
            lineHeight: 'var(--text-pagetitle-line-height)',
            letterSpacing: 'var(--text-pagetitle-letter-spacing)',
            fontWeight: '700',
          },
        ],
        sectionTitle: [
          'var(--text-sectiontitle-size)',
          {
            lineHeight: 'var(--text-sectiontitle-line-height)',
            letterSpacing: 'var(--text-sectiontitle-letter-spacing)',
            fontWeight: '700',
          },
        ],
        body: ['var(--text-body-size)', { lineHeight: 'var(--text-body-line-height)' }],
        label: ['var(--text-label-size)', { lineHeight: 'var(--text-label-line-height)', fontWeight: '600' }],
        chip: ['var(--text-chip-size)', { lineHeight: 'var(--text-chip-line-height)', fontWeight: '700' }],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      minHeight: {
        control: 'var(--control-min-height)',
        input: 'var(--control-input-height)',
        primary: 'var(--control-primary-button-height)',
        large: 'var(--control-large-button-height)',
      },
      height: {
        control: 'var(--control-min-height)',
        input: 'var(--control-input-height)',
        primary: 'var(--control-primary-button-height)',
        large: 'var(--control-large-button-height)',
      },
      boxShadow: {
        none: 'none',
      },
      maxWidth: {
        tasker: '1200px',
      },
    },
  },
};

export default preset;
export { preset };
`;
}

function buildPresetTypes() {
  return `import type { Config } from 'tailwindcss';

declare const preset: Config;
export { preset };
export default preset;
`;
}

function build() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'tokens.css'), buildCss(), 'utf8');
  writeFileSync(join(outDir, 'tailwind-preset.js'), buildPreset(), 'utf8');
  writeFileSync(join(outDir, 'tailwind-preset.d.ts'), buildPresetTypes(), 'utf8');
  process.stdout.write('design-tokens: wrote dist/tokens.css and dist/tailwind-preset.js\n');
}

build();

if (process.argv.includes('--watch')) {
  process.stdout.write('design-tokens: watch mode is not implemented yet, rebuild manually.\n');
}
