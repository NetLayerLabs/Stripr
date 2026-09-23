/**
 * A tiny local signing service for the capture run. The injected wallet in the page
 * posts serialized transactions here; this signs them with a devnet keypair and
 * submits them. Keeping the key in node means no crypto has to run in the page, and
 * the key never enters the browser.
 *
 *   node scripts/signer.mjs            uses ~/.config/solana/id.json on devnet
 */
import http from 'http'
import fs from 'fs'
import os from 'os'
import { Connection, Keypair, VersionedTransaction, Transaction } from '@solana/web3.js'

const KEYPAIR = process.env.DEMO_KEYPAIR || `${os.homedir()}/.config/solana/id.json`
const RPC = process.env.DEMO_RPC || 'https://api.devnet.solana.com'
const PORT = Number(process.env.SIGNER_PORT || 8899)

const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))
const conn = new Connection(RPC, 'confirmed')
console.log('signer wallet:', kp.publicKey.toBase58(), '\nrpc:', RPC, '\nport:', PORT)

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(body))
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST,OPTIONS',
    })
    return res.end()
  }
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', async () => {
    try {
      if (req.url === '/pubkey') return json(res, 200, { pubkey: kp.publicKey.toBase58() })
      const { tx, send } = JSON.parse(body)
      const raw = Buffer.from(tx, 'base64')
      // Versioned and legacy transactions serialize differently; try the newer one first.
      let signed
      try {
        const v = VersionedTransaction.deserialize(raw)
        v.sign([kp])
        signed = Buffer.from(v.serialize())
      } catch {
        const t = Transaction.from(raw)
        t.partialSign(kp)
        signed = t.serialize({ requireAllSignatures: false })
      }
      if (!send) return json(res, 200, { signed: signed.toString('base64') })
      const sig = await conn.sendRawTransaction(signed, { skipPreflight: false, maxRetries: 5 })
      await conn.confirmTransaction(sig, 'confirmed')
      console.log('sent', sig)
      return json(res, 200, { signature: sig })
    } catch (e) {
      console.error('signer error:', e.message)
      return json(res, 500, { error: e.message })
    }
  })
}).listen(PORT)
