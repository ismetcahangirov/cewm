import localFont from "next/font/local";

export const interLatin = localFont({
  src: "../assets/fonts/inter-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-inter-latin",
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0130-0131, U+011E-011F, U+015E-015F, U+018F, U+0259, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303, U+0307-0308, U+0327, U+1E9E, U+2000-206F, U+20AC, U+20BC, U+2116, U+2122, U+2190-2193, U+2212, U+2215",
    },
  ],
});

export const interCyrillic = localFont({
  src: "../assets/fonts/inter-cyrillic.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--font-inter-cyrillic",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0400-045F, U+0490-0491, U+04B0-04B1" }],
});

export const fontClassName = `${interLatin.variable} ${interCyrillic.variable}`;
