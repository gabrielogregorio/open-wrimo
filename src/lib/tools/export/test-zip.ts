// Builds zips the way word processors do (DEFLATE, method 8), for the tests of the zip reader and
// the converter. Only tests import it.
import { crc32, utf8, type ZipInput } from './zip';

export const deflateRaw = async (data: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream('deflate-raw'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
};

type DeflatedZipOptions = { descriptor?: boolean; method?: number };

const DESCRIPTOR_FLAG = 0x0008;

type EntryParts = { local: Uint8Array; central: Uint8Array };

const entryParts = async (
  input: ZipInput,
  offset: number,
  { descriptor, method }: Required<DeflatedZipOptions>,
): Promise<EntryParts> => {
  const name = utf8(input.name);
  const data = typeof input.data === 'string' ? utf8(input.data) : input.data;
  const packed = method === 8 ? await deflateRaw(data) : data;
  const crc = crc32(data);
  const flags = descriptor ? DESCRIPTOR_FLAG : 0;
  const local = new Uint8Array(30 + name.length + packed.length + (descriptor ? 16 : 0));
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(6, flags, true);
  localView.setUint16(8, method, true);
  localView.setUint16(26, name.length, true);
  local.set(name, 30);
  local.set(packed, 30 + name.length);
  // With a data descriptor the local header keeps zeros and the real values follow the data.
  const valuesAt = descriptor ? 30 + name.length + packed.length + 4 : 14;
  localView.setUint32(valuesAt, crc, true);
  localView.setUint32(valuesAt + 4, packed.length, true);
  localView.setUint32(valuesAt + 8, data.length, true);

  if (descriptor) {
    localView.setUint32(valuesAt - 4, 0x08074b50, true);
  }

  const central = new Uint8Array(46 + name.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, flags, true);
  centralView.setUint16(10, method, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, packed.length, true);
  centralView.setUint32(24, data.length, true);
  centralView.setUint16(28, name.length, true);
  centralView.setUint32(42, offset, true);
  central.set(name, 46);

  return { local, central };
};

export const createDeflatedZip = async (
  inputs: ZipInput[],
  { descriptor = false, method = 8 }: DeflatedZipOptions = {},
): Promise<Uint8Array> => {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const input of inputs) {
    const { local, central } = await entryParts(input, offset, { descriptor, method });
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, inputs.length, true);
  endView.setUint16(10, inputs.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const result = new Uint8Array(offset + centralSize + 22);
  let position = 0;

  for (const part of [...locals, ...centrals, end]) {
    result.set(part, position);
    position += part.length;
  }

  return result;
};
