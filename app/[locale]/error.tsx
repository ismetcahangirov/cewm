"use client";

import { useParams } from "next/navigation";

import { button } from "@/components/site/button";
import { isLocale, localePath, type Locale } from "@/lib/i18n/config";

const copy: Record<Locale, { title: string; body: string; retry: string; home: string }> = {
  az: {
    title: "Səhifəni açmaq alınmadı",
    body: "Bir az sonra yenidən cəhd edin və ya bizə zəng edin.",
    retry: "Yenidən cəhd et",
    home: "Ana səhifə",
  },
  ru: {
    title: "Не удалось открыть страницу",
    body: "Попробуйте ещё раз немного позже или позвоните нам.",
    retry: "Попробовать снова",
    home: "Главная",
  },
  en: {
    title: "The page could not be opened",
    body: "Please try again in a moment or give us a call.",
    retry: "Try again",
    home: "Home page",
  },
  de: {
    title: "Die Seite konnte nicht geöffnet werden",
    body: "Bitte versuchen Sie es gleich noch einmal oder rufen Sie uns an.",
    retry: "Erneut versuchen",
    home: "Startseite",
  },
};

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  const code: Locale = isLocale(locale) ? locale : "az";
  const text = copy[code];
  return (
    <div className="container-page py-section">
      <h1 className="text-h1">{text.title}</h1>
      <p className="mt-6 max-w-prose">{text.body}</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <button type="button" onClick={reset} className={button()}>
          {text.retry}
        </button>
        <a href={localePath(code)} className={button({ variant: "outline" })}>
          {text.home}
        </a>
      </div>
    </div>
  );
}
