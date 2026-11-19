"use client";

import { ArrowLeft, CheckCheck, Mail, Phone, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormLayout, FormSection } from "@/components/admin/form";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { RequestStatusBadge } from "@/components/admin/status-badge";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { WhatsAppIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/admin/format";
import { useT } from "@/lib/admin/i18n/use-t";
import {
  useDeleteRequestMutation,
  useGetRequestQuery,
  useUpdateRequestMutation,
} from "@/lib/api/requests";
import { apiErrorMessage, isApiError } from "@/lib/api/types";
import type { UserRole } from "@/lib/auth/roles";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import {
  consultationRequestLocaleLabels,
  consultationRequestStatuses,
  consultationRequestStatusLabels,
  type ConsultationRequestDetailDto,
  type ConsultationRequestProductDto,
  type ConsultationRequestStatus,
} from "@/lib/validation/consultation-requests";

const noteLimit = 5000;

export function RequestDetail({ id, role }: { id: string; role: UserRole }) {
  const t = useT();
  const query = useGetRequestQuery(id, { refetchOnMountOrArgChange: true });

  if (query.isLoading) {
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

  if (query.isError || !query.data) {
    const missing = isApiError(query.error) && query.error.status === 404;
    return (
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link href="/admin/requests">{t("Müraciətlərə qayıt")}</Link>
          </Button>
        }
      >
        {missing ? t("Müraciət tapılmadı.") : t("Müraciət yüklənmədi. Səhifəni yeniləyin.")}
      </EmptyState>
    );
  }

  return <RequestView key={query.data.id} request={query.data} role={role} />;
}

function ContactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <dt className="text-muted-foreground sm:w-28 sm:shrink-0">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function ProductRow({ product }: { product: ConsultationRequestProductDto }) {
  const t = useT();
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="relative size-10 shrink-0 border border-border bg-surface">
        {product.thumbnail ? (
          <Image src={product.thumbnail.src} alt="" fill sizes="40px" className="object-contain" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        {product.productId ? (
          <Link
            href={`/admin/products/${product.productId}`}
            className="block min-h-11 content-center break-words hover:underline lg:min-h-0"
          >
            {product.name}
          </Link>
        ) : (
          <span className="block break-words">{product.name}</span>
        )}
        {!product.productId ? (
          <span className="block text-muted-foreground">{t("Məhsul kataloqdan silinib.")}</span>
        ) : product.inTrash ? (
          <span className="block text-muted-foreground">{t("Məhsul silinənlərdədir.")}</span>
        ) : null}
      </span>
    </li>
  );
}

function RequestView({ request, role }: { request: ConsultationRequestDetailDto; role: UserRole }) {
  const t = useT();
  const router = useRouter();
  const noteId = useId();
  const [note, setNote] = useState(request.internalNote ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updateRequest, { isLoading: updating }] = useUpdateRequestMutation();
  const [deleteRequest] = useDeleteRequestMutation();
  const noteDirty = note.trim() !== (request.internalNote ?? "");
  const guard = useUnsavedChangesGuard(noteDirty);
  const [noteError, setNoteError] = useState<string | null>(null);

  async function changeStatus(status: ConsultationRequestStatus) {
    try {
      await updateRequest({ id: request.id, status }).unwrap();
      toast.success(
        t("Status: {status}.", { status: t.message(consultationRequestStatusLabels[status]) }),
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function saveNote() {
    setNoteError(null);
    try {
      const saved = await updateRequest({ id: request.id, internalNote: note }).unwrap();
      setNote(saved.internalNote ?? "");
      toast.success(t("Qeyd saxlanıldı."));
    } catch (error) {
      const message = isApiError(error)
        ? t.message(error.data.fields?.internalNote ?? error.data.message)
        : apiErrorMessage(error);
      setNoteError(message);
    }
  }

  async function remove(): Promise<boolean> {
    try {
      await deleteRequest(request.id).unwrap();
      guard.release();
      toast.success(t("Müraciət silindi."));
      router.push("/admin/requests");
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  return (
    <>
      <PageHeader
        title={request.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <span>
              {t("Göndərilib: {date}", { date: formatDateTime(request.createdAt, t.locale) })}
            </span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/requests">
                <ArrowLeft strokeWidth={1.5} />
                {t("Bütün müraciətlər")}
              </Link>
            </Button>
            {request.status !== "done" ? (
              <Button type="button" disabled={updating} onClick={() => changeStatus("done")}>
                <CheckCheck strokeWidth={1.5} />
                {t("Cavablandı kimi qeyd et")}
              </Button>
            ) : null}
          </>
        }
      />

      <FormLayout
        main={
          <>
            <FormSection title={t("Əlaqə")}>
              <dl className="flex flex-col gap-3 text-meta">
                <ContactRow label={t("Telefon")}>
                  <span className="flex flex-wrap items-center gap-2">
                    <a
                      href={telHref(request.phone)}
                      className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap hover:underline lg:min-h-0"
                    >
                      <Phone className="size-4" strokeWidth={1.5} aria-hidden="true" />
                      {formatAzerbaijaniPhone(request.phone)}
                    </a>
                    <Button asChild variant="ghost" size="icon-sm">
                      <a
                        href={whatsappHref(request.phone)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("{name}: WhatsApp-da yaz", { name: request.name })}
                        title={t("WhatsApp-da yaz")}
                      >
                        <WhatsAppIcon className="size-4" />
                      </a>
                    </Button>
                  </span>
                </ContactRow>
                <ContactRow label={t("E-poçt")}>
                  {request.email ? (
                    <a
                      href={mailtoHref(request.email, "CEWM: konsultasiya sorğunuz")}
                      className="inline-flex min-h-11 items-center gap-2 break-all hover:underline lg:min-h-0"
                    >
                      <Mail className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                      {request.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{t("Yazılmayıb")}</span>
                  )}
                </ContactRow>
                <ContactRow label={t("Şirkət")}>
                  {request.company ? (
                    <span className="break-words">{request.company}</span>
                  ) : (
                    <span className="text-muted-foreground">{t("Yazılmayıb")}</span>
                  )}
                </ContactRow>
              </dl>
            </FormSection>

            <FormSection title={t("Mesaj")}>
              {request.message ? (
                <p className="text-meta break-words whitespace-pre-line">{request.message}</p>
              ) : (
                <p className="text-meta text-muted-foreground">{t("Müştəri mesaj yazmayıb.")}</p>
              )}
            </FormSection>

            <FormSection title={t("Məhsullar ({count})", { count: request.products.length })}>
              {request.products.length ? (
                <ul className="divide-y divide-border text-meta">
                  {request.products.map((product) => (
                    <ProductRow key={product.id} product={product} />
                  ))}
                </ul>
              ) : (
                <p className="text-meta text-muted-foreground">
                  {t("Müraciət konkret məhsul seçilmədən göndərilib.")}
                </p>
              )}
            </FormSection>
          </>
        }
        aside={
          <>
            <FormSection title={t("Status")}>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${noteId}-status`} className="text-meta font-medium">
                  {t("Müraciətin vəziyyəti")}
                </label>
                <Select
                  value={request.status}
                  onValueChange={(value) => changeStatus(value as ConsultationRequestStatus)}
                  disabled={updating}
                >
                  <SelectTrigger id={`${noteId}-status`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {consultationRequestStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t.message(consultationRequestStatusLabels[status])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-meta text-muted-foreground">
                  {t("«Yeni» seçsəniz, müraciət yenidən oxunmamış sayılır.")}
                </p>
              </div>
            </FormSection>

            <FormSection title={t("Daxili qeyd")}>
              <div className="flex flex-col gap-2">
                <label htmlFor={noteId} className="text-meta font-medium">
                  {t("Qeyd")}
                </label>
                <Textarea
                  id={noteId}
                  value={note}
                  rows={5}
                  maxLength={noteLimit}
                  aria-invalid={Boolean(noteError)}
                  aria-describedby={`${noteId}-help`}
                  onChange={(event) => setNote(event.target.value)}
                />
                <p id={`${noteId}-help`} className="text-meta text-muted-foreground">
                  {t("Yalnız idarə panelində görünür, müştəriyə göndərilmir.")}
                </p>
                {noteError ? <p className="text-meta text-destructive">{noteError}</p> : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={!noteDirty || updating}
                  onClick={saveNote}
                >
                  {t("Qeydi saxla")}
                </Button>
              </div>
            </FormSection>

            <FormSection title={t("Məlumat")}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-meta">
                <dt className="text-muted-foreground">{t("Sayt dili")}</dt>
                <dd>{t.message(consultationRequestLocaleLabels[request.locale])}</dd>
                <dt className="text-muted-foreground">{t("Göndərilib")}</dt>
                <dd>{t("{date} (Bakı)", { date: formatDateTime(request.createdAt, t.locale) })}</dd>
                <dt className="text-muted-foreground">{t("Dəyişib")}</dt>
                <dd>{formatDateTime(request.updatedAt, t.locale)}</dd>
              </dl>
              {role === "owner" ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="self-start"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 strokeWidth={1.5} />
                  {t("Sil")}
                </Button>
              ) : null}
            </FormSection>
          </>
        }
      />

      {guard.dialog}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("«{name}» müraciəti silinsin?", { name: request.name })}
        description={t(
          "Müraciət həmişəlik silinəcək. Spam və ya təkrar sorğular üçün istifadə edin.",
        )}
        confirmLabel={t("Sil")}
        destructive
        onConfirm={remove}
      />
    </>
  );
}
