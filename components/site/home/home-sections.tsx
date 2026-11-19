import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";

import { ArrowLink } from "@/components/site/arrow-link";
import { CtaContent } from "@/components/site/cta-band";
import { Eyebrow } from "@/components/site/eyebrow";
import { pill } from "@/components/site/pill";
import { ProductCard } from "@/components/site/product-card";
import { ProjectCard } from "@/components/site/project-card";
import { ScrollRow } from "@/components/site/scroll-row";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { HomeCategory, HomeProduct, HomeProject, LogoGroup } from "@/lib/public/home";
import { cx } from "@/lib/cx";
import { blurPlaceholder } from "@/lib/public/blur";

function revealDelay(step: number): CSSProperties {
  return { "--reveal-delay": `${step * 120}ms` } as CSSProperties;
}

export function CategoriesSection({
  categories,
  allProductsHref,
  title,
  dict,
}: {
  categories: HomeCategory[];
  allProductsHref: string;
  title?: string | null;
  dict: Dictionary;
}) {
  if (!categories.length) return null;
  return (
    <section
      aria-labelledby="home-categories"
      data-reveal-group=""
      className="container-page mt-section"
    >
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-7.5">
        <div suppressHydrationWarning data-reveal="left" className="lg:col-span-3">
          <Eyebrow>{dict.home.categoriesEyebrow}</Eyebrow>
          <h2 id="home-categories" className="mt-5 text-h4">
            {title ?? dict.home.categoriesTitle}
          </h2>
          <ArrowLink href={allProductsHref} className="mt-5">
            {dict.common.allProducts}
          </ArrowLink>
        </div>
        <ScrollRow
          label={dict.home.categoriesEyebrow}
          previousLabel={dict.common.previous}
          nextLabel={dict.common.next}
          className="lg:col-span-9"
        >
          {categories.map((category, index) => (
            <li
              key={category.id}
              suppressHydrationWarning
              data-reveal=""
              style={revealDelay(index)}
              className="w-3/4 shrink-0 snap-start pr-5 sm:w-1/2 sm:pr-7.5 lg:w-1/3"
            >
              <Link href={category.href} className="group block">
                <div className="relative aspect-4/5 overflow-hidden bg-surface">
                  {category.image && (
                    <Image
                      src={category.image.src}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 24vw, (min-width: 640px) 48vw, 72vw"
                      {...blurPlaceholder(category.image)}
                      className="scale-105 object-cover transition-transform duration-600 ease-standard group-hover:scale-100 group-focus-visible:scale-100"
                    />
                  )}
                </div>
                <p className="mt-7.5 text-card text-fg">{category.name}</p>
              </Link>
            </li>
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}

export function ProductsSection({
  products,
  allProductsHref,
  title,
  dict,
}: {
  products: HomeProduct[];
  allProductsHref: string;
  title?: string | null;
  dict: Dictionary;
}) {
  if (!products.length) return null;
  const heading = title ?? dict.home.productsTitle;
  return (
    <section aria-labelledby="home-products" className="container-page mt-section">
      <div
        suppressHydrationWarning
        data-reveal=""
        className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between"
      >
        <h2 id="home-products" className="max-w-4xl text-h2">
          {heading}
        </h2>
        <Link href={allProductsHref} className={pill({ variant: "outline" })}>
          {dict.common.allProducts}
        </Link>
      </div>
      <ScrollRow
        label={heading}
        previousLabel={dict.common.previous}
        nextLabel={dict.common.next}
        className="mt-10"
        listClassName="flex md:mr-0 md:grid md:grid-cols-2 md:gap-7.5 md:overflow-visible lg:grid-cols-3 lg:gap-x-10 lg:gap-y-15"
      >
        {products.map((product, index) => (
          <li
            key={product.id}
            suppressHydrationWarning
            data-reveal=""
            style={revealDelay(index % 3)}
            className="w-3/4 shrink-0 snap-start pr-5 sm:w-1/2 sm:pr-7.5 md:w-auto md:pr-0"
          >
            <ProductCard product={product} />
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}

export function ProjectsBand({
  projects,
  projectsHref,
  quoteHref,
  title,
  dict,
}: {
  projects: HomeProject[];
  projectsHref: string;
  quoteHref: string | null;
  title?: string | null;
  dict: Dictionary;
}) {
  const heading = title ?? dict.home.projectsTitle;
  return (
    <section
      aria-labelledby={projects.length ? "home-projects" : "home-cta"}
      className="on-dark mt-section bg-graphite py-section text-sand"
    >
      <div className="container-page">
        {projects.length > 0 && (
          <div data-reveal-group="">
            <div
              suppressHydrationWarning
              data-reveal=""
              className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between"
            >
              <h2 id="home-projects" className="text-h2 text-sand">
                {heading}
              </h2>
              <Link href={projectsHref} className={pill({ variant: "outline-light" })}>
                {dict.common.all}
              </Link>
            </div>
            <ScrollRow
              label={heading}
              previousLabel={dict.common.previous}
              nextLabel={dict.common.next}
              className="mt-10"
              listClassName="card-row"
            >
              {projects.map((project, index) => (
                <li
                  key={project.id}
                  suppressHydrationWarning
                  data-reveal=""
                  style={revealDelay(index + 1)}
                  className="row-span-3 grid snap-start grid-rows-subgrid gap-y-0 pr-5 sm:pr-7.5"
                >
                  <ProjectCard
                    project={project}
                    visualLabel={dict.home.visualProject}
                    shape="square"
                    tone="dark"
                    aligned
                  />
                </li>
              ))}
            </ScrollRow>
          </div>
        )}
        <CtaContent
          dict={dict}
          quoteHref={quoteHref}
          headingId="home-cta"
          className={cx(projects.length > 0 && "mt-section border-t border-white/30 pt-section")}
        />
      </div>
    </section>
  );
}

export function LogosSection({ groups, dict }: { groups: LogoGroup[]; dict: Dictionary }) {
  if (!groups.length) return null;
  return (
    <div className="container-page flex flex-col gap-section py-section">
      {groups.map((group) => {
        const title = dict.home.partners;
        const count = group.logos.length;
        const track = Array.from({ length: Math.ceil(12 / count) }, () => group.logos).flat();
        return (
          <section key={group.group} aria-label={title} suppressHydrationWarning data-reveal="">
            <h2 className="text-center text-meta text-muted">
              {group.href ? (
                <Link
                  href={group.href}
                  className="inline-flex min-h-11 items-center hover:text-black"
                >
                  {title}
                </Link>
              ) : (
                title
              )}
            </h2>
            <div data-marquee="" className="mt-8 overflow-hidden">
              <div
                className="flex w-max motion-safe:animate-marquee motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center"
                style={{ "--marquee-duration": `${track.length * 3}s` } as CSSProperties}
              >
                {[false, true].map((copy) => (
                  <ul
                    key={String(copy)}
                    aria-hidden={copy || undefined}
                    className={cx(
                      "flex shrink-0 items-center motion-reduce:flex-wrap motion-reduce:justify-center",
                      copy && "motion-reduce:hidden",
                    )}
                  >
                    {track.map((logo, index) => {
                      const repeat = copy || index >= count;
                      const image = (
                        <Image
                          src={logo.image.src}
                          alt={repeat ? "" : logo.name}
                          width={logo.image.width}
                          height={logo.image.height}
                          sizes="200px"
                          className="h-12 w-auto max-w-40 object-contain opacity-70 grayscale transition-[opacity,filter] duration-300 group-hover/logo:opacity-100 group-hover/logo:grayscale-0 md:h-16 md:max-w-50"
                        />
                      );
                      return (
                        <li
                          key={`${logo.id}-${index}`}
                          aria-hidden={repeat || undefined}
                          className={cx(
                            "group/logo flex shrink-0 justify-center px-7.5 md:px-10",
                            index >= count && "motion-reduce:hidden",
                          )}
                        >
                          {logo.url ? (
                            <a
                              href={logo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              tabIndex={repeat ? -1 : undefined}
                              className="block"
                            >
                              {image}
                            </a>
                          ) : (
                            image
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
