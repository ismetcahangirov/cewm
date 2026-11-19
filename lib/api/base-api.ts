import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({ baseUrl: "/api" });

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && typeof window !== "undefined") {
    const login = new URL("/admin/login", window.location.origin);
    login.searchParams.set("next", window.location.pathname + window.location.search);
    window.location.assign(login.href);
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Product",
    "Category",
    "Brand",
    "Page",
    "Post",
    "ClientLogo",
    "ContactPerson",
    "HeroFilm",
    "Menu",
    "Settings",
    "ConsultationRequest",
    "Media",
    "Redirect",
    "User",
  ],
  endpoints: () => ({}),
});
