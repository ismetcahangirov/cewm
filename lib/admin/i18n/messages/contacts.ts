import type { Messages } from "../translate";

export const ru = {
  "Əlaqə şəxsləri": "Контактные лица",
  "Yeni əlaqə şəxsi": "Новое контактное лицо",
  "Əlaqə şəxsini redaktə et": "Редактировать контактное лицо",
  "Əlaqə şəxsləri «Əlaqə» səhifəsində və footerdə bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "Контактные лица показываются на странице «Контакты» и в подвале в этом порядке. Меняйте порядок перетаскиванием или через меню карточки.",
  "Əlaqə şəxsi «Əlaqə» səhifəsində və footerdə bu sırada göstərilir.":
    "Контактное лицо показывается на странице «Контакты» и в подвале в этом порядке.",
  "Əlaqə şəxsləri yüklənmədi.": "Не удалось загрузить контактных лиц.",
  "Hələ əlaqə şəxsi əlavə olunmayıb.": "Контактные лица ещё не добавлены.",
  "Əlaqə şəxsi saytdan götürüləcək. Foto media kitabxanasında qalır.":
    "Контактное лицо будет убрано с сайта. Фото останется в медиатеке.",
  "Əlaqə məlumatı yoxdur": "Нет контактных данных",
  Foto: "Фото",
  "Kvadrat və ya portret foto, ən azı 800 px.": "Квадратное или портретное фото, не меньше 800 px.",
  "Ad və soyad ({locale})": "Имя и фамилия ({locale})",
  "Hər dil üçün o dildəki yazılışı ilə.": "В написании, принятом в каждом языке.",
  "Vəzifə ({locale})": "Должность ({locale})",
  "Sərbəst yazın, məsələn: Direktor, Satış meneceri.":
    "Пишите свободно, например: Директор, Менеджер по продажам.",
  Telefonlar: "Телефоны",
  "Telefon {count}": "Телефон {count}",
  "Telefon {count}: sil": "Телефон {count}: удалить",
  "Telefon əlavə et": "Добавить телефон",
  WhatsApp: "WhatsApp",
  "Boş qalsa, saytda göstərilmir.": "Если оставить пустым, на сайте не показывается.",
  "Nömrəni düzgün yazın, məsələn +994 12 480 05 70.":
    "Введите номер правильно, например +994 12 480 05 70.",
  "Adı və soyadı yazın.": "Введите имя и фамилию.",
  "Vəzifəni yazın.": "Введите должность.",
  "Şəkil düzgün deyil.": "Изображение указано неверно.",
  "Əlaqə şəxsi tapılmadı.": "Контактное лицо не найдено.",
  "{count} əlaqə şəxsi": "{count} {count|контактное лицо|контактных лица|контактных лиц}",
} satisfies Messages;

export const en: Record<keyof typeof ru, string> = {
  "Əlaqə şəxsləri": "Contact persons",
  "Yeni əlaqə şəxsi": "New contact person",
  "Əlaqə şəxsini redaktə et": "Edit contact person",
  "Əlaqə şəxsləri «Əlaqə» səhifəsində və footerdə bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "Contact persons appear on the «Contact» page and in the footer in this order. Drag them or use the card menu to change the order.",
  "Əlaqə şəxsi «Əlaqə» səhifəsində və footerdə bu sırada göstərilir.":
    "The contact person appears on the «Contact» page and in the footer in this order.",
  "Əlaqə şəxsləri yüklənmədi.": "Contact persons could not be loaded.",
  "Hələ əlaqə şəxsi əlavə olunmayıb.": "No contact persons have been added yet.",
  "Əlaqə şəxsi saytdan götürüləcək. Foto media kitabxanasında qalır.":
    "The contact person will be removed from the site. The photo stays in the media library.",
  "Əlaqə məlumatı yoxdur": "No contact details",
  Foto: "Photo",
  "Kvadrat və ya portret foto, ən azı 800 px.": "A square or portrait photo, at least 800 px.",
  "Ad və soyad ({locale})": "Full name ({locale})",
  "Hər dil üçün o dildəki yazılışı ilə.": "As it is spelled in each language.",
  "Vəzifə ({locale})": "Position ({locale})",
  "Sərbəst yazın, məsələn: Direktor, Satış meneceri.":
    "Write freely, for example: Director, Sales manager.",
  Telefonlar: "Phones",
  "Telefon {count}": "Phone {count}",
  "Telefon {count}: sil": "Phone {count}: remove",
  "Telefon əlavə et": "Add phone",
  WhatsApp: "WhatsApp",
  "Boş qalsa, saytda göstərilmir.": "If left empty, it is not shown on the site.",
  "Nömrəni düzgün yazın, məsələn +994 12 480 05 70.":
    "Enter the number correctly, for example +994 12 480 05 70.",
  "Adı və soyadı yazın.": "Enter the full name.",
  "Vəzifəni yazın.": "Enter the position.",
  "Şəkil düzgün deyil.": "The image is not valid.",
  "Əlaqə şəxsi tapılmadı.": "Contact person not found.",
  "{count} əlaqə şəxsi": "{count} {count|contact person|contact persons}",
};

