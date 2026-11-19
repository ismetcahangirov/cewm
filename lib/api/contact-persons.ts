import type { ReorderInput, ToggleActiveInput } from "@/lib/validation/client-logos";
import type { ContactPersonDto, ContactPersonInput } from "@/lib/validation/contact-persons";

import { baseApi } from "./base-api";

const list = { type: "ContactPerson", id: "LIST" } as const;
const mediaList = { type: "Media", id: "LIST" } as const;

export const contactPersonsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getContactPersons: build.query<ContactPersonDto[], void>({
      query: () => "admin/contact-persons",
      providesTags: [list],
    }),
    createContactPerson: build.mutation<{ id: string }, ContactPersonInput>({
      query: (body) => ({ url: "admin/contact-persons", method: "POST", body }),
      invalidatesTags: [list, mediaList],
    }),
    updateContactPerson: build.mutation<{ id: string }, ContactPersonInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/contact-persons/${id}`, method: "PUT", body }),
      invalidatesTags: [list, mediaList],
    }),
    toggleContactPerson: build.mutation<void, ToggleActiveInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/contact-persons/${id}`, method: "PATCH", body }),
      async onQueryStarted({ id, isActive }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          contactPersonsApi.util.updateQueryData("getContactPersons", undefined, (draft) => {
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
    reorderContactPersons: build.mutation<void, ReorderInput>({
      query: (body) => ({ url: "admin/contact-persons/reorder", method: "POST", body }),
      async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          contactPersonsApi.util.updateQueryData("getContactPersons", undefined, (draft) => {
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
    deleteContactPerson: build.mutation<void, string>({
      query: (id) => ({ url: `admin/contact-persons/${id}`, method: "DELETE" }),
      invalidatesTags: [list, mediaList],
    }),
  }),
});

export const {
  useGetContactPersonsQuery,
  useCreateContactPersonMutation,
  useUpdateContactPersonMutation,
  useToggleContactPersonMutation,
  useReorderContactPersonsMutation,
  useDeleteContactPersonMutation,
} = contactPersonsApi;
