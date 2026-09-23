/**
 * The page side of the demo wallet. Registers a Wallet Standard wallet so the app's
 * wallet-adapter finds it exactly as it would find Phantom, and routes every signature
 * to the local signer. Returned as a string so Playwright can add it before any app
 * script runs.
 */
export const walletScript = (pubkeyBase58, signerUrl) => `
(() => {
  const PUBKEY = ${JSON.stringify(pubkeyBase58)};
  const SIGNER = ${JSON.stringify(signerUrl)};

  const b64 = (u8) => btoa(String.fromCharCode(...u8));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const decode58 = (s) => {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let bytes = [0];
    for (const ch of s) {
      let carry = A.indexOf(ch);
      for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
      while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
    }
    for (const ch of s) { if (ch !== '1') break; bytes.push(0); }
    return new Uint8Array(bytes.reverse());
  };

  const post = async (path, body) => {
    const r = await fetch(SIGNER + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('signer ' + r.status);
    return r.json();
  };

  const account = {
    address: PUBKEY,
    publicKey: decode58(PUBKEY),
    chains: ['solana:devnet', 'solana:mainnet'],
    features: ['solana:signTransaction', 'solana:signAndSendTransaction'],
    label: 'Demo Wallet',
    icon: undefined,
  };

  const listeners = {};
  const wallet = {
    version: '1.0.0',
    name: 'Demo Wallet',
    icon: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="%232B6BEA"/></svg>'),
    chains: ['solana:devnet', 'solana:mainnet'],
    accounts: [account],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [account] }) },
      'standard:disconnect': { version: '1.0.0', disconnect: async () => {} },
      'standard:events': {
        version: '1.0.0',
        on: (event, fn) => { (listeners[event] ||= []).push(fn); return () => { listeners[event] = (listeners[event] || []).filter((f) => f !== fn); }; },
      },
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: async (...inputs) => {
          const out = [];
          for (const input of inputs.flat()) {
            const { signed } = await post('/', { tx: b64(new Uint8Array(input.transaction)), send: false });
            out.push({ signedTransaction: unb64(signed) });
          }
          return out;
        },
      },
      'solana:signAndSendTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signAndSendTransaction: async (...inputs) => {
          const out = [];
          for (const input of inputs.flat()) {
            const { signature } = await post('/', { tx: b64(new Uint8Array(input.transaction)), send: true });
            out.push({ signature: decode58(signature) });
          }
          return out;
        },
      },
    },
  };

  // Both halves of the handshake: answer an app that asks, and announce for one already listening.
  const register = ({ register }) => register(wallet);
  window.addEventListener('wallet-standard:app-ready', (e) => register(e.detail));
  window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));
})();
`;