export const de: Record<keyof typeof ru, string> = {
  "Əlaqə şəxsləri": "Ansprechpartner",
  "Yeni əlaqə şəxsi": "Neuer Ansprechpartner",
  "Əlaqə şəxsini redaktə et": "Ansprechpartner bearbeiten",
  "Əlaqə şəxsləri «Əlaqə» səhifəsində və footerdə bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "Ansprechpartner erscheinen auf der Seite «Kontakt» und in der Fußzeile in dieser Reihenfolge. Ändern Sie die Reihenfolge per Ziehen oder über das Kartenmenü.",
  "Əlaqə şəxsi «Əlaqə» səhifəsində və footerdə bu sırada göstərilir.":
    "Der Ansprechpartner erscheint auf der Seite «Kontakt» und in der Fußzeile in dieser Reihenfolge.",
  "Əlaqə şəxsləri yüklənmədi.": "Die Ansprechpartner konnten nicht geladen werden.",
  "Hələ əlaqə şəxsi əlavə olunmayıb.": "Es wurden noch keine Ansprechpartner hinzugefügt.",
  "Əlaqə şəxsi saytdan götürüləcək. Foto media kitabxanasında qalır.":
    "Der Ansprechpartner wird von der Website entfernt. Das Foto bleibt in der Mediathek.",
  "Əlaqə məlumatı yoxdur": "Keine Kontaktdaten",
  Foto: "Foto",
  "Kvadrat və ya portret foto, ən azı 800 px.":
    "Ein quadratisches Foto oder Hochformat, mindestens 800 px.",
  "Ad və soyad ({locale})": "Vor- und Nachname ({locale})",
  "Hər dil üçün o dildəki yazılışı ilə.": "In der Schreibweise der jeweiligen Sprache.",
  "Vəzifə ({locale})": "Position ({locale})",
  "Sərbəst yazın, məsələn: Direktor, Satış meneceri.":
    "Freie Eingabe, zum Beispiel: Geschäftsführer, Vertriebsleiter.",
  Telefonlar: "Telefonnummern",
  "Telefon {count}": "Telefon {count}",
  "Telefon {count}: sil": "Telefon {count}: entfernen",
  "Telefon əlavə et": "Telefonnummer hinzufügen",
  WhatsApp: "WhatsApp",
  "Boş qalsa, saytda göstərilmir.":
    "Bleibt das Feld leer, wird es auf der Website nicht angezeigt.",
  "Nömrəni düzgün yazın, məsələn +994 12 480 05 70.":
    "Geben Sie die Nummer korrekt ein, zum Beispiel +994 12 480 05 70.",
  "Adı və soyadı yazın.": "Geben Sie Vor- und Nachnamen ein.",
  "Vəzifəni yazın.": "Geben Sie die Position ein.",
  "Şəkil düzgün deyil.": "Das Bild ist ungültig.",
  "Əlaqə şəxsi tapılmadı.": "Ansprechpartner nicht gefunden.",
  "{count} əlaqə şəxsi": "{count} Ansprechpartner",
};
