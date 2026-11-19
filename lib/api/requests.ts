import type {
  ConsultationRequestDetailDto,
  ConsultationRequestListArgs,
  ConsultationRequestListItemDto,
  UpdateConsultationRequestInput,
} from "@/lib/validation/consultation-requests";

import { baseApi } from "./base-api";
import type { Page } from "./types";

const listAndUnread = [
  { type: "ConsultationRequest" as const, id: "LIST" },
  { type: "ConsultationRequest" as const, id: "UNREAD" },
];

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRequests: build.query<Page<ConsultationRequestListItemDto>, ConsultationRequestListArgs>({
      query: (params) => ({ url: "admin/consultation-requests", params }),
      providesTags: (result) => [
        { type: "ConsultationRequest", id: "LIST" },
        ...(result?.rows ?? []).map((row) => ({
          type: "ConsultationRequest" as const,
          id: row.id,
        })),
      ],
    }),
    getRequest: build.query<ConsultationRequestDetailDto, string>({
      query: (id) => `admin/consultation-requests/${id}`,
      providesTags: (_result, _error, id) => [{ type: "ConsultationRequest", id }],
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result?.data.markedSeen) dispatch(baseApi.util.invalidateTags(listAndUnread));
      },
    }),
    updateRequest: build.mutation<
      ConsultationRequestDetailDto,
      UpdateConsultationRequestInput & { id: string }
    >({
      query: ({ id, ...body }) => ({
        url: `admin/consultation-requests/${id}`,
        method: "PATCH",
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result) dispatch(requestsApi.util.upsertQueryData("getRequest", id, result.data));
      },
      invalidatesTags: (result) => (result ? listAndUnread : []),
    }),
    deleteRequest: build.mutation<void, string>({
      query: (id) => ({ url: `admin/consultation-requests/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, error) => (error ? [] : listAndUnread),
    }),
  }),
});

export const {
  useGetRequestsQuery,
  useGetRequestQuery,
  useUpdateRequestMutation,
  useDeleteRequestMutation,
} = requestsApi;

export function requestsExportHref(filters: { status: string; search: string }): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const query = params.toString();
  return `/api/admin/consultation-requests/export${query ? `?${query}` : ""}`;
}
