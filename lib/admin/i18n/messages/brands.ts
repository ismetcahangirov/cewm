import type { Messages } from "../translate";

export const ru = {
  Brendlər: "Бренды",
  Brend: "Бренд",
  Brendsiz: "Без бренда",
  "Ad#brand": "Название",
  "Yeni brend": "Новый бренд",
  "Brendi redaktə et": "Редактировать бренд",
  "Brendlər məhsul formasında seçilir və saytda partnyor kimi göstərilir.":
    "Бренды выбираются в форме товара и показываются на сайте как партнёры.",
  "Ünvan (slug)": "Адрес (slug)",
  "Təsvir ({locale})": "Описание ({locale})",
  "Brend haqqında qısa mətn, 2000 simvola qədər.": "Короткий текст о бренде, до 2000 символов.",
  Sayt: "Сайт",
  "Brendin rəsmi saytı. Boş qalsa, keçid göstərilmir.":
    "Официальный сайт бренда. Если оставить пустым, ссылка не показывается.",
  "Təmsil etdiyimiz brendlər saytda bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "Бренды, которые мы представляем, показываются на сайте в этом порядке. Меняйте порядок перетаскиванием или через меню карточки.",
  "Brendlər yüklənmədi.": "Не удалось загрузить бренды.",
  "Hələ brend əlavə olunmayıb.": "Бренды ещё не добавлены.",
  "Brend silinəcək, onun məhsulları brendsiz qalacaq. Loqo media kitabxanasında qalır.":
    "Бренд будет удалён, его товары останутся без бренда. Логотип останется в медиатеке.",
  "Brend tapılmadı.": "Бренд не найден.",
  "Bu ünvan (slug) artıq başqa brenddə istifadə olunur.":
    "Этот адрес (slug) уже используется другим брендом.",
  "Brendin adını yazın.": "Введите название бренда.",
  "Loqo düzgün deyil.": "Логотип указан неверно.",
  "Aktiv brendlər, brendlər səhifəsindəki sıra ilə.": "Активные бренды в порядке страницы брендов.",
  "{count} brend": "{count} {count|бренд|бренда|брендов}",
} satisfies Messages;

export const en: Record<keyof typeof ru, string> = {
  Brendlər: "Brands",
  Brend: "Brand",
  Brendsiz: "No brand",
  "Ad#brand": "Name",
  "Yeni brend": "New brand",
  "Brendi redaktə et": "Edit brand",
  "Brendlər məhsul formasında seçilir və saytda partnyor kimi göstərilir.":
    "Brands are chosen in the product form and shown on the site as partners.",
  "Ünvan (slug)": "Address (slug)",
  "Təsvir ({locale})": "Description ({locale})",
  "Brend haqqında qısa mətn, 2000 simvola qədər.":
    "A short text about the brand, up to 2000 characters.",
  Sayt: "Website",
  "Brendin rəsmi saytı. Boş qalsa, keçid göstərilmir.":
    "The brand's official website. If left empty, no link is shown.",
  "Təmsil etdiyimiz brendlər saytda bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "The brands we represent appear on the site in this order. Drag them or use the card menu to change the order.",
  "Brendlər yüklənmədi.": "Brands could not be loaded.",
  "Hələ brend əlavə olunmayıb.": "No brands have been added yet.",
  "Brend silinəcək, onun məhsulları brendsiz qalacaq. Loqo media kitabxanasında qalır.":
    "The brand will be deleted and its products will have no brand. The logo stays in the media library.",
  "Brend tapılmadı.": "Brand not found.",
  "Bu ünvan (slug) artıq başqa brenddə istifadə olunur.":
    "This address (slug) is already used by another brand.",
  "Brendin adını yazın.": "Enter the brand name.",
  "Loqo düzgün deyil.": "The logo is not valid.",
  "Aktiv brendlər, brendlər səhifəsindəki sıra ilə.":
    "Active brands, in the order of the brands page.",
  "{count} brend": "{count} {count|brand|brands}",
};

export const de: Record<keyof typeof ru, string> = {
  Brendlər: "Marken",
  Brend: "Marke",
  Brendsiz: "Ohne Marke",
  "Ad#brand": "Name",
  "Yeni brend": "Neue Marke",
  "Brendi redaktə et": "Marke bearbeiten",
  "Brendlər məhsul formasında seçilir və saytda partnyor kimi göstərilir.":
    "Marken werden im Produktformular ausgewählt und auf der Website als Partner angezeigt.",
  "Ünvan (slug)": "Adresse (Slug)",
  "Təsvir ({locale})": "Beschreibung ({locale})",
  "Brend haqqında qısa mətn, 2000 simvola qədər.":
    "Ein kurzer Text über die Marke, bis zu 2000 Zeichen.",
  Sayt: "Website",
  "Brendin rəsmi saytı. Boş qalsa, keçid göstərilmir.":
    "Die offizielle Website der Marke. Bleibt das Feld leer, wird kein Link angezeigt.",
  "Təmsil etdiyimiz brendlər saytda bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "Die Marken, die wir vertreten, erscheinen auf der Website in dieser Reihenfolge. Ändern Sie die Reihenfolge per Ziehen oder über das Kartenmenü.",
  "Brendlər yüklənmədi.": "Die Marken konnten nicht geladen werden.",
  "Hələ brend əlavə olunmayıb.": "Es wurden noch keine Marken hinzugefügt.",
  "Brend silinəcək, onun məhsulları brendsiz qalacaq. Loqo media kitabxanasında qalır.":
    "Die Marke wird gelöscht, ihre Produkte bleiben ohne Marke. Das Logo bleibt in der Mediathek.",
  "Brend tapılmadı.": "Marke nicht gefunden.",
  "Bu ünvan (slug) artıq başqa brenddə istifadə olunur.":
    "Diese Adresse (Slug) wird bereits von einer anderen Marke verwendet.",
  "Brendin adını yazın.": "Geben Sie den Namen der Marke ein.",
  "Loqo düzgün deyil.": "Das Logo ist ungültig.",
  "Aktiv brendlər, brendlər səhifəsindəki sıra ilə.":
    "Aktive Marken in der Reihenfolge der Markenseite.",
  "{count} brend": "{count} {count|Marke|Marken}",
};
