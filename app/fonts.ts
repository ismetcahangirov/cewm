import { Golos_Text } from "next/font/google";
import localFont from "next/font/local";

export const workSans = localFont({
  src: "../assets/fonts/work-sans-az.woff2",
  weight: "300 500",
  style: "normal",
  display: "swap",
  variable: "--font-work-sans",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0130-0131, U+011E-011F, U+015E-015F, U+018F, U+0259, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0307-0308, U+0329, U+2000-206F, U+20AC, U+20BC, U+2116, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const workSansExtended = localFont({
  src: "../assets/fonts/work-sans-ext.woff2",
  weight: "300 500",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-work-sans-ext",
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0100-024F, U+0300-036F, U+1E00-1EFF, U+20A0-20C0, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

export const golosText = Golos_Text({
  subsets: ["cyrillic"],
  display: "swap",
  preload: false,
  variable: "--font-golos",
});

export const meblineDisplay = localFont({
  src: "../assets/fonts/mebline-display.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-mebline-display",
});

export const fontVariables = `${workSans.variable} ${workSansExtended.variable} ${golosText.variable} ${meblineDisplay.variable}`;
