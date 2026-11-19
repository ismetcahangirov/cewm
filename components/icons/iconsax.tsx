import type { ReactNode, SVGProps } from "react";

export type IconSize = 16 | 20 | 24 | 32;

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: IconSize };

export function Linear({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Bold({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M14.43 5.93L20.5 12l-6.07 6.07M3.5 12h16.83" />
    </Linear>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M19.92 8.95l-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95" />
    </Linear>
  );
}

export function AddIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M6 12h12M12 18V6" />
    </Linear>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M7.76 16.24l8.48-8.48M16.24 16.24L7.76 7.76" />
    </Linear>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </Linear>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
      <path d="M8 3h1a28.424 28.424 0 0 0 0 18H8M15 3a28.424 28.424 0 0 1 0 18" />
      <path d="M3 16v-1a28.424 28.424 0 0 0 18 0v1M3 9a28.424 28.424 0 0 1 18 0" />
    </Linear>
  );
}

export function CallIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M21.97 18.33c0 .36-.08.73-.25 1.09-.17.36-.39.7-.68 1.02-.49.54-1.03.93-1.64 1.18-.6.25-1.25.38-1.95.38-1.02 0-2.11-.24-3.26-.73s-2.3-1.15-3.44-1.98a28.75 28.75 0 0 1-3.28-2.8 28.414 28.414 0 0 1-2.79-3.27c-.82-1.14-1.48-2.28-1.96-3.41C2.24 8.67 2 7.58 2 6.54c0-.68.12-1.33.36-1.93.24-.61.62-1.17 1.15-1.67C4.15 2.31 4.85 2 5.59 2c.28 0 .56.06.81.18.26.12.49.3.67.56l2.32 3.27c.18.25.31.48.4.7.09.21.14.42.14.61 0 .24-.07.48-.21.71-.13.23-.32.47-.56.71l-.76.79c-.11.11-.16.24-.16.4 0 .08.01.15.03.23.03.08.06.14.08.2.18.33.49.76.93 1.28.45.52.93 1.05 1.45 1.58.54.53 1.06 1.02 1.59 1.47.52.44.95.74 1.29.92.05.02.11.05.18.08.08.03.16.04.25.04.17 0 .3-.06.41-.17l.76-.75c.25-.25.49-.44.72-.56.23-.14.46-.21.71-.21.19 0 .39.04.61.13.22.09.45.22.7.39l3.31 2.35c.26.18.44.39.55.64.1.25.16.5.16.78Z" />
    </Linear>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M17 20.5H7c-3 0-5-1.5-5-5v-7c0-3.5 2-5 5-5h10c3 0 5 1.5 5 5v7c0 3.5-2 5-5 5Z" />
      <path d="m17 9-3.13 2.5c-1.03.82-2.72.82-3.75 0L7 9" />
    </Linear>
  );
}

export function LocationIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24Z" />
      <path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05Z" />
    </Linear>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10Z" />
      <path d="m15.71 15.18-3.1-1.85c-.54-.32-.98-1.09-.98-1.72v-4.1" />
    </Linear>
  );
}

export function ExportSquareIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M13 11l8.2-8.2M22 6.8V2h-4.8M11 2H9C4 2 2 4 2 9v6c0 5 2 7 7 7h6c5 0 7-2 7-7v-2" />
    </Linear>
  );
}

