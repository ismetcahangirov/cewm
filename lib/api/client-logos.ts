import type {
  ClientLogoDto,
  ClientLogoInput,
  ReorderInput,
  ToggleActiveInput,
} from "@/lib/validation/client-logos";

import { baseApi } from "./base-api";

const list = { type: "ClientLogo", id: "LIST" } as const;
const mediaList = { type: "Media", id: "LIST" } as const;

export const clientLogosApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getClientLogos: build.query<ClientLogoDto[], void>({
      query: () => "admin/client-logos",
      providesTags: [list],
    }),
    createClientLogo: build.mutation<{ id: string }, ClientLogoInput>({
      query: (body) => ({ url: "admin/client-logos", method: "POST", body }),
      invalidatesTags: [list, mediaList],
    }),
    updateClientLogo: build.mutation<{ id: string }, ClientLogoInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/client-logos/${id}`, method: "PUT", body }),
      invalidatesTags: [list, mediaList],
    }),
    toggleClientLogo: build.mutation<void, ToggleActiveInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/client-logos/${id}`, method: "PATCH", body }),
      async onQueryStarted({ id, isActive }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          clientLogosApi.util.updateQueryData("getClientLogos", undefined, (draft) => {
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
    reorderClientLogos: build.mutation<void, ReorderInput>({
      query: (body) => ({ url: "admin/client-logos/reorder", method: "POST", body }),
      async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          clientLogosApi.util.updateQueryData("getClientLogos", undefined, (draft) => {
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
    deleteClientLogo: build.mutation<void, string>({
      query: (id) => ({ url: `admin/client-logos/${id}`, method: "DELETE" }),
      invalidatesTags: [list, mediaList],
    }),
  }),
});

export const {
  useGetClientLogosQuery,
  useCreateClientLogoMutation,
  useUpdateClientLogoMutation,
  useToggleClientLogoMutation,
  useReorderClientLogosMutation,
  useDeleteClientLogoMutation,
} = clientLogosApi;
