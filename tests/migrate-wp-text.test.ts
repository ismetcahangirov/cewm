import { describe, expect, it } from "vitest";

import { cleanDescription, htmlToRichText } from "../scripts/migrate-wp/html";
import {
  hasMixedScriptWord,
  judgeText,
  languageProblem,
  repairMixedScript,
  sentenceCaseIfShouting,
} from "../scripts/migrate-wp/text";
import { splitLabelUnit, splitValueUnit } from "../scripts/migrate-wp/units";

describe("unit splitting", () => {
  it("splits a trailing unit from a number", () => {
    expect(splitValueUnit("65 мм")).toEqual({ value: "65", unit: "мм" });
    expect(splitValueUnit("3200 / 3800 mm")).toEqual({ value: "3200 / 3800", unit: "mm" });
    expect(splitValueUnit("5,0–6,0 т")).toEqual({ value: "5,0–6,0", unit: "т" });
    expect(splitValueUnit("до 60 м/мин")).toEqual({ value: "до 60", unit: "м/мин" });
    expect(splitValueUnit("max. 30 kN")).toEqual({ value: "max. 30", unit: "kN" });
  });

  it("reads bracketed units", () => {
    expect(splitValueUnit("90 [m/min]")).toEqual({ value: "90", unit: "m/min" });
    expect(splitLabelUnit("Длина заготовки [мм]")).toEqual({
      value: "Длина заготовки",
      unit: "мм",
    });
  });

  it("leaves values it cannot read cleanly", () => {
    expect(splitValueUnit("5,5 кВт (опционально 7,5 / 9,2 кВт)").unit).toBeNull();
    expect(splitValueUnit("powerTouch").unit).toBeNull();
    expect(splitValueUnit("6 var").unit).toBeNull();
    expect(splitValueUnit("3,200 [mm] 2,200 [mm]").unit).toBeNull();
    expect(splitLabelUnit("Control").unit).toBeNull();
  });
});

describe("mixed alphabets and wrong language", () => {
  it("moves look-alike letters into the alphabet of the word", () => {
    expect(repairMixedScript("oбрабатывающий центр", "ru")).toBe("обрабатывающий центр");
    expect(repairMixedScript("max. 30 кN", "en")).toBe("max. 30 kN");
  });

  it("flags words it cannot repair", () => {
    expect(hasMixedScriptWord("ОписаниTəsvirе")).toBe(true);
    expect(judgeText("Beschreibungсание", "de")).toEqual({ text: null, problem: "mixed-script" });
    expect(judgeText("Üstünlükləл", "az").problem).toBe("mixed-script");
  });

  it("rejects Russian text in a Latin-script language and English text in Russian", () => {
    expect(languageProblem("Сверлильный и шкантозабивной станок с ЧПУ", "en")).toBe(
      "cyrillic-in-latin-language",
    );
    expect(languageProblem("Cutting machine for panels and small batches", "ru")).toBe(
      "latin-in-russian",
    );
    expect(languageProblem("Станок для раскроя плит SAWTEQ S-130", "ru")).toBeNull();
    expect(languageProblem("SAWTEQ S-130 slicing center", "en")).toBeNull();
  });

  it("keeps clean text and normalises spaces", () => {
    expect(judgeText("CABTEQ T-200 ", "de")).toEqual({ text: "CABTEQ T-200", problem: null });
    expect(judgeText("", "az")).toEqual({ text: null, problem: null });
  });

  it("lowers all-caps text except in German", () => {
    expect(sentenceCaseIfShouting("MƏHSULLAR", "az")).toBe("Məhsullar");
    expect(sentenceCaseIfShouting("WELTMARKTFÜHRER FÜR MÖBEL", "de")).toBe(
      "WELTMARKTFÜHRER FÜR MÖBEL",
    );
    expect(sentenceCaseIfShouting("Products", "en")).toBe("Products");
  });
});

describe("descriptions", () => {
  const html =
    "<p><strong>Lead sentence</strong></p>\n<p>Body text. (Panel saw HPP 130)</p>\n<p>(Panel saw HPP 130)</p>";

  it("removes the stray brochure fragment and the repeat inside the previous paragraph", () => {
    const cleaned = cleanDescription(html);
    expect(cleaned.removedFragments).toEqual(["(Panel saw HPP 130)"]);
    expect(cleaned.html).not.toContain("HPP");
    expect(cleaned.html).toContain("Body text.");
  });

  it("drops the lead paragraph that became the short description", () => {
    const cleaned = cleanDescription(html, { leadToRemove: "Lead sentence" });
    expect(cleaned.removedLead).toBe(true);
    expect(cleaned.html).not.toContain("Lead sentence");
  });

  it("converts to rich text and strips scripts, styles and unsafe links", () => {
    const doc = htmlToRichText(
      '<p>Safe <a href="javascript:alert(1)">link</a> <script>x()</script><strong style="color:red">bold</strong></p>',
    );
    const text = JSON.stringify(doc);
    expect(text).toContain("bold");
    expect(text).not.toContain("javascript");
    expect(text).not.toContain("script");
    expect(text).not.toContain("color");
  });
});
