import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = new URL('../src/', import.meta.url);
const EXTENSIONS = ['.ts', '.tsx', '/index.ts'];

const fileFor = (url) => {
  const path = fileURLToPath(url);

  if (existsSync(path) && statSync(path).isFile()) {
    return url.href;
  }

  const found = EXTENSIONS.map((extension) => `${path}${extension}`).find((candidate) => existsSync(candidate));

  return found ? pathToFileURL(found).href : null;
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(fileFor(new URL(specifier.slice(2), SRC)) ?? specifier, context);
  }

  const relative = specifier.startsWith('./') || specifier.startsWith('../');

  if (relative && context.parentURL?.startsWith(SRC.href)) {
    return nextResolve(fileFor(new URL(specifier, context.parentURL)) ?? specifier, context);
  }

  return nextResolve(specifier, context);
}
