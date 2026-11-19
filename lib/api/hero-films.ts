import type { HeroFilmDto, HeroFilmInput } from "@/lib/validation/hero-films";

import { baseApi } from "./base-api";

const list = { type: "HeroFilm", id: "LIST" } as const;
const mediaList = { type: "Media", id: "LIST" } as const;

export const heroFilmsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHeroFilms: build.query<HeroFilmDto[], void>({
      query: () => "admin/hero-films",
      providesTags: [list],
    }),
    createHeroFilm: build.mutation<{ id: string }, HeroFilmInput>({
      query: (body) => ({ url: "admin/hero-films", method: "POST", body }),
      invalidatesTags: [list, mediaList],
    }),
    updateHeroFilm: build.mutation<{ id: string }, HeroFilmInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `admin/hero-films/${id}`, method: "PUT", body }),
      invalidatesTags: [list, mediaList],
    }),
    deleteHeroFilm: build.mutation<void, string>({
      query: (id) => ({ url: `admin/hero-films/${id}`, method: "DELETE" }),
      invalidatesTags: [list, mediaList, "Settings"],
    }),
  }),
});

export const {
  useGetHeroFilmsQuery,
  useCreateHeroFilmMutation,
  useUpdateHeroFilmMutation,
  useDeleteHeroFilmMutation,
} = heroFilmsApi;
