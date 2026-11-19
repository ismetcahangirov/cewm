"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { startReveal } from "@/lib/motion/reveal";
import { startScrollLinked } from "@/lib/motion/scroll-linked";
import { resetScroll, startSmoothScroll } from "@/lib/motion/smooth-scroll";

export function MotionRoot() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion", "");
    return startSmoothScroll();
  }, []);

  useEffect(() => {
    if (first.current) first.current = false;
    else if (!location.hash) resetScroll();
    const stopReveal = startReveal();
    const stopScrollLinked = startScrollLinked();
    return () => {
      stopReveal();
      stopScrollLinked();
    };
  }, [pathname]);

  return null;
}
