import type {
  PageDetailDto,
  PageInput,
  PageListArgs,
  PageListItemDto,
} from "@/lib/validation/pages";
import type {
  PostDetailDto,
  PostInput,
  PostListArgs,
  PostListItemDto,
} from "@/lib/validation/posts";
import type {
  ProjectDetailDto,
  ProjectInput,
  ProjectListArgs,
  ProjectListItemDto,
  ReorderProjectsInput,
} from "@/lib/validation/projects";
import type {
  VacancyDetailDto,
  VacancyInput,
  VacancyListArgs,
  VacancyListItemDto,
} from "@/lib/validation/vacancies";

import { baseApi } from "./base-api";
import type { Page } from "./types";

export const contentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPages: build.query<Page<PageListItemDto>, PageListArgs>({
      query: (params) => ({ url: "admin/pages", params }),
      providesTags: [{ type: "Page", id: "LIST" }],
    }),
    getPage: build.query<PageDetailDto, string>({
      query: (id) => `admin/pages/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Page", id }],
    }),
    createPage: build.mutation<{ id: string }, PageInput>({
      query: (body) => ({ url: "admin/pages", method: "POST", body }),
      invalidatesTags: [
        { type: "Page", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    updatePage: build.mutation<{ id: string }, PageInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/pages/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Page", id },
        { type: "Page", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    deletePage: build.mutation<void, string>({
      query: (id) => ({ url: `admin/pages/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Page", id },
        { type: "Page", id: "LIST" },
        { type: "Menu", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),

    getPosts: build.query<Page<PostListItemDto>, PostListArgs>({
      query: (params) => ({ url: "admin/posts", params }),
      providesTags: [{ type: "Post", id: "LIST" }],
    }),
    getPost: build.query<PostDetailDto, string>({
      query: (id) => `admin/posts/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Post", id }],
    }),
    createPost: build.mutation<{ id: string }, PostInput>({
      query: (body) => ({ url: "admin/posts", method: "POST", body }),
      invalidatesTags: [
        { type: "Post", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    updatePost: build.mutation<{ id: string }, PostInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/posts/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Post", id },
        { type: "Post", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    deletePost: build.mutation<void, string>({
      query: (id) => ({ url: `admin/posts/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Post", id },
        { type: "Post", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),

    getVacancies: build.query<Page<VacancyListItemDto>, VacancyListArgs>({
      query: (params) => ({ url: "admin/vacancies", params }),
      providesTags: [{ type: "Vacancy", id: "LIST" }],
    }),
    getVacancy: build.query<VacancyDetailDto, string>({
      query: (id) => `admin/vacancies/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Vacancy", id }],
    }),
    createVacancy: build.mutation<{ id: string }, VacancyInput>({
      query: (body) => ({ url: "admin/vacancies", method: "POST", body }),
      invalidatesTags: [{ type: "Vacancy", id: "LIST" }],
    }),
    updateVacancy: build.mutation<{ id: string }, VacancyInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/vacancies/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Vacancy", id },
        { type: "Vacancy", id: "LIST" },
      ],
    }),
    deleteVacancy: build.mutation<void, string>({
      query: (id) => ({ url: `admin/vacancies/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Vacancy", id },
        { type: "Vacancy", id: "LIST" },
      ],
    }),

    getProjects: build.query<Page<ProjectListItemDto>, ProjectListArgs>({
      query: (params) => ({ url: "admin/projects", params }),
      providesTags: [{ type: "Project", id: "LIST" }],
    }),
    getProjectOrder: build.query<ProjectListItemDto[], void>({
      query: () => "admin/projects/reorder",
      providesTags: [{ type: "Project", id: "LIST" }],
    }),
    getProject: build.query<ProjectDetailDto, string>({
      query: (id) => `admin/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Project", id }],
    }),
    createProject: build.mutation<{ id: string }, ProjectInput>({
      query: (body) => ({ url: "admin/projects", method: "POST", body }),
      invalidatesTags: [
        { type: "Project", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    updateProject: build.mutation<{ id: string }, ProjectInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/projects/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Project", id },
        { type: "Project", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
    reorderProjects: build.mutation<void, ReorderProjectsInput>({
      query: (body) => ({ url: "admin/projects/reorder", method: "POST", body }),
      async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          contentApi.util.updateQueryData("getProjectOrder", undefined, (draft) => {
            const position = new Map(orderedIds.map((id, index) => [id, index]));
            for (const item of draft) item.sortOrder = position.get(item.id) ?? item.sortOrder;
            draft.sort((a, b) => a.sortOrder - b.sortOrder);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),
    deleteProject: build.mutation<void, string>({
      query: (id) => ({ url: `admin/projects/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Project", id },
        { type: "Project", id: "LIST" },
        { type: "Menu", id: "LIST" },
        { type: "Media", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPagesQuery,
  useGetPageQuery,
  useCreatePageMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
  useGetPostsQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useGetVacanciesQuery,
  useGetVacancyQuery,
  useCreateVacancyMutation,
  useUpdateVacancyMutation,
  useDeleteVacancyMutation,
  useGetProjectsQuery,
  useGetProjectOrderQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useReorderProjectsMutation,
  useDeleteProjectMutation,
} = contentApi;
