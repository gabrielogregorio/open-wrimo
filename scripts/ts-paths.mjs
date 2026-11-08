// Lets a script under scripts/ import the app code: `@/…` resolves to src/, and the .ts extension that
// the app's own imports leave out is added. Node strips the types by itself (Node 24).
// Usage: node --import ./scripts/ts-paths.mjs scripts/<script>.mts
import { register } from 'node:module';

register('./ts-paths-hooks.mjs', import.meta.url);
