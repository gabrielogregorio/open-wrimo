// Reads zips made by other programs, such as .docx and .odt files, which compress their entries with
// DEFLATE (method 8). Inflating uses the DecompressionStream built into browsers and Node, so nothing
// is downloaded and the file never leaves the device. Sizes come from the central directory, which
// also covers entries written with a data descriptor (general purpose bit 3).
import { crc32, type ZipEntry } from './zip';

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;
const STORED = 0;
const DEFLATED = 8;

export const UNZIP_UNREADABLE = 'This zip file is broken or uses a format this app cannot read.';

export const inflateRaw = async (data: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const findEnd = (bytes: Uint8Array, view: DataView): number => {
  for (let position = bytes.length - END_RECORD_SIZE; position >= 0; position -= 1) {
    if (view.getUint32(position, true) === END_SIGNATURE) {
      return position;
    }
  }

  throw new Error(UNZIP_UNREADABLE);
};

const unpack = async (method: number, packed: Uint8Array): Promise<Uint8Array> => {
  if (method === STORED) {
    return packed;
  }

  if (method !== DEFLATED) {
    throw new Error(UNZIP_UNREADABLE);
  }

  try {
    return await inflateRaw(packed);
  } catch {
    throw new Error(UNZIP_UNREADABLE);
  }
};

export const readZipAsync = async (bytes: Uint8Array): Promise<ZipEntry[]> => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endAt = findEnd(bytes, view);
  const count = view.getUint16(endAt + 10, true);
  const decoder = new TextDecoder();
  let position = view.getUint32(endAt + 16, true);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    if (position + CENTRAL_HEADER_SIZE > endAt || view.getUint32(position, true) !== CENTRAL_SIGNATURE) {
      throw new Error(UNZIP_UNREADABLE);
    }

    const method = view.getUint16(position + 10, true);
    const crc = view.getUint32(position + 16, true);
    const packedSize = view.getUint32(position + 20, true);
    const size = view.getUint32(position + 24, true);
    const nameLength = view.getUint16(position + 28, true);
    const extraLength = view.getUint16(position + 30, true);
    const commentLength = view.getUint16(position + 32, true);
    const localAt = view.getUint32(position + 42, true);
    const name = decoder.decode(
      bytes.subarray(position + CENTRAL_HEADER_SIZE, position + CENTRAL_HEADER_SIZE + nameLength),
    );

    if (localAt + LOCAL_HEADER_SIZE > bytes.length || view.getUint32(localAt, true) !== LOCAL_SIGNATURE) {
      throw new Error(UNZIP_UNREADABLE);
    }

    const dataAt =
      localAt + LOCAL_HEADER_SIZE + view.getUint16(localAt + 26, true) + view.getUint16(localAt + 28, true);
    const packed = bytes.slice(dataAt, dataAt + packedSize);

    if (packed.length !== packedSize) {
      throw new Error(UNZIP_UNREADABLE);
    }

    const data = await unpack(method, packed);

    if (data.length !== size || crc32(data) !== crc) {
      throw new Error(UNZIP_UNREADABLE);
    }

    entries.push({ name, data });
    position += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }

  return entries;
};
