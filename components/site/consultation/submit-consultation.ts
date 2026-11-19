import { consultationApi } from "@/lib/api/consultation";
import { makePublicStore } from "@/lib/store/public";
import {
  consultationSubmissionSchema,
  type ConsultationSubmissionInput,
} from "@/lib/validation/consultation-requests";

const store = makePublicStore();

export function validateConsultation(payload: ConsultationSubmissionInput) {
  return consultationSubmissionSchema.safeParse(payload);
}

export async function submitConsultation(payload: ConsultationSubmissionInput) {
  const request = store.dispatch(
    consultationApi.endpoints.submitConsultationRequest.initiate(payload),
  );
  const result = await request;
  request.reset();
  return result;
}
