import { describe, expect, it } from "vitest";

import { createTranslator } from "@/lib/admin/i18n/translate";

describe("admin translator", () => {
  const { translate, translateMessage } = createTranslator({
    ru: {
      "Yeni məhsul": "Новый товар",
      "Yeni#status": "Новая",
      "Ən çox {max} simvol ola bilər.": "Не более {max} символов.",
      "«{name}» silindi.": "«{name}» удалено.",
      "{count} məhsul": "{count} {count|товар|товара|товаров}",
    },
    en: {
      "Yeni məhsul": "New product",
      "Yeni#status": "New",
      "Ən çox {max} simvol ola bilər.": "At most {max} characters.",
      "«{name}» silindi.": "«{name}» was deleted.",
      "{count} məhsul": "{count} {count|product|products}",
    },
    de: {
      "Yeni məhsul": "Neues Produkt",
      "Yeni#status": "Neu",
      "Ən çox {max} simvol ola bilər.": "Höchstens {max} Zeichen.",
      "«{name}» silindi.": "„{name}“ wurde gelöscht.",
      "{count} məhsul": "{count} {count|Produkt|Produkte}",
    },
  });

  it("returns the Azerbaijani key as is and translates other locales", () => {
    expect(translate("az", "Yeni məhsul")).toBe("Yeni məhsul");
    expect(translate("ru", "Yeni məhsul")).toBe("Новый товар");
    expect(translate("en", "«{name}» silindi.", { name: "Baron" })).toBe("«Baron» was deleted.");
    expect(translate("az", "«{name}» silindi.", { name: "Baron" })).toBe("«Baron» silindi.");
    expect(translate("az", "Yeni#status")).toBe("Yeni");
    expect(translate("ru", "Yeni#status")).toBe("Новая");
  });

  it("picks plural forms for Russian and English", () => {
    expect([1, 2, 5, 21, 112].map((count) => translate("ru", "{count} məhsul", { count }))).toEqual(
      ["1 товар", "2 товара", "5 товаров", "21 товар", "112 товаров"],
    );
    expect(translate("en", "{count} məhsul", { count: 1 })).toBe("1 product");
    expect(translate("en", "{count} məhsul", { count: 3 })).toBe("3 products");
    expect(translate("de", "{count} məhsul", { count: 1 })).toBe("1 Produkt");
    expect(translate("de", "{count} məhsul", { count: 4 })).toBe("4 Produkte");
    expect(translate("de", "Yeni#status")).toBe("Neu");
    expect(translateMessage("de", "Ən çox 80 simvol ola bilər.")).toBe("Höchstens 80 Zeichen.");
    expect(translateMessage("ru", "3 məhsul")).toBe("3 товара");
    expect(translateMessage("ru", "Yeni məhsul")).toBe("Новый товар");
    expect(translateMessage("ru", "Köhnə məhsul")).toBe("Köhnə məhsul");
  });

  it("translates finished server messages through their templates", () => {
    expect(translateMessage("ru", "Ən çox 80 simvol ola bilər.")).toBe("Не более 80 символов.");
    expect(translateMessage("en", "«Baron (1.2)» silindi.")).toBe("«Baron (1.2)» was deleted.");
    expect(translateMessage("ru", "Naməlum mesaj")).toBe("Naməlum mesaj");
    expect(translateMessage("az", "Ən çox 80 simvol ola bilər.")).toBe(
      "Ən çox 80 simvol ola bilər.",
    );
  });
});
