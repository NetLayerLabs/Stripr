/**
 * Drives the real Stripr app one BEAT at a time and turns each into
 * public/clips/<beat>.mp4, plus an entry in src/clips.json.
 *
 *   node scripts/capture.mjs                 every beat
 *   BEAT=strip node scripts/capture.mjs      one beat
 *
 * Wallet actions are real: a Wallet Standard wallet is injected into the page and
 * every signature goes to scripts/signer.mjs, which holds the devnet key in node.
 * Nothing is mocked in the app itself - the transactions land on devnet.
 */
import { chromium } from 'playwright'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { walletScript } from './wallet-inject.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const OUT = path.join(ROOT, 'public/clips')
const TMP = path.join(ROOT, 'clips/tmp')
const BASE = process.env.APP_URL || 'http://localhost:4317'
const SIGNER = process.env.SIGNER_URL || 'http://127.0.0.1:8975'
const PUBKEY = process.env.DEMO_PUBKEY || 'DTZF7WEKUw1oCrgbYvL5KGnPKfzeS6U8aE3fvSUDrtHD'
const SIZE = { width: 1600, height: 900 }
const DPR = 2
const FPS = 30
const MARKET = process.env.DEMO_MARKET || '5skjAoJPtmEtSKSKX2LsWUeoRRLFUiTEtrjbjHQ8DEPT'

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })

/** A soft pointer the viewer can follow; the real cursor never appears in a screencast. */
const pointerScript = `
(() => {
  const dot = document.createElement('div')
  dot.id = '__cursor'
  Object.assign(dot.style, {
    position: 'fixed', left: '0', top: '0', width: '22px', height: '22px', zIndex: 2147483647,
    borderRadius: '50%', pointerEvents: 'none', transform: 'translate(-50%,-50%) scale(1)',
    background: 'rgba(255,255,255,0.92)', boxShadow: '0 0 0 2px rgba(0,0,0,.35), 0 6px 18px rgba(0,0,0,.45)',
    transition: 'transform .12s ease-out', opacity: '0',
  })
  const add = () => { if (document.body && !document.getElementById('__cursor')) document.body.appendChild(dot) }
  document.addEventListener('DOMContentLoaded', add); add()
  window.__moveCursor = (x, y) => { dot.style.opacity = '1'; dot.style.left = x + 'px'; dot.style.top = y + 'px' }
  window.__clickCursor = () => { dot.style.transform = 'translate(-50%,-50%) scale(0.7)'; setTimeout(() => { dot.style.transform = 'translate(-50%,-50%) scale(1)' }, 140) }
  window.__hideCursor = () => { dot.style.opacity = '0' }
})();
`

async function newSession(browser) {
  const ctx = await browser.newContext({ viewport: SIZE, deviceScaleFactor: DPR, locale: 'en-US' })
  await ctx.addInitScript(walletScript(PUBKEY, SIGNER))
  await ctx.addInitScript(pointerScript)
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('   page error:', m.text().slice(0, 120)) })
  return { ctx, page }
}

/** Screencast frames, collected with their timestamps so playback matches real time. */
async function record(page) {
  const client = await page.context().newCDPSession(page)
  const frames = []
  client.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
    frames.push({ data, t: metadata.timestamp })
    await client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 })
  return {
    async stop() {
      await client.send('Page.stopScreencast').catch(() => {})
      return frames
    },
  }
}

/** Write frames at a constant FPS by holding each one until the next one's timestamp. */
function encode(beat, frames) {
  if (!frames.length) throw new Error(`${beat}: no frames captured`)
  const dir = path.join(TMP, beat)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const t0 = frames[0].t
  const end = frames[frames.length - 1].t
  const duration = Math.max(0.6, end - t0)
  const total = Math.round(duration * FPS)
  let cursor = 0
  for (let i = 0; i < total; i++) {
    const want = t0 + i / FPS
    while (cursor + 1 < frames.length && frames[cursor + 1].t <= want) cursor++
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(frames[cursor].data, 'base64'))
  }
  const target = path.join(OUT, `${beat}.mp4`)
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'),
    '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-vf', `scale=${SIZE.width * DPR}:${SIZE.height * DPR}:flags=lanczos`, target,
  ])
  fs.rmSync(dir, { recursive: true, force: true })
  const probed = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', target]).toString().trim())
  console.log(`   -> ${beat}.mp4  ${probed.toFixed(2)}s  ${total} frames`)
  return { file: `clips/${beat}.mp4`, duration: probed, width: SIZE.width * DPR, height: SIZE.height * DPR }
}

// ---- page helpers -------------------------------------------------------------

