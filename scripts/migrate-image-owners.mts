// Copies the images uploaded before 0.2.1 into their owner's folder (`<kind>/<userId>/<file>`) and
// rewrites every address that points at them, keeping the originals. Only reads and reports by default.
// Usage: pnpm run images:owners -- --env <env file> [--apply | --undo | --remove-old]
//   --apply       copies the images and points everything at the copies; the originals stay
//   --undo        points everything back at the originals and deletes the copies
//   --remove-old  deletes the originals of the copied images; after this there is nothing to undo
// It reads only the database and the image storage, straight from the environment (or the env file):
//   MONGODB_URI (required) and MONGODB_DB (default openwrimo);
//   CLOUDINARY_URL and CLOUDINARY_FOLDER (default openwrimo) for Cloudinary,
//   or LOCAL_UPLOADS_DIR for images on the local disk when there is no CLOUDINARY_URL.
import { MongoClient } from 'mongodb';
import { createCloudinaryStorage, parseCloudinaryUrl } from '@/lib/storage/cloudinary';
import { createLocalStorage } from '@/lib/storage/local';
import {
  applyImageOwners,
  planImageOwners,
  removeOldImages,
  undoImageOwners,
  type OwnerMigrationResult,
} from '@/lib/storage/owner-migration';
import type { OwnedImageStorage } from '@/lib/storage/storage';

const args = process.argv.slice(2);
const envFile = args.includes('--env') ? args[args.indexOf('--env') + 1] : undefined;
const actions = ['--apply', '--undo', '--remove-old'].filter((flag) => args.includes(flag));

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
if (actions.length > 1) {
  fail('Choose one of --apply, --undo or --remove-old.');
}

const report = (what: string, result: OwnerMigrationResult): number => {
  console.log(`${result.done.length} ${what}, ${result.failed.length} failed.`);

  for (const failure of result.failed) {
    console.log(`  failed ${failure.key}: ${failure.error}`);
  }

  return result.failed.length > 0 ? 1 : 0;
};

const progress = (verb: string) => (done: number, total: number) => {
  if (done % 10 === 0 || done === total) {
    console.log(`${verb} ${done} of ${total}`);
  }
};

const client = await new MongoClient(MONGODB_URI!, { appName: 'openwrimo-image-owners' }).connect();
let exitCode = 0;

try {
  const database = client.db(MONGODB_DB);
  const copied = await database.collection('image_migrations').countDocuments();
  console.log(`Database ${MONGODB_DB}, images in the ${where}.`);
  console.log(`${copied} images already copied, with their originals kept (--undo or --remove-old).`);

  if (actions[0] === '--undo') {
    exitCode = report('images put back', await undoImageOwners(database, storage(), progress('put back')));
  } else if (actions[0] === '--remove-old') {
    exitCode = report('originals removed', await removeOldImages(database, storage(), progress('removed')));
  } else {
    const plan = await planImageOwners(database);
    const bySource = Object.groupBy(plan.moves, (move) => move.source);
    const owners = new Set(plan.moves.map((move) => move.userId));

    console.log(`${plan.moves.length} images to copy into their owner's folder, belonging to ${owners.size} accounts:`);

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

    if (actions[0] === '--apply') {
      exitCode = report('images copied', await applyImageOwners(database, storage(), plan, progress('copied')));
      console.log('The originals are kept: check the site, then run --remove-old, or --undo to go back.');
    } else {
      console.log('Simulation only: nothing was changed. Run again with --apply to copy the images.');
    }
  }
} finally {
  await client.close();
}

process.exit(exitCode);
