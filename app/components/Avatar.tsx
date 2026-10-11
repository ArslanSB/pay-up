import { useEffect, useRef, useState } from "react";

/**
 * The provider picture, or the first letter of the name on pink when there is none or it won't load.
 * `className` sets the size, and the font size the letter uses.
 */
export function Avatar({ name, src, className = "" }: { name: string; src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // An error before hydration fires no onError, so check what the browser already knows.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  const frame = `shrink-0 overflow-hidden border-3 border-ink ${className}`;
  if (!src || failed) {
    return (
      <span aria-hidden="true" className={`${frame} display flex items-center justify-center bg-pink leading-none`}>
        {Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }
  return <img ref={img} src={src} alt="" onError={() => setFailed(true)} className={`${frame} block bg-white object-cover`} />;
}
