import type {
  CreateMenuInput,
  MenuDetailDto,
  MenuSummaryDto,
  MenuTargetsDto,
  ReorderMenusInput,
  SaveMenuInput,
} from "@/lib/validation/menus";

import { baseApi } from "./base-api";

export const menusApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMenus: build.query<MenuSummaryDto[], void>({
      query: () => "admin/menus",
      providesTags: [{ type: "Menu", id: "LIST" }],
    }),
    getMenu: build.query<MenuDetailDto, string>({
      query: (id) => `admin/menus/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Menu", id }],
    }),
    getMenuTargets: build.query<MenuTargetsDto, void>({
      query: () => "admin/menus/targets",
      providesTags: [
        { type: "Menu", id: "TARGETS" },
        { type: "Category", id: "LIST" },
        { type: "Page", id: "LIST" },
      ],
    }),
    createMenu: build.mutation<MenuSummaryDto, CreateMenuInput>({
      query: (body) => ({ url: "admin/menus", method: "POST", body }),
      invalidatesTags: [{ type: "Menu", id: "LIST" }],
    }),
    saveMenu: build.mutation<MenuDetailDto, SaveMenuInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/menus/${id}`, method: "PUT", body }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result) dispatch(menusApi.util.upsertQueryData("getMenu", id, result.data));
      },
      invalidatesTags: [{ type: "Menu", id: "LIST" }],
    }),
    reorderMenus: build.mutation<void, ReorderMenusInput>({
      query: (body) => ({ url: "admin/menus/reorder", method: "POST", body }),
      async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          menusApi.util.updateQueryData("getMenus", undefined, (draft) => {
            for (const [index, id] of orderedIds.entries()) {
              const menu = draft.find((item) => item.id === id);
              if (menu) menu.sortOrder = index + 1;
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
      invalidatesTags: [{ type: "Menu", id: "LIST" }],
    }),
    deleteMenu: build.mutation<void, string>({
      query: (id) => ({ url: `admin/menus/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Menu", id: "LIST" }],
    }),
  }),
});

export const {
  useGetMenusQuery,
  useGetMenuQuery,
  useGetMenuTargetsQuery,
  useCreateMenuMutation,
  useSaveMenuMutation,
  useReorderMenusMutation,
  useDeleteMenuMutation,
} = menusApi;
