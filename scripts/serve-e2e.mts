// Serves the production build on the E2E port with a throwaway database, unless E2E_MONGODB_URI points to one.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = process.env.E2E_PORT ?? '8921';
const externalUri = process.env.E2E_MONGODB_URI;
const memoryServer = externalUri ? null : await MongoMemoryServer.create();
const uri = externalUri ?? memoryServer!.getUri();

const NEXT_BIN = 'node_modules/next/dist/bin/next';

const server = spawn(process.execPath, [NEXT_BIN, 'start', '--port', PORT, '--hostname', '127.0.0.1'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MONGODB_URI: uri,
    MONGODB_DB: `openwrimo-e2e-${Date.now()}`,
    APP_URL: `http://127.0.0.1:${PORT}`,
    TRUST_PROXY: 'false',
    JWT_SECRET: randomBytes(48).toString('base64url'),
    STORAGE_DRIVER: 'local',
    LOCAL_UPLOADS_DIR: mkdtempSync(join(tmpdir(), 'openwrimo-e2e-uploads-')),
  },
});

const stopDatabase = async (): Promise<void> => {
  await memoryServer?.stop();
};

const forward = (signal: NodeJS.Signals): void => {
  server.kill(signal);
};

process.on('SIGINT', forward);
process.on('SIGTERM', forward);

server.on('exit', async (code) => {
  await stopDatabase();
  process.exit(code ?? 0);
});
