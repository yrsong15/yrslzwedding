import Image from "next/image";

// Illustrated "L R" monogram with the cat, cherry blossoms and a tassel
// (public/logo.png, square). `size` is the rendered width/height in px, so
// next/image serves a 1x/2x copy at that size instead of the 1254px original.
// The image has its own cream background, so mix-blend-multiply lets it sit
// on the site's cream/linen without showing a box. Earlier SVG logos are
// saved in design/logo-backups/.

export default function Logo({ size, className = "" }: { size: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="L R monogram — Lauren & Young Re"
      width={size}
      height={size}
      className={`mix-blend-multiply ${className}`}
    />
  );
}
