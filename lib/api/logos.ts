import type {
  LogoDto,
  LogoInput,
  ReorderLogosInput,
  ToggleLogoInput,
} from "@/lib/validation/logos";

import { baseApi } from "./base-api";

export const logosApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLogos: build.query<LogoDto[], void>({
      query: () => "admin/logos",
      providesTags: [{ type: "Logo", id: "LIST" }],
    }),
    createLogo: build.mutation<{ id: string }, LogoInput>({
      query: (body) => ({ url: "admin/logos", method: "POST", body }),
      invalidatesTags: [
        { type: "Logo", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    updateLogo: build.mutation<{ id: string }, LogoInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/logos/${id}`, method: "PUT", body }),
      invalidatesTags: [
        { type: "Logo", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    toggleLogo: build.mutation<void, ToggleLogoInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/logos/${id}`, method: "PATCH", body }),
      async onQueryStarted({ id, isActive }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          logosApi.util.updateQueryData("getLogos", undefined, (draft) => {
            const logo = draft.find((item) => item.id === id);
            if (logo) logo.isActive = isActive;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderLogos: build.mutation<void, ReorderLogosInput>({
      query: (body) => ({ url: "admin/logos/reorder", method: "POST", body }),
      async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          logosApi.util.updateQueryData("getLogos", undefined, (draft) => {
            for (const [index, id] of orderedIds.entries()) {
              const logo = draft.find((item) => item.id === id);
              if (logo) logo.sortOrder = index;
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
      invalidatesTags: [{ type: "Logo", id: "LIST" }],
    }),
    deleteLogo: build.mutation<void, string>({
      query: (id) => ({ url: `admin/logos/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Logo", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetLogosQuery,
  useCreateLogoMutation,
  useUpdateLogoMutation,
  useToggleLogoMutation,
  useReorderLogosMutation,
  useDeleteLogoMutation,
} = logosApi;
