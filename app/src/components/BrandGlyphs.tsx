import type { StaticImageData } from "next/image";
import aaplx from "../../public/tokens/AAPLx.png";
import msftx from "../../public/tokens/MSFTx.png";
import nvdax from "../../public/tokens/NVDAx.png";
import spyx from "../../public/tokens/SPYx.png";
import tslax from "../../public/tokens/TSLAx.png";

/**
 * The issuers' own token logos, taken from the TokenMetadata extension on each
 * xStocks mint rather than redrawn, so a market shows the same mark a wallet
 * does. Keyed without the "x" suffix, which lets the devnet stand-ins share the
 * artwork with the mainnet xStock they imitate.
 */
const LOGOS: Record<string, StaticImageData> = {
  AAPL: aaplx,
  MSFT: msftx,
  NVDA: nvdax,
  SPY: spyx,
  TSLA: tslax,
};

/** The logo for a ticker, or null when there isn't one and the letter is used. */
export function tokenLogo(symbol: string): StaticImageData | null {
  return LOGOS[symbol.toUpperCase().replace(/X$/, "")] ?? null;
}
