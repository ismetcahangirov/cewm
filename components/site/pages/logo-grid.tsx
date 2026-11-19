import Image from "next/image";

import { cx } from "@/lib/cx";
import type { HomeLogo } from "@/lib/public/home";

const imageClass =
  "mx-auto h-10 w-auto max-w-full object-contain opacity-70 grayscale transition-opacity duration-300 group-hover:opacity-100 group-hover:grayscale-0";

function LogoItem({ logo, showName }: { logo: HomeLogo; showName: boolean }) {
  const content = (
    <>
      <Image
        src={logo.image.src}
        alt={showName ? "" : logo.name}
        width={logo.image.width}
        height={logo.image.height}
        sizes="160px"
        className={imageClass}
      />
      {showName && <span className="mt-4 block text-center text-meta text-muted">{logo.name}</span>}
    </>
  );
  if (!logo.url)
    return <div className="group flex min-h-11 flex-col justify-center">{content}</div>;
  return (
    <a
      href={logo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-11 flex-col justify-center"
    >
      {content}
    </a>
  );
}

export function LogoGrid({
  logos,
  showNames = false,
  className,
}: {
  logos: HomeLogo[];
  showNames?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cx(
        "grid items-start gap-x-7.5 gap-y-10",
        showNames
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          : "grid-cols-3 md:grid-cols-5 xl:grid-cols-9",
        className,
      )}
    >
      {logos.map((logo) => (
        <li key={logo.id}>
          <LogoItem logo={logo} showName={showNames} />
        </li>
      ))}
    </ul>
  );
}
