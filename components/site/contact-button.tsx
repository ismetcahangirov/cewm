import Link from "next/link";

import { MessageTextIcon } from "@/components/icons/iconsax";

export function ContactButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-graphite text-white transition-colors duration-300 hover:bg-sand hover:text-graphite md:right-7.5 md:bottom-7.5"
    >
      <MessageTextIcon className="size-6" />
    </Link>
  );
}
