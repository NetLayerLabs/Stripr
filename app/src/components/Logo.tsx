import Image from "next/image";
import headerMark from "../../public/stripr-header.png";

/**
 * The Stripr wordmark. It ships as one image because the mark and the lettering
 * are drawn as a single piece; splitting them would drift apart at small sizes.
 * Height is fixed and the width follows, so the ribbon never squashes.
 */
export function Wordmark() {
  return (
    <Image
      src={headerMark}
      alt="Stripr"
      priority
      className="h-7 w-auto"
      sizes="200px"
    />
  );
}
