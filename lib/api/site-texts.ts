import type { SiteTextsDto, SiteTextsInput } from "@/lib/validation/site-texts";

import { baseApi } from "./base-api";

export const siteTextsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSiteTexts: build.query<SiteTextsDto, void>({
      query: () => "admin/site-texts",
      providesTags: [{ type: "Settings", id: "TEXTS" }],
    }),
    updateSiteTexts: build.mutation<SiteTextsDto, SiteTextsInput>({
      query: (body) => ({ url: "admin/site-texts", method: "PUT", body }),
      invalidatesTags: [{ type: "Settings", id: "TEXTS" }],
    }),
  }),
});

export const { useGetSiteTextsQuery, useUpdateSiteTextsMutation } = siteTextsApi;
