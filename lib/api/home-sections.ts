import type { HomeSectionsDto, HomeSectionsInput } from "@/lib/validation/home-sections";

import { baseApi } from "./base-api";

export const homeSectionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHomeSections: build.query<HomeSectionsDto, void>({
      query: () => "admin/home-sections",
      providesTags: [{ type: "Settings", id: "HOME" }],
    }),
    updateHomeSections: build.mutation<HomeSectionsDto, HomeSectionsInput>({
      query: (body) => ({ url: "admin/home-sections", method: "PUT", body }),
      async onQueryStarted(_input, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result)
          dispatch(homeSectionsApi.util.upsertQueryData("getHomeSections", undefined, result.data));
      },
      invalidatesTags: (result) => (result ? [{ type: "Media", id: "LIST" }, "Product"] : []),
    }),
  }),
});

export const { useGetHomeSectionsQuery, useUpdateHomeSectionsMutation } = homeSectionsApi;
