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
      // A still page sends no frames, so a closing hold would vanish; pin the last
      // picture to the moment filming actually stopped.
      if (frames.length) frames.push({ data: frames[frames.length - 1].data, t: Date.now() / 1000 })
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
//
// Each beat gets { page, begin, mark }. It sets the page up off camera, calls begin()
// when the picture is worth filming, then mark()s the elements the narration names.
// A mark records where that element sits on the 1600x900 page and when, so the film's
// camera can be aimed at it exactly instead of by eye.

const MAINNET_APP = app('/app?network=mainnet-beta')
const DEVNET_APP = app('/app?network=devnet')
const DEVNET_MARKET = app(`/app/markets/${MARKET}?network=devnet`)

async function settleMainnet(page) {
  await goto(page, MAINNET_APP, 11000)
  const ack = page.getByRole('button', { name: /I understand/i }).first()
  if (await ack.count()) { await ack.click().catch(() => {}); await wait(page, 1200) }
  const x = page.locator('[aria-label="Dismiss the mainnet notice"]').first()
  if (await x.count()) { await x.click().catch(() => {}); await wait(page, 800) }
}

async function onMarketConnected(page) {
  await goto(page, DEVNET_APP, 8000)
  await connectWallet(page)
  await goto(page, DEVNET_MARKET, 11000)
  await dismissDialog(page)
}

const BEATS = {
  /** 04: fifteen mainnet markets, and the pager. */
  async markets({ page, begin, mark }) {
    await settleMainnet(page)
    await begin()
    await wait(page, 900)
    await mark('table', page.locator('table').first())
    await wait(page, 3200)
    await smoothScroll(page, 250, 1500)
    await wait(page, 1600)
    await mark('tableLow', page.locator('table').first())
    const next = page.getByRole('button', { name: /^Next$/ }).first()
    if (await next.count()) { await softClick(page, next, 1500) }
    await mark('page2', page.locator('table').first())
    await wait(page, 3000)
  },

  /** 05: stock in, PT and YT out, YT locked - one real devnet transaction. */
  async strip({ page, begin, mark }) {
    await onMarketConnected(page)
    await smoothScroll(page, 150, 10)
    await begin()
    await wait(page, 700)
    const input = page.locator('input[inputmode="decimal"]').first()
    await mark('form', 'Strip a stock', { minW: 700, minH: 400 })
    await typeInto(page, input, '5')
    await wait(page, 900)
    await mark('outputs', 'PT-AAPL', { minW: 700, minH: 90 })
    const go = page.locator('button.btn-primary', { hasText: /Strip/ }).first()
    await mark('submit', go)
    await softClick(page, go, 600)
    await page.evaluate(() => window.__hideCursor?.())
    await page.locator('[role="dialog"]').first().waitFor({ timeout: 15000 }).catch(() => {})
    await wait(page, 400)
    await mark('dialog', page.locator('[role="dialog"]').first())
    await page.getByText(/View on Solana Explorer/i).first().waitFor({ timeout: 40000 }).catch(() => {})
    await wait(page, 300)
    await mark('confirmed', page.locator('[role="dialog"]').first())
    await wait(page, 3500)
  },

  /** 06: the position - YT locked and earning. */
  async position({ page, begin, mark }) {
    await onMarketConnected(page)
    await smoothScroll(page, 150, 10)
    await begin()
    await wait(page, 800)
    await mark('stats', 'Stock in vault', { minW: 1200, minH: 90 })
    await mark('rail', 'Claimable yield', { minW: 250, minH: 400 })
    await wait(page, 7000)
  },

  /** 07: the order book - a buyer takes the best listing at the price it shows. */
  async book({ page, begin, mark }) {
    await onMarketConnected(page)
    await scrollToText(page, 'Trade PT and YT', -110, 10)
    await wait(page, 1500)
    await begin()
    await wait(page, 800)
    await mark('book', 'cheapest first', { minW: 800, minH: 200 })
    await mark('ticket', 'You buy', { minW: 300, minH: 380 })
    const rows = page.locator('button', { hasText: /^Buy$/ })
    if (await rows.count()) { await moveTo(page, rows.first()); await wait(page, 900); await moveTo(page, rows.nth(1)); }
    await wait(page, 1400)
    // The page carries several amount fields (strip, admin payout, trade ticket); the
    // ticket's is the one on screen in the right-hand column. Index order is not stable.
    const idx = await page.evaluate(() =>
      [...document.querySelectorAll('input[inputmode="decimal"]')].findIndex((el) => {
        const r = el.getBoundingClientRect()
        return r.x > 1080 && r.y > 380 && r.y < 560
      }),
    )
    if (idx < 0) throw new Error('trade ticket amount field not on screen')
    await typeInto(page, page.locator('input[inputmode="decimal"]').nth(idx), '2')
    await wait(page, 600)
    await wait(page, 3500)
  },

  /** 09: analytics decoded from the market's own events. */
  async analytics({ page, begin, mark }) {
    await goto(page, DEVNET_MARKET, 13000)
    await scrollToText(page, 'Market analytics', -90, 10)
    await wait(page, 2500)
    await begin()
    await wait(page, 700)
    await mark('supply', 'Supply over time', { minW: 600, minH: 250 })
    await wait(page, 3500)
    await smoothScroll(page, (await page.evaluate(() => window.scrollY)) + 520, 1800)
    await wait(page, 900)
    await mark('reinvested', 'Reinvested dividends', { minW: 400, minH: 250, nth: -1 })
    await wait(page, 4200)
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

const manifest = fs.existsSync(path.join(ROOT, 'src/clips.json')) && process.env.BEAT
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'src/clips.json'), 'utf8'))
  : {}

for (const beat of todo) {
  console.log(`\n== ${beat}`)
  const { ctx, page } = await newSession(browser)
  const marks = []
  let rec = null
  let t0 = 0
  const begin = async () => { rec = await record(page); t0 = Date.now() / 1000 }
  const mark = async (name, target, opts = {}) => {
    const box = typeof target === 'string'
      ? await page.evaluate(([text, minW, minH, nth]) => {
          const hits = [...document.querySelectorAll('body *')].filter(
            (e) => e.children.length === 0 && (e.textContent || '').trim().toLowerCase().startsWith(text.toLowerCase()) && e.getBoundingClientRect().width > 0,
          )
          let el = hits[nth < 0 ? hits.length + nth : nth]
          if (!el) return null
          while (el.parentElement) {
            const r = el.getBoundingClientRect()
            if (r.width >= minW && r.height >= minH) return { x: r.x, y: r.y, width: r.width, height: r.height }
            el = el.parentElement
          }
          return null
        }, [target, opts.minW ?? 300, opts.minH ?? 120, opts.nth ?? 0])
      : await target.boundingBox({ timeout: 1500 }).catch(() => null)
    if (!box) { console.log(`   (mark ${name}: not found)`); return }
    const m = { name, t: +(Date.now() / 1000 - t0).toFixed(2), rect: [box.x, box.y, box.width, box.height].map((v) => Math.round(v)) }
    marks.push(m)
    console.log(`   mark ${name} @${m.t}s  [${m.rect.join(', ')}]`)
  }
  try {
    await BEATS[beat]({ page, begin, mark })
    if (!rec) throw new Error('beat never called begin()')
    const frames = await rec.stop()
    manifest[beat] = { ...encode(beat, frames), marks }
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
