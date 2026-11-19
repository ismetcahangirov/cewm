import type {
  ReorderTeamInput,
  TeamMemberDto,
  TeamMemberInput,
  ToggleTeamMemberInput,
} from "@/lib/validation/team";

import { baseApi } from "./base-api";

const list = { type: "TeamMember", id: "LIST" } as const;
const mediaList = { type: "Media", id: "LIST" } as const;

export const teamApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTeamMembers: build.query<TeamMemberDto[], void>({
      query: () => "admin/team",
      providesTags: [list],
    }),
    createTeamMember: build.mutation<{ id: string }, TeamMemberInput>({
      query: (body) => ({ url: "admin/team", method: "POST", body }),
      invalidatesTags: [list, mediaList],
    }),
    updateTeamMember: build.mutation<{ id: string }, TeamMemberInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/team/${id}`, method: "PUT", body }),
      invalidatesTags: [list, mediaList],
    }),
    toggleTeamMember: build.mutation<void, ToggleTeamMemberInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/team/${id}`, method: "PATCH", body }),
      async onQueryStarted({ id, isActive }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          teamApi.util.updateQueryData("getTeamMembers", undefined, (draft) => {
            const member = draft.find((item) => item.id === id);
            if (member) member.isActive = isActive;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderTeamMembers: build.mutation<void, ReorderTeamInput>({
      query: (body) => ({ url: "admin/team/reorder", method: "POST", body }),
      async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          teamApi.util.updateQueryData("getTeamMembers", undefined, (draft) => {
            for (const [index, id] of orderedIds.entries()) {
              const member = draft.find((item) => item.id === id);
              if (member) member.sortOrder = index;
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
    deleteTeamMember: build.mutation<void, string>({
      query: (id) => ({ url: `admin/team/${id}`, method: "DELETE" }),
      invalidatesTags: [list, mediaList],
    }),
  }),
});

export const {
  useGetTeamMembersQuery,
  useCreateTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useToggleTeamMemberMutation,
  useReorderTeamMembersMutation,
  useDeleteTeamMemberMutation,
} = teamApi;
