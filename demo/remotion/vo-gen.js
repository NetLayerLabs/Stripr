// Narration for the Stripr demo, generated with ElevenLabs *with timestamps*, so every
// graphic in the film can be cued to the word that names it rather than hand-timed.
//   node vo-gen.js              all sections
//   VO_ONLY=03 node vo-gen.js   one section
// Writes public/vo/vNN.mp3 and src/vo/vNN.json (character alignment).
// The key is read from an env file OUTSIDE this repo, so no secret is ever written here.
const fs = require('fs')
const ENV_FILES = [process.env.ELEVEN_ENV, '.env', '/Users/mrnetwork/Syntura/video/.env'].filter(Boolean)
for (const file of ENV_FILES) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const key = process.env.ELEVENLABS_API_KEY
if (!key) { console.error('No ELEVENLABS_API_KEY found. Set ELEVEN_ENV to an env file that has it.'); process.exit(1) }
const VOICE = process.env.ELEVENLABS_VOICE || 'CwhRBWXzGAHq8TQ4Fs17'
const MODEL = 'eleven_multilingual_v2'

// Every figure spoken here is read live from mainnet by the app: the AAPLx multiplier
// step of 8 Aug 2026, and PGx's realized 1.67% a year (YT at 8.78 USDC -> 28.1%, 3.56 yrs).
const SECTIONS = [
  ['00', "Stripr. Yield stripping, for tokenized stocks on Solana."],
  ['01', "A tokenized stock pays you twice. Once in its price, and again in its dividends. But today, you can only ever sell the two together."],
  ['02', "Here's the part most people miss. xStocks don't airdrop a dividend. They raise a multiplier on the token itself. On the eighth of August, Apple's moved from one point zero zero two six, to one point zero zero three three, and every balance quietly grew. That is real yield, already on chain. And nobody can trade it on its own."],
  ['03', "Stripr splits the share in two. PT is the claim on the stock. YT collects every dividend it will ever pay. Burn them together, and you get the share back."],
  ['04', "It's live on Solana mainnet, with fifteen markets, one for every major xStock. Every figure you see is read straight from the chain."],
  ['05', "Deposit a stock, and one transaction mints equal PT and YT, and locks the YT, so it starts earning."],
  ['06', "When the issuer raises the multiplier, the vault needs fewer tokens to back the same shares. Stripr releases that surplus to locked YT, paid in the stock itself. Anyone can trigger it. No oracle, and no admin key."],
  ['07', "Then sell it. List your future dividends for USDC. The tokens move into an escrow the program owns, and a buyer fills at the exact price they saw."],
  ['08', "And because the dividend is measured, not guessed, every listing carries a real yield. Procter and Gamble has paid one point six seven percent a year through its multiplier. So a YT at eight seventy-eight is a twenty-eight percent yield, that pays for itself in three and a half years."],
  ['09', "Every chart is rebuilt from the market's own on-chain events. Nothing is precomputed, and every row links to the transaction behind it."],
  ['10', "Underneath is a single Anchor program. Payouts use accumulator indexes, so a dividend costs the same, whether ten people hold YT, or ten thousand. Accrual rounds down and debt rounds up, so claims can never exceed the vault. Nineteen end-to-end tests cover it, including a market on the real Apple mint."],
  ['11', "Stripr. A share's dividends, as an asset you can own, price, and sell. Live now, at stripr dot xyz."],
]

const only = process.env.VO_ONLY ? process.env.VO_ONLY.replace(/^v/, '') : null
const todo = SECTIONS.filter(([id]) => !only || id === only)
console.log('characters:', todo.reduce((n, s) => n + s[1].length, 0), 'in', todo.length, 'sections')
fs.mkdirSync('public/vo', { recursive: true })
fs.mkdirSync('src/vo', { recursive: true })

;(async () => {
  for (const [id, text] of todo) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text, model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
      }),
    })
    if (!res.ok) { console.error(`v${id}: ${res.status} ${(await res.text()).slice(0, 200)}`); continue }
    const body = await res.json()
    const buf = Buffer.from(body.audio_base64, 'base64')
    fs.writeFileSync(`public/vo/v${id}.mp3`, buf)
    const a = body.alignment
    // Collapse the character alignment into words with start/end seconds.
    const words = []
    let cur = null
    a.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null } return }
      if (!cur) cur = { w: '', s: a.character_start_times_seconds[i], e: 0 }
      cur.w += ch
      cur.e = a.character_end_times_seconds[i]
    })
    if (cur) words.push(cur)
    fs.writeFileSync(`src/vo/v${id}.json`, JSON.stringify({ text, words }, null, 0) + '\n')
    console.log(`v${id}: ${(buf.length / 1024).toFixed(0)}kb, ${words.length} words, ends ${words.at(-1).e.toFixed(2)}s`)
  }
})()
