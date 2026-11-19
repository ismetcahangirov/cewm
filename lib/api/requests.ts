import type {
  QuoteRequestDetailDto,
  QuoteRequestListArgs,
  QuoteRequestListItemDto,
  UpdateQuoteRequestInput,
} from "@/lib/validation/quote-requests";

import { baseApi } from "./base-api";
import type { Page } from "./types";

const listAndUnread = [
  { type: "QuoteRequest" as const, id: "LIST" },
  { type: "QuoteRequest" as const, id: "UNREAD" },
];

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRequests: build.query<Page<QuoteRequestListItemDto>, QuoteRequestListArgs>({
      query: (params) => ({ url: "admin/quote-requests", params }),
      providesTags: (result) => [
        { type: "QuoteRequest", id: "LIST" },
        ...(result?.rows ?? []).map((row) => ({ type: "QuoteRequest" as const, id: row.id })),
      ],
    }),
    getRequest: build.query<QuoteRequestDetailDto, string>({
      query: (id) => `admin/quote-requests/${id}`,
      providesTags: (_result, _error, id) => [{ type: "QuoteRequest", id }],
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result?.data.markedSeen) dispatch(baseApi.util.invalidateTags(listAndUnread));
      },
    }),
    updateRequest: build.mutation<QuoteRequestDetailDto, UpdateQuoteRequestInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/quote-requests/${id}`, method: "PATCH", body }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result) dispatch(requestsApi.util.upsertQueryData("getRequest", id, result.data));
      },
      invalidatesTags: (result) => (result ? listAndUnread : []),
    }),
    deleteRequest: build.mutation<void, string>({
      query: (id) => ({ url: `admin/quote-requests/${id}`, method: "DELETE" }),
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
  return `/api/admin/quote-requests/export${query ? `?${query}` : ""}`;
}
