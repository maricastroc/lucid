export interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

const DOS_DATE = 0x0021;
const DOS_TIME = 0x0000;
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

class ByteWriter {
  private parts: Uint8Array[] = [];
  private size = 0;

  get length(): number {
    return this.size;
  }

  push(bytes: Uint8Array): void {
    this.parts.push(bytes);
    this.size += bytes.length;
  }

  u16(value: number): void {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): void {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]));
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.size);
    let offset = 0;
    for (const part of this.parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
}

export function zip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const body = new ByteWriter();
  const directory = new ByteWriter();

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const offset = body.length;

    body.u32(0x04034b50);
    body.u16(20);
    body.u16(FLAG_UTF8);
    body.u16(METHOD_STORE);
    body.u16(DOS_TIME);
    body.u16(DOS_DATE);
    body.u32(checksum);
    body.u32(entry.data.length);
    body.u32(entry.data.length);
    body.u16(name.length);
    body.u16(0);
    body.push(name);
    body.push(entry.data);

    directory.u32(0x02014b50);
    directory.u16(20);
    directory.u16(20);
    directory.u16(FLAG_UTF8);
    directory.u16(METHOD_STORE);
    directory.u16(DOS_TIME);
    directory.u16(DOS_DATE);
    directory.u32(checksum);
    directory.u32(entry.data.length);
    directory.u32(entry.data.length);
    directory.u16(name.length);
    directory.u16(0);
    directory.u16(0);
    directory.u16(0);
    directory.u16(0);
    directory.u32(0);
    directory.u32(offset);
    directory.push(name);
  }

  const out = new ByteWriter();
  out.push(body.toUint8Array());
  out.push(directory.toUint8Array());
  out.u32(0x06054b50);
  out.u16(0);
  out.u16(0);
  out.u16(entries.length);
  out.u16(entries.length);
  out.u32(directory.length);
  out.u32(body.length);
  out.u16(0);
  return out.toUint8Array();
}
