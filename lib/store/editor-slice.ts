import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { defaultLocale, type Locale } from "@/lib/i18n/config";

export const contentLocaleCookie = "admin_content_locale";

export type EditorState = {
  contentLocale: Locale;
};

const initialState: EditorState = { contentLocale: defaultLocale };

export const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    setContentLocale(state, action: PayloadAction<Locale>) {
      state.contentLocale = action.payload;
    },
  },
});

export const { setContentLocale } = editorSlice.actions;
