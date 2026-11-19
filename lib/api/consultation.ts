import type { ConsultationSubmissionInput } from "@/lib/validation/consultation-requests";

import { baseApi } from "./base-api";

export const consultationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitConsultationRequest: build.mutation<{ id: string }, ConsultationSubmissionInput>({
      query: (body) => ({ url: "consultation-requests", method: "POST", body }),
    }),
  }),
});

export const { useSubmitConsultationRequestMutation } = consultationApi;
