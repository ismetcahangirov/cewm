import { quoteApi } from "@/lib/api/quote";
import { makePublicStore } from "@/lib/store/public";
import { quoteSubmissionSchema, type QuoteSubmissionInput } from "@/lib/validation/quote-requests";

const store = makePublicStore();

export function validateQuote(payload: QuoteSubmissionInput) {
  return quoteSubmissionSchema.safeParse(payload);
}

export async function submitQuote(payload: QuoteSubmissionInput) {
  const request = store.dispatch(quoteApi.endpoints.submitQuoteRequest.initiate(payload));
  const result = await request;
  request.reset();
  return result;
}
