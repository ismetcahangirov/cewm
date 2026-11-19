import { describe, expect, it } from "vitest";

import { normalizeAzerbaijaniPhone, formatPhoneInput } from "@/lib/phone";
import { parseProductIds } from "@/lib/public/consultation";

const a = "4b3c8927-766f-4bb4-b8fa-1ab30d83a1fd";
const b = "0f6e2b1a-1234-4abc-9def-0123456789ab";

describe("quote form helpers", () => {
  it("masks phone numbers while typing", () => {
    expect(formatPhoneInput("0552555423")).toBe("055 255 54 23");
    expect(formatPhoneInput("055")).toBe("055");
    expect(formatPhoneInput("+994552555423")).toBe("+994 55 255 54 23");
    expect(formatPhoneInput("994125265423")).toBe("+994 12 526 54 23");
    expect(formatPhoneInput("552555423")).toBe("55 255 54 23");
    expect(formatPhoneInput("+99")).toBe("+99");
    expect(formatPhoneInput("05525554239999")).toBe("055 255 54 23");
  });

  it("produces masked values the server accepts", () => {
    for (const raw of ["0552555423", "+994552555423", "552555423"]) {
      expect(normalizeAzerbaijaniPhone(formatPhoneInput(raw))).toBe("+994552555423");
    }
  });

  it("parses preselected products from the query", () => {
    expect(parseProductIds(undefined)).toEqual([]);
    expect(parseProductIds(`${a},${b},${a}`)).toEqual([a, b]);
    expect(parseProductIds([a.toUpperCase(), "nope"])).toEqual([a]);
    expect(parseProductIds("1; drop table")).toEqual([]);
  });
});
