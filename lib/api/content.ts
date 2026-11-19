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
} = contentApi;