const wait = (page, ms) => page.waitForTimeout(ms)

async function moveTo(page, locator) {
  const box = await locator.boundingBox()
  if (!box) return null
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.evaluate(([x, y]) => window.__moveCursor?.(x, y), [x, y])
  await page.mouse.move(x, y, { steps: 18 })
  return { x, y }
}

/** Move the soft pointer to a target, pause so the eye can follow, then click. */
async function softClick(page, locator, settle = 900) {
  await moveTo(page, locator)
  await wait(page, 420)
  await page.evaluate(() => window.__clickCursor?.())
  await locator.click({ timeout: 12000 })
  await wait(page, settle)
}

/** Type into a controlled input: React ignores value injection, so send real keys. */
async function typeInto(page, locator, text) {
  await softClick(page, locator, 200)
  await locator.pressSequentially(text, { delay: 110 })
  await wait(page, 700)
}

async function smoothScroll(page, to, ms = 1400) {
  await page.evaluate(([to, ms]) => new Promise((done) => {
    const from = window.scrollY
    const start = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      window.scrollTo(0, from + (to - from) * e)
      p < 1 ? requestAnimationFrame(step) : done()
    }
    requestAnimationFrame(step)
  }), [to, ms])
}

async function scrollToText(page, text, offset = -110, ms = 1500) {
  const y = await page.evaluate(([text, offset]) => {
    const hit = [...document.querySelectorAll('h1,h2,h3,h4,p,span,div')]
      .filter((e) => e.children.length === 0 || e.tagName[0] === 'H')
      .find((e) => (e.textContent || '').trim().includes(text))
    return hit ? window.scrollY + hit.getBoundingClientRect().top + offset : null
  }, [text, offset])
  if (y === null) { console.log(`   (no heading "${text}")`); return false }
  await smoothScroll(page, y, ms)
  return true
}

/** The transaction dialog stays up after a step finishes and covers the form. */
async function dismissDialog(page) {
  const open = await page.locator('[role="dialog"]').count()
  if (!open) return
  await page.keyboard.press('Escape')
  await wait(page, 900)
}

async function connectWallet(page) {
  const btn = page.getByRole('button', { name: /connect wallet/i }).first()
  if (!(await btn.count())) return
  await btn.click().catch(() => {})
  await wait(page, 1400)
  const pick = page.getByText('Demo Wallet', { exact: false }).first()
  if (await pick.count()) await pick.click().catch(() => {})
  await wait(page, 4000)
}

const goto = async (page, url, settle = 9000) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await wait(page, settle)
}

const app = (p) => `${BASE}${p}`

export { }

// ---- beats --------------------------------------------------------------------

