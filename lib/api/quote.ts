import type { QuoteSubmissionInput } from "@/lib/validation/quote-requests";

import { baseApi } from "./base-api";

export const quoteApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitQuoteRequest: build.mutation<{ id: string }, QuoteSubmissionInput>({
      query: (body) => ({ url: "quote-requests", method: "POST", body }),
    }),
  }),
});

export const { useSubmitQuoteRequestMutation } = quoteApi;
