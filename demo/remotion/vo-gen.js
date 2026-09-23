// Narration for the Stripr demo, generated with ElevenLabs.
//   node vo-gen.js              all sections
//   VO_ONLY=03 node vo-gen.js   one section
// The key and voice are read from an env file OUTSIDE this repo, so no secret is ever
// written here. A local .env also works.
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

// Every sentence is something the footage shows or the chain records. Figures are the ones
// the app computes live: AAPLx 0.25%/yr and PGx 1.68%/yr realized from the multiplier.
const SECTIONS = [
  ['00', "Stripr. Yield stripping for tokenized stocks on Solana."],
  ['01', "A tokenized stock pays you two things. The price of the share, and the dividends it earns. Today you cannot sell one without the other."],
  ['02', "Here is the part most people miss. xStocks do not airdrop a dividend. They raise a multiplier on the token, and every balance quietly grows. On the eighth of August, Apple's multiplier moved from one point zero zero two six, to one point zero zero three three. That is a real dividend, already on chain, and nobody can trade it separately."],
  ['03', "Stripr splits a share in two. PT is the claim on the stock itself. YT collects every dividend it will ever pay. Burn them together and you get your share back."],
  ['04', "The program is live on Solana mainnet, with fifteen markets, one for each xStock that Backed issues. Every figure here is read from the chain, not stored."],
  ['05', "Deposit a stock, and Stripr mints equal amounts of PT and YT in share units, at the token's current multiplier. Lock the YT in the same transaction, and it starts earning."],
  ['06', "When the issuer raises the multiplier, the vault needs fewer raw tokens to back the same shares. Stripr releases that surplus to locked YT, paid in the stock itself. Anyone can trigger it. There is no oracle, and no admin key."],
  ['07', "Then sell it. List your future dividends for USDC, and the tokens move into an escrow the program owns. A buyer fills all or part of the listing, at the price they saw, and can lock it to start earning in the same transaction."],
  ['08', "Because the dividend rate is measured, not guessed, every listing carries a yield. Procter and Gamble has delivered one point six eight per cent a year through its multiplier, so a YT at eight point seven eight USDC is twenty eight per cent a year, and pays for itself in three point six years."],
  ['09', "The analytics are rebuilt from the market's own events. Supply, dividends, positions. Nothing is precomputed, and every row links to the transaction that produced it."],
  ['10', "Underneath it is one Anchor program. Payouts use accumulator indexes, so a dividend costs the same whether ten people hold YT or ten thousand. Accrual rounds down and debt rounds up, so claims can never exceed the vault. Nineteen end to end tests cover it, including a market on the real Apple xStock mint."],
  ['11', "Stripr. The dividends of a tokenized stock, as an asset you can own, price, and sell. Live on Solana mainnet at stripr dot xyz."],
]

const only = process.env.VO_ONLY ? process.env.VO_ONLY.replace(/^v/, '') : null
const todo = SECTIONS.filter(([id]) => !only || id === only)
console.log('characters:', todo.reduce((n, s) => n + s[1].length, 0), 'in', todo.length, 'sections')
fs.mkdirSync('public/vo', { recursive: true })

;(async () => {
  for (const [id, text] of todo) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text, model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
      }),
    })
    if (!res.ok) { console.error(`v${id}: ${res.status} ${(await res.text()).slice(0, 200)}`); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(`public/vo/v${id}.mp3`, buf)
    console.log(`v${id}: ${(buf.length / 1024).toFixed(0)}kb`)
  }
})()
