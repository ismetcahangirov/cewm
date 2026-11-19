"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowRightIcon } from "@/components/icons/iconsax";
import { cx } from "@/lib/cx";

import { button, buttonArrow } from "../button";

export function QuoteBar({
  name,
  label,
  href,
  after,
  before,
}: {
  name: string;
  label: string;
  href: string;
  after: string;
  before: string;
}) {
  const [visible, setVisible] = useState(false);
  const state = useRef({ passed: false, near: false });

  useEffect(() => {
    const start = document.getElementById(after);
    const end = document.getElementById(before);
    const footer = document.querySelector("[data-site-footer]");
    if (!start) return;
    const update = () => setVisible(state.current.passed && !state.current.near);
    const startObserver = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      state.current.passed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    startObserver.observe(start);
    const ends = [end, footer].filter((element): element is Element => element !== null);
    const seen = new Set<Element>();
    const endObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) seen.add(entry.target);
        else seen.delete(entry.target);
      }
      state.current.near = seen.size > 0;
      update();
    });
    for (const element of ends) endObserver.observe(element);
    return () => {
      startObserver.disconnect();
      endObserver.disconnect();
    };
  }, [after, before]);

  return (
    <div className="quote-bar" data-visible={visible ? "" : undefined} inert={!visible}>
      <div className="quote-bar-inner surface-navy shadow-island">
        <p className="min-w-0 flex-1 truncate text-small font-medium">{name}</p>
        <a href={href} className={cx(button({ variant: "accent" }), "shrink-0")}>
          {label}
          <ArrowRightIcon size={20} className={buttonArrow} />
        </a>
      </div>
    </div>
  );
}