const BEATS = {
  /** v00 + v01: the wordmark, the promise, the split. */
  async landing(page) {
    await goto(page, app('/?network=mainnet-beta'), 9000)
    await wait(page, 2600)
    await smoothScroll(page, 620, 2200)
    await wait(page, 2000)
    await smoothScroll(page, 1180, 1800)
    await wait(page, 2400)
  },

  /** v02: the multiplier is the dividend - the live mainnet ledger. */
  async ledger(page) {
    await goto(page, app('/?network=mainnet-beta'), 11000)
    await scrollToText(page, 'What each xStock last paid', -120, 1800)
    await wait(page, 5200)
    await smoothScroll(page, (await page.evaluate(() => window.scrollY)) + 380, 1600)
    await wait(page, 4200)
  },

  /** v03: PT and YT, and what each one is. */
  async anatomy(page) {
    await goto(page, app('/?network=mainnet-beta'), 9000)
    await scrollToText(page, 'One stock in', -120, 1700)
    await wait(page, 3200)
    await smoothScroll(page, (await page.evaluate(() => window.scrollY)) + 460, 1600)
    await wait(page, 3600)
  },

  /** v04: fifteen live mainnet markets, and the pager. */
  async markets(page) {
    await goto(page, app('/app?network=mainnet-beta'), 12000)
    const ack = page.getByRole('button', { name: /I understand/i }).first()
    if (await ack.count()) await softClick(page, ack, 1500)
    await wait(page, 3800)
    await smoothScroll(page, 420, 1500)
    await wait(page, 2600)
    const next = page.getByRole('button', { name: /^Next$/ }).first()
    if (await next.count()) { await softClick(page, next, 2600) }
    await wait(page, 2200)
  },

  /** v05: deposit a stock, receive PT and YT, lock the YT - a real devnet transaction. */
  async strip(page) {
    await goto(page, app('/app?network=devnet'), 9000)
    await connectWallet(page)
    await goto(page, app(`/app/markets/${MARKET}?network=devnet`), 12000)
    const faucet = page.locator('button', { hasText: /Get test/ }).first()
    if (await faucet.count()) { await softClick(page, faucet, 1200); await wait(page, 26000); await dismissDialog(page) }
    const input = page.locator('input[inputmode="decimal"]').first()
    await typeInto(page, input, '5')
    const go = page.locator('button.btn-primary', { hasText: /Strip/ }).first()
    if (await go.count()) { await softClick(page, go, 1200); await wait(page, 24000) }
    await wait(page, 2200)
    await page.evaluate(() => window.__hideCursor?.())
    await wait(page, 2600)
  },

  /** v06: what the position holds, and the reinvested dividend that reached it. */
  async position(page) {
    await goto(page, app('/app?network=devnet'), 8000)
    await connectWallet(page)
    await goto(page, app(`/app/markets/${MARKET}?network=devnet`), 12000)
    await dismissDialog(page)
    await scrollToText(page, 'Your position', -140, 1500)
    await wait(page, 5200)
    await smoothScroll(page, (await page.evaluate(() => window.scrollY)) - 300, 1400)
    await wait(page, 3400)
  },

  /** v07 + v08: the order book, its yields, and listing YT for sale. */
  async book(page) {
    // Connect on the market page itself: routing through /app first spent most of the
    // clip on navigation, leaving too little of the order book to cut from.
    await goto(page, app(`/app/markets/${MARKET}?network=devnet`), 11000)
    await connectWallet(page)
    await wait(page, 3000)
    await scrollToText(page, 'Trade PT and YT', -120, 1700)
    await wait(page, 4200)
    const rows = page.locator('button', { hasText: /^Buy$/ })
    if (await rows.count()) await moveTo(page, rows.first())
    await wait(page, 3600)
    const sell = page.getByRole('button', { name: /^Sell$/ }).first()
    if (await sell.count()) await softClick(page, sell, 1600)
    const amount = page.locator('input[inputmode="decimal"]').last()
    await typeInto(page, amount, '2')
    await wait(page, 3200)
  },

  /** v09: analytics decoded from the market's own events. */
  async analytics(page) {
    await goto(page, app(`/app/markets/${MARKET}?network=devnet`), 13000)
    await scrollToText(page, 'Market analytics', -120, 1800)
    await wait(page, 5000)
    await smoothScroll(page, (await page.evaluate(() => window.scrollY)) + 520, 1700)
    await wait(page, 4600)
  },

  /** v10: one Anchor program, and what makes the accounting safe. */
  async architecture(page) {
    // This section carries the longest line, so it needs footage to spare after the
    // scroll into place is trimmed off the front.
    await goto(page, app('/?network=mainnet-beta'), 9000)
    await scrollToText(page, 'A single Anchor program', -120, 1800)
    await wait(page, 7000)
    await smoothScroll(page, (await page.evaluate(() => window.scrollY)) + 420, 1800)
    await wait(page, 6500)
    await smoothScroll(page, (await page.evaluate(() => window.scrollY)) + 460, 1800)
    await wait(page, 7000)
  },

  /** v11: close on the mark. */
  async outro(page) {
    await goto(page, app('/?network=mainnet-beta'), 9000)
    await wait(page, 3200)
    await smoothScroll(page, 260, 1400)
    await wait(page, 2600)
  },
}

// ---- runner -------------------------------------------------------------------

const only = process.env.BEAT
const todo = Object.keys(BEATS).filter((b) => !only || b === only)
console.log('beats:', todo.join(', '))

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [`--force-device-scale-factor=${DPR}`, '--hide-scrollbars', '--lang=en-US', '--mute-audio'],
})

const manifest = fs.existsSync(path.join(ROOT, 'src/clips.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'src/clips.json'), 'utf8'))
  : {}

for (const beat of todo) {
  console.log(`\n== ${beat}`)
  const { ctx, page } = await newSession(browser)
  try {
    // Warm the route first so the clip never opens on a spinner.
    const rec = await record(page)
    await BEATS[beat](page)
    const frames = await rec.stop()
    manifest[beat] = encode(beat, frames)
  } catch (e) {
    console.log(`   FAILED: ${e.message.slice(0, 160)}`)
    await page.screenshot({ path: path.join(TMP, `fail-${beat}.png`) }).catch(() => {})
  } finally {
    await ctx.close().catch(() => {})
  }
}

fs.mkdirSync(path.join(ROOT, 'src'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'src/clips.json'), JSON.stringify(manifest, null, 1) + '\n')
console.log('\nclips.json written with', Object.keys(manifest).length, 'beats')
await browser.close()
