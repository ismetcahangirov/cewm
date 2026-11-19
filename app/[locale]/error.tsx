"use client";

import { useParams } from "next/navigation";

import { pill } from "@/components/site/pill";

const copy = {
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
} as const;

type Code = keyof typeof copy;

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  const code: Code = locale === "ru" || locale === "en" ? locale : "az";
  const text = copy[code];
  return (
    <div className="container-page py-section">
      <h1 className="text-statement">{text.title}</h1>
      <p className="mt-6 max-w-prose">{text.body}</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <button type="button" onClick={reset} className={pill({ variant: "filled" })}>
          {text.retry}
        </button>
        <a href={code === "az" ? "/" : `/${code}`} className={pill({ variant: "outline" })}>
          {text.home}
        </a>
      </div>
    </div>
  );
}
