import { cp, mkdir } from 'node:fs/promises';
const target = new URL('../dist/assets/', import.meta.url);
await mkdir(target, { recursive: true });
await cp(new URL('../src/assets/', import.meta.url), target, { recursive: true });
