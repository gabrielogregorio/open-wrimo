// Moves the images uploaded before 0.2.1 into their owner's folder (`<kind>/<userId>/<file>`) and
// rewrites every address that points at them. Only reads and reports, unless --apply is given.
// Usage: pnpm run images:owners -- --env <env file> [--apply]
// The env file needs MONGODB_URI, MONGODB_DB, JWT_SECRET and the storage settings, as the app does.
import { MongoClient } from 'mongodb';
import { parseEnvironment } from '@/lib/env';
import { storageFor } from '@/lib/storage';
import { applyImageOwners, planImageOwners } from '@/lib/storage/owner-migration';

const args = process.argv.slice(2);
const envFile = args.includes('--env') ? args[args.indexOf('--env') + 1] : undefined;
const apply = args.includes('--apply');

if (envFile) {
  process.loadEnvFile(envFile);
}

const environment = parseEnvironment(process.env);
const client = await new MongoClient(environment.MONGODB_URI, { appName: 'openwrimo-image-owners' }).connect();
let exitCode = 0;

try {
  const database = client.db(environment.MONGODB_DB);
  const plan = await planImageOwners(database);
  const bySource = Object.groupBy(plan.moves, (move) => move.source);
  const owners = new Set(plan.moves.map((move) => move.userId));

  console.log(`Database ${environment.MONGODB_DB}, images on ${environment.STORAGE_DRIVER}.`);
  console.log(`${plan.moves.length} images to move, belonging to ${owners.size} accounts:`);

  for (const [source, moves] of Object.entries(bySource)) {
    console.log(`  ${source}: ${moves?.length ?? 0}`);
  }

  for (const move of plan.moves.slice(0, 20)) {
    console.log(`  ${move.key} -> ${move.toKey}`);
  }

  if (plan.moves.length > 20) {
    console.log(`  … and ${plan.moves.length - 20} more`);
  }

  console.log(
    `${plan.unassigned.length} editor images shown by several accounts and uploaded by none (left as they are):`,
  );

  for (const image of plan.unassigned) {
    console.log(`  ${image.key} shown by ${image.userIds.join(', ')}`);
  }

  if (!apply) {
    console.log('Simulation only: nothing was changed. Run again with --apply to move the images.');
  } else {
    const result = await applyImageOwners(database, storageFor(environment), plan, (done, total) => {
      if (done % 10 === 0 || done === total) {
        console.log(`moved ${done} of ${total}`);
      }
    });

    console.log(`${result.moved.length} images moved, ${result.failed.length} failed.`);

    for (const failure of result.failed) {
      console.log(`  failed ${failure.key}: ${failure.error}`);
    }

    exitCode = result.failed.length > 0 ? 1 : 0;
  }
} finally {
  await client.close();
}

process.exit(exitCode);