export function DangerIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M12 9v5M12 21.41H5.94c-3.47 0-4.92-2.48-3.24-5.51l3.12-5.62L8.76 5c1.78-3.21 4.7-3.21 6.48 0l2.94 5.29 3.12 5.62c1.68 3.03.22 5.51-3.24 5.51H12v-.01Z" />
      <path d="M11.995 17h.009" strokeWidth={2} />
    </Linear>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Bold {...props}>
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81v8.37C2 19.83 4.17 22 7.81 22h8.37c3.64 0 5.81-2.17 5.81-5.81V7.81C22 4.17 19.83 2 16.19 2ZM12 15.88c-2.14 0-3.88-1.74-3.88-3.88 0-2.14 1.74-3.88 3.88-3.88 2.14 0 3.88 1.74 3.88 3.88 0 2.14-1.74 3.88-3.88 3.88Zm5.92-9c-.05.12-.12.23-.21.33-.1.09-.21.16-.33.21a.995.995 0 0 1-1.09-.21c-.09-.1-.16-.21-.21-.33A.995.995 0 0 1 16 6.5c0-.13.03-.26.08-.38.05-.13.12-.23.21-.33.23-.23.58-.34.9-.27.07.01.13.03.19.06.06.02.12.05.18.09.05.03.1.08.15.12.09.1.16.2.21.33.05.12.08.25.08.38s-.03.26-.08.38Z" />
    </Bold>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Bold {...props}>
      <path d="M22 16.19c0 3.64-2.17 5.81-5.81 5.81H15c-.55 0-1-.45-1-1v-5.77c0-.27.22-.5.49-.5l1.76-.03c.14-.01.26-.11.29-.25l.35-1.91a.303.303 0 00-.3-.35l-2.13.03c-.28 0-.5-.22-.51-.49l-.04-2.45c0-.16.13-.3.3-.3l2.4-.04c.17 0 .3-.13.3-.3l-.04-2.4c0-.17-.13-.3-.3-.3l-2.7.04a2.996 2.996 0 00-2.95 3.05l.05 2.75c.01.28-.21.5-.49.51l-1.2.02c-.17 0-.3.13-.3.3l.03 1.9c0 .17.13.3.3.3l1.2-.02c.28 0 .5.22.51.49l.09 5.7c.01.56-.44 1.02-1 1.02h-2.3C4.17 22 2 19.83 2 16.18V7.81C2 4.17 4.17 2 7.81 2h8.38C19.83 2 22 4.17 22 7.81v8.38z" />
    </Bold>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <Bold {...props}>
      <path d="M17 4H7C4 4 2 6 2 9v6c0 3 2 5 5 5h10c3 0 5-2 5-5V9c0-3-2-5-5-5zm-3.11 9.03l-2.47 1.48c-1 .6-1.82.14-1.82-1.03v-2.97c0-1.17.82-1.63 1.82-1.03l2.47 1.48c.95.58.95 1.5 0 2.07z" />
    </Bold>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <Bold {...props}>
      <path d="M21.98 11.41c-.34-5.8-5.61-10.27-11.68-9.27-4.18.69-7.53 4.08-8.18 8.26-.38 2.42.12 4.71 1.21 6.6l-.89 3.31c-.2.75.49 1.43 1.23 1.22l3.26-.9c1.48.87 3.21 1.37 5.06 1.37 5.64 0 10.32-4.97 9.99-10.59zm-5.1 4.31a2.279 2.279 0 01-1.16 1.1c-.3.13-.63.19-.98.19-.51 0-1.06-.12-1.63-.37a9.16 9.16 0 01-1.72-.99c-.58-.42-1.12-.89-1.64-1.4-.52-.52-.98-1.07-1.4-1.64-.41-.57-.74-1.14-.98-1.71-.24-.57-.36-1.12-.36-1.64 0-.34.06-.67.18-.97.12-.31.31-.59.58-.84.32-.32.67-.47 1.04-.47.14 0 .28.03.41.09.13.06.25.15.34.28l1.16 1.64c.09.13.16.24.2.35.05.11.07.21.07.31 0 .12-.04.24-.11.36s-.16.24-.28.36l-.38.4c-.06.06-.08.12-.08.2 0 .04.01.08.02.12.02.04.03.07.04.1.09.17.25.38.47.64a13.482 13.482 0 001.53 1.53c.26.22.48.37.65.46.03.01.06.03.09.04.04.02.08.02.13.02.09 0 .15-.03.21-.09l.38-.38c.13-.13.25-.22.36-.28.12-.07.23-.11.36-.11.1 0 .2.02.31.07.11.05.23.11.35.2l1.66 1.18c.13.09.22.2.28.32.05.13.08.25.08.39-.06.17-.1.36-.18.54z" />
    </Bold>
  );
}

export function LinkedinIcon(props: IconProps) {
  return (
    <Bold {...props}>
      <path
        fillRule="evenodd"
        d="M7.81 2h8.38C19.83 2 22 4.17 22 7.81v8.38C22 19.83 19.83 22 16.19 22H7.81C4.17 22 2 19.83 2 16.19V7.81C2 4.17 4.17 2 7.81 2ZM6.25 9.5v8h2.5v-8h-2.5Zm1.25-1.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm3.25 1.25v8h2.5v-4.4c0-1.1.7-1.6 1.4-1.6.75 0 1.1.55 1.1 1.55v4.45h2.5v-4.95c0-2.3-1.25-3.25-2.85-3.25-1.05 0-1.8.5-2.15 1.05V9.5h-2.5Z"
      />
    </Bold>
  );
}

export function TiktokIcon(props: IconProps) {
  return (
    <Bold {...props}>
      <path
        fillRule="evenodd"
        d="M7.81 2h8.38C19.83 2 22 4.17 22 7.81v8.38C22 19.83 19.83 22 16.19 22H7.81C4.17 22 2 19.83 2 16.19V7.81C2 4.17 4.17 2 7.81 2Zm5.44 3.5v8.6a1.9 1.9 0 1 1-1.9-1.9c.2 0 .4.03.58.09V9.75a4.45 4.45 0 1 0 3.87 4.41V9.73a5.4 5.4 0 0 0 2.95.92V8.1a2.95 2.95 0 0 1-2.95-2.6h-2.55Z"
      />
    </Bold>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M9.57 5.93L3.5 12l6.07 6.07M20.5 12H3.67" />
    </Linear>
  );
}

export function ArrowLeft2Icon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08" />
    </Linear>
  );
}

export function ArrowRight2Icon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M8.91 19.92l6.52-6.52c.77-.77.77-2.03 0-2.8L8.91 4.08" />
    </Linear>
  );
}

export function Maximize4Icon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M21 9V3h-6M3 15v6h6M21 3l-7.5 7.5M10.5 13.5 3 21" />
    </Linear>
  );
}

export function DocumentDownloadIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M9 11v6l2-2M9 17l-2-2" />
      <path d="M22 10v5c0 5-2 7-7 7H9c-5 0-7-2-7-7V9c0-5 2-7 7-7h5" />
      <path d="M22 10h-4c-3 0-4-1-4-4V2l8 8Z" />
    </Linear>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Linear {...props}>
      <path d="M4 12V8.44c0-4.42 3.13-6.23 6.96-4.02l3.09 1.78 3.09 1.78c3.83 2.21 3.83 5.83 0 8.04l-3.09 1.78-3.09 1.78C7.13 21.79 4 19.98 4 15.56V12Z" />
    </Linear>
  );
}
