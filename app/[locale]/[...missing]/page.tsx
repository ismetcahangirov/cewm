import { notFound } from "next/navigation";

export function generateStaticParams() {
  return [{ missing: ["404"] }];
}

export default function MissingPage() {
  notFound();
}
