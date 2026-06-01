import { deflateSync } from 'zlib'
import { nativeImage, NativeImage } from 'electron'

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

type Pixel = [number, number, number, number] // RGBA

function buildPNG(size: number, getPixel: (x: number, y: number, size: number) => Pixel): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdrData = Buffer.allocUnsafe(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0

  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y, size)
      const off = y * (1 + size * 4) + 1 + x * 4
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// Three vertical bars at different heights — bar chart / activity icon
function barIconPixel(x: number, y: number, size: number): Pixel {
  const s = size / 22
  const bottom = Math.round(18 * s)
  const bars = [
    { x1: Math.round(3 * s), x2: Math.round(6 * s), h: Math.round(10 * s) },
    { x1: Math.round(9 * s), x2: Math.round(12 * s), h: Math.round(16 * s) },
    { x1: Math.round(15 * s), x2: Math.round(18 * s), h: Math.round(7 * s) },
  ]
  for (const bar of bars) {
    if (x >= bar.x1 && x <= bar.x2 && y >= bottom - bar.h && y <= bottom) {
      return [0, 0, 0, 255]
    }
  }
  return [0, 0, 0, 0]
}

export function createTrayIcon(): NativeImage {
  const buf = buildPNG(22, barIconPixel)
  const img = nativeImage.createFromBuffer(buf)
  img.setTemplateImage(true)
  return img
}
