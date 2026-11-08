// Moves the images uploaded before 0.2.1 into their owner's folder (`<kind>/<userId>/<file>`) and
// rewrites every address that points at them. Only reads and reports, unless --apply is given.
// Usage: pnpm run images:owners -- --env <env file> [--apply]
// It reads only the database and the image storage, straight from the environment (or the env file):
//   MONGODB_URI (required) and MONGODB_DB (default openwrimo);
//   CLOUDINARY_URL and CLOUDINARY_FOLDER (default openwrimo) for Cloudinary,
//   or LOCAL_UPLOADS_DIR for images on the local disk when there is no CLOUDINARY_URL.
import { MongoClient } from 'mongodb';
import { createCloudinaryStorage, parseCloudinaryUrl } from '@/lib/storage/cloudinary';
import { createLocalStorage } from '@/lib/storage/local';
import { applyImageOwners, planImageOwners } from '@/lib/storage/owner-migration';
import type { OwnedImageStorage } from '@/lib/storage/storage';

const args = process.argv.slice(2);
const envFile = args.includes('--env') ? args[args.indexOf('--env') + 1] : undefined;
const apply = args.includes('--apply');

if (envFile) {
  process.loadEnvFile(envFile);
}

const fail = (message: string): never => {
  console.error(message);
  process.exit(2);
};

const {
  MONGODB_URI,
  MONGODB_DB = 'openwrimo',
  CLOUDINARY_URL,
  CLOUDINARY_FOLDER = 'openwrimo',
  LOCAL_UPLOADS_DIR,
} = process.env;

if (!MONGODB_URI?.startsWith('mongodb')) {
  fail('Set MONGODB_URI (mongodb:// or mongodb+srv://).');
}

if (!CLOUDINARY_URL && !LOCAL_UPLOADS_DIR) {
  fail('Set CLOUDINARY_URL (and CLOUDINARY_FOLDER if it is not openwrimo), or LOCAL_UPLOADS_DIR for local images.');
}

const where = CLOUDINARY_URL ? `Cloudinary folder ${CLOUDINARY_FOLDER}` : `local folder ${LOCAL_UPLOADS_DIR}`;
const storage = (): OwnedImageStorage =>
  CLOUDINARY_URL
    ? createCloudinaryStorage({ ...parseCloudinaryUrl(CLOUDINARY_URL), folder: CLOUDINARY_FOLDER })
    : createLocalStorage(LOCAL_UPLOADS_DIR!);
const client = await new MongoClient(MONGODB_URI!, { appName: 'openwrimo-image-owners' }).connect();
let exitCode = 0;

try {
  const database = client.db(MONGODB_DB);
  const plan = await planImageOwners(database);
  const bySource = Object.groupBy(plan.moves, (move) => move.source);
  const owners = new Set(plan.moves.map((move) => move.userId));

  console.log(`Database ${MONGODB_DB}, images in the ${where}.`);
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
    const result = await applyImageOwners(database, storage(), plan, (done, total) => {
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
