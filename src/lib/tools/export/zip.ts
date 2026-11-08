// A tiny zip writer and reader for the export tools. Files are stored without compression (method 0),
// which every unzip tool, e-reader and word processor accepts, and keeps the code small. The reader
// only understands stored entries, which is what the writer makes.
export type ZipEntry = { name: string; data: Uint8Array };

export type ZipInput = { name: string; data: Uint8Array | string };

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x0800;
const VERSION = 20;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;

const CRC_TABLE = Array.from({ length: 256 }, (_unused, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

export const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
};

const encoder = new TextEncoder();

export const utf8 = (text: string): Uint8Array => encoder.encode(text);

// MS-DOS time and date, in UTC so the same input always makes the same bytes.
const dosTime = (date: Date): number =>
  (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);

const dosDate = (date: Date): number =>
  ((Math.max(1980, date.getUTCFullYear()) - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();

const isAscii = (text: string): boolean => /^[\x20-\x7e]*$/.test(text);

export const createZip = (inputs: ZipInput[], modified: Date = new Date()): Uint8Array => {
  const time = dosTime(modified);
  const date = dosDate(modified);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const input of inputs) {
    const name = utf8(input.name);
    const data = typeof input.data === 'string' ? utf8(input.data) : input.data;
    const crc = crc32(data);
    const flags = isAscii(input.name) ? 0 : UTF8_FLAG;

    const local = new Uint8Array(LOCAL_HEADER_SIZE + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_SIGNATURE, true);
    localView.setUint16(4, VERSION, true);
    localView.setUint16(6, flags, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, LOCAL_HEADER_SIZE);
    local.set(data, LOCAL_HEADER_SIZE + name.length);

    const central = new Uint8Array(CENTRAL_HEADER_SIZE + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, CENTRAL_SIGNATURE, true);
    centralView.setUint16(4, VERSION, true);
    centralView.setUint16(6, VERSION, true);
    centralView.setUint16(8, flags, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, CENTRAL_HEADER_SIZE);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(END_RECORD_SIZE);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, END_SIGNATURE, true);
  endView.setUint16(8, inputs.length, true);
  endView.setUint16(10, inputs.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, end];
  const result = new Uint8Array(offset + centralSize + END_RECORD_SIZE);
  let position = 0;

  for (const part of parts) {
    result.set(part, position);
    position += part.length;
  }

  return result;
};

export const ZIP_UNREADABLE = 'This file is not a zip made by this app.';

const decoder = new TextDecoder();

export const readZip = (bytes: Uint8Array): ZipEntry[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endAt = -1;

  for (let position = bytes.length - END_RECORD_SIZE; position >= 0; position -= 1) {
    if (view.getUint32(position, true) === END_SIGNATURE) {
      endAt = position;
      break;
    }
  }

  if (endAt < 0) {
    throw new Error(ZIP_UNREADABLE);
  }

  const count = view.getUint16(endAt + 10, true);
  let position = view.getUint32(endAt + 16, true);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    if (position + CENTRAL_HEADER_SIZE > endAt || view.getUint32(position, true) !== CENTRAL_SIGNATURE) {
      throw new Error(ZIP_UNREADABLE);
    }

    const method = view.getUint16(position + 10, true);
    const crc = view.getUint32(position + 16, true);
    const size = view.getUint32(position + 20, true);
    const nameLength = view.getUint16(position + 28, true);
    const extraLength = view.getUint16(position + 30, true);
    const commentLength = view.getUint16(position + 32, true);
    const localAt = view.getUint32(position + 42, true);
    const name = decoder.decode(
      bytes.subarray(position + CENTRAL_HEADER_SIZE, position + CENTRAL_HEADER_SIZE + nameLength),
    );

    if (method !== 0 || view.getUint32(localAt, true) !== LOCAL_SIGNATURE) {
      throw new Error(ZIP_UNREADABLE);
    }

    const dataAt =
      localAt + LOCAL_HEADER_SIZE + view.getUint16(localAt + 26, true) + view.getUint16(localAt + 28, true);
    const data = bytes.slice(dataAt, dataAt + size);

    if (data.length !== size || crc32(data) !== crc) {
      throw new Error(ZIP_UNREADABLE);
    }

    entries.push({ name, data });
    position += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }

  return entries;
};

export const isZip = (bytes: Uint8Array): boolean => bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;

export const textOf = (data: Uint8Array): string => decoder.decode(data);
