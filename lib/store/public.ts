import { configureStore } from "@reduxjs/toolkit";

import { baseApi } from "@/lib/api/base-api";

export function makePublicStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}
