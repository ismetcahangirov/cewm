import type { BrandDto, BrandInput } from "@/lib/validation/brands";
import type { ReorderInput, ToggleActiveInput } from "@/lib/validation/client-logos";

import { baseApi } from "./base-api";

const list = { type: "Brand", id: "LIST" } as const;
const mediaList = { type: "Media", id: "LIST" } as const;

export const brandsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBrands: build.query<BrandDto[], void>({
      query: () => "admin/brands",
      providesTags: [list],
    }),
    createBrand: build.mutation<{ id: string }, BrandInput>({
      query: (body) => ({ url: "admin/brands", method: "POST", body }),
      invalidatesTags: [list, mediaList],
    }),
    updateBrand: build.mutation<{ id: string }, BrandInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/brands/${id}`, method: "PUT", body }),
      invalidatesTags: [list, mediaList],
    }),
    toggleBrand: build.mutation<void, ToggleActiveInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/brands/${id}`, method: "PATCH", body }),
      async onQueryStarted({ id, isActive }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          brandsApi.util.updateQueryData("getBrands", undefined, (draft) => {
            const row = draft.find((item) => item.id === id);
            if (row) row.isActive = isActive;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderBrands: build.mutation<void, ReorderInput>({
      query: (body) => ({ url: "admin/brands/reorder", method: "POST", body }),
      async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          brandsApi.util.updateQueryData("getBrands", undefined, (draft) => {
            for (const [index, id] of orderedIds.entries()) {
              const row = draft.find((item) => item.id === id);
              if (row) row.sortOrder = index;
            }
            draft.sort((a, b) => a.sortOrder - b.sortOrder);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [list],
    }),
    deleteBrand: build.mutation<void, string>({
      query: (id) => ({ url: `admin/brands/${id}`, method: "DELETE" }),
      invalidatesTags: [list, mediaList],
    }),
  }),
});

export const {
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useToggleBrandMutation,
  useReorderBrandsMutation,
  useDeleteBrandMutation,
} = brandsApi;
