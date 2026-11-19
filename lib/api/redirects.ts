import type {
  RedirectDto,
  RedirectInput,
  RedirectListArgs,
  RedirectSaveResult,
} from "@/lib/validation/redirects";

import { baseApi } from "./base-api";
import type { Page } from "./types";

const list = { type: "Redirect" as const, id: "LIST" };

export const redirectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRedirects: build.query<Page<RedirectDto>, RedirectListArgs>({
      query: (params) => ({ url: "admin/redirects", params }),
      providesTags: [list],
    }),
    createRedirect: build.mutation<RedirectSaveResult, RedirectInput>({
      query: (body) => ({ url: "admin/redirects", method: "POST", body }),
      invalidatesTags: [list],
    }),
    updateRedirect: build.mutation<RedirectSaveResult, RedirectInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/redirects/${id}`, method: "PUT", body }),
      invalidatesTags: [list],
    }),
    deleteRedirect: build.mutation<void, string>({
      query: (id) => ({ url: `admin/redirects/${id}`, method: "DELETE" }),
      invalidatesTags: [list],
    }),
  }),
});

export const {
  useGetRedirectsQuery,
  useCreateRedirectMutation,
  useUpdateRedirectMutation,
  useDeleteRedirectMutation,
} = redirectsApi;
