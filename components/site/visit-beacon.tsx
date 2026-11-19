"use client";

import { useEffect } from "react";

export function VisitBeacon() {
  useEffect(() => {
    navigator.sendBeacon("/api/visits");
  }, []);

  return null;
}
