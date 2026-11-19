import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api/types";

import { EmptyState } from "./page-header";

export function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-10 w-1/2" />
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-96 lg:col-span-8" />
        <Skeleton className="h-96 lg:col-span-4" />
      </div>
    </div>
  );
}

export function EditorLoadError({
  error,
  backHref,
  backLabel,
  missing,
  failed,
}: {
  error: unknown;
  backHref: string;
  backLabel: string;
  missing: string;
  failed: string;
}) {
  const notFound = isApiError(error) && error.status === 404;
  return (
    <EmptyState
      action={
        <Button asChild variant="outline">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      }
    >
      {notFound ? missing : failed}
    </EmptyState>
  );
}
