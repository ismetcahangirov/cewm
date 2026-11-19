import Image from "next/image";
import type { CSSProperties } from "react";

import { MailIcon, PhoneIcon } from "@/components/icons/iconsax";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { plural } from "@/lib/i18n/plural";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import type { PublicTeamMember } from "@/lib/public/team";
import { yearsSince } from "@/lib/validation/team";

function revealDelay(step: number): CSSProperties {
  return { "--reveal-delay": `${(step % 4) * 120}ms` } as CSSProperties;
}

export function TeamGrid({
  members,
  locale,
  dict,
}: {
  members: PublicTeamMember[];
  locale: Locale;
  dict: Dictionary;
}) {
  const copy = dict.content.team;
  return (
    <ul
      data-reveal-group=""
      className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-7.5 xl:grid-cols-4"
    >
      {members.map((member, index) => (
        <li key={member.id} suppressHydrationWarning data-reveal="" style={revealDelay(index)}>
          <article className="flex h-full flex-col">
            <div className="relative aspect-square overflow-hidden bg-surface">
              {member.photo && (
                <Image
                  src={member.photo.src}
                  alt={member.photo.alt}
                  fill
                  sizes="(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw"
                  placeholder={member.photo.blurDataURL ? "blur" : "empty"}
                  blurDataURL={member.photo.blurDataURL ?? undefined}
                  className="object-cover"
                />
              )}
            </div>
            <h3 className="mt-5 text-card font-text text-heading">{member.name}</h3>
            <p className="mt-1 text-meta text-graphite">{member.role}</p>
            {member.startedYear !== null && (
              <p className="mt-1 text-meta text-muted">
                {plural(locale, yearsSince(member.startedYear), copy.years)}
              </p>
            )}
            {member.bio && <p className="mt-3 text-small text-pretty">{member.bio}</p>}
            {(member.phone || member.email) && (
              <ul className="mt-3 flex flex-col">
                {member.phone && (
                  <li>
                    <a
                      href={`tel:${member.phone}`}
                      aria-label={copy.call.replace("{name}", member.name)}
                      className="inline-flex min-h-11 items-center gap-2.5 text-meta whitespace-nowrap text-graphite"
                    >
                      <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
                      {formatAzerbaijaniPhone(member.phone)}
                    </a>
                  </li>
                )}
                {member.email && (
                  <li className="min-w-0">
                    <a
                      href={`mailto:${member.email}`}
                      aria-label={copy.write.replace("{name}", member.name)}
                      className="inline-flex min-h-11 max-w-full items-center gap-2.5 text-meta text-graphite"
                    >
                      <MailIcon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="min-w-0 break-all">{member.email}</span>
                    </a>
                  </li>
                )}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
