import type { SettingsDto, SettingsInput } from "@/lib/validation/settings";

import { baseApi } from "./base-api";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<SettingsDto, void>({
      query: () => "admin/settings",
      providesTags: [{ type: "Settings", id: "SITE" }],
    }),
    updateSettings: build.mutation<SettingsDto, SettingsInput>({
      query: (body) => ({ url: "admin/settings", method: "PUT", body }),
      async onQueryStarted(_input, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result)
          dispatch(settingsApi.util.upsertQueryData("getSettings", undefined, result.data));
      },
      invalidatesTags: (result) => (result ? [{ type: "Media", id: "LIST" }] : []),
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
