import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const svg = `<svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#2A2A2A"/><stop offset="100%" style="stop-color:#0D0D0D"/></linearGradient><linearGradient id="s" x1="0%" y1="0%" x2="0%" y2="60%"><stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.12"/><stop offset="100%" style="stop-color:#ffffff;stop-opacity:0"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#g)"/><rect width="100" height="52" rx="22" fill="url(#s)"/><text x="50" y="67" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="52" fill="white" letter-spacing="-3">D</text></svg>`

const buf = Buffer.from(svg)

await sharp(buf).resize(192, 192).png().toFile(join(__dirname, 'icon-192.png'))
console.log('✓ icon-192.png')

await sharp(buf).resize(512, 512).png().toFile(join(__dirname, 'icon-512.png'))
console.log('✓ icon-512.png')
