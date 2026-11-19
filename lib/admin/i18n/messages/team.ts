import type { Messages } from "../translate";

export const ru = {
  Komanda: "Команда",
  "Yeni işçi": "Новый сотрудник",
  "İşçini redaktə et": "Редактировать сотрудника",
  "İşçilər «Haqqımızda» səhifəsində bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "Сотрудники показываются на странице «О нас» в этом порядке. Меняйте порядок перетаскиванием или через меню карточки.",
  "İşçi «Haqqımızda» səhifəsinin «Komanda» bölməsində bu sırada göstərilir.":
    "Сотрудник показывается в разделе «Команда» на странице «О нас» в этом порядке.",
  "Komanda yüklənmədi.": "Не удалось загрузить команду.",
  "Komandaya hələ işçi əlavə olunmayıb.": "В команду ещё не добавлены сотрудники.",
  "İşçi saytdan götürüləcək. Foto media kitabxanasında qalır.":
    "Сотрудник будет удалён с сайта. Фото останется в медиатеке.",
  Foto: "Фото",
  "Kvadrat və ya portret foto, ən azı 800 px.": "Квадратное или портретное фото, не меньше 800 px.",
  "Sərbəst yazın, məsələn: Satış meneceri, Baş dizayner.":
    "Пишите свободно, например: Менеджер по продажам, Главный дизайнер.",
  "Haqqında ({locale})": "О сотруднике ({locale})",
  "Təcrübəsi, ixtisası, hansı layihələrdə işləyib. 600 simvola qədər.":
    "Опыт, специализация, проекты, в которых участвовал. До 600 символов.",
  "Mebline-ə gəldiyi il": "Год прихода в Mebline",
  "Saytda neçə ildir işlədiyi hesablanır.": "На сайте будет посчитан стаж в компании.",
  "Saytda: {count} il": "На сайте: {count} {count|год|года|лет}",
  "İl göstərilməyib": "Год не указан",
  "{year} · {count} il": "{year} · {count} {count|год|года|лет}",
  "İli rəqəmlə yazın.": "Введите год цифрами.",
  "İl 1990 ilə bu il arasında olmalıdır.": "Год должен быть между 1990 и текущим годом.",
  "Nömrəni düzgün yazın, məsələn +994 55 255 54 23.":
    "Введите номер правильно, например +994 55 255 54 23.",
  "Adı və soyadı yazın.": "Введите имя и фамилию.",
  "Vəzifəni yazın.": "Введите должность.",
  "Şəkil düzgün deyil.": "Изображение указано неверно.",
  "İşçi tapılmadı.": "Сотрудник не найден.",
  "Sıra təkrarlanan işçi ehtiva edir.": "В порядке есть повторяющийся сотрудник.",
} satisfies Messages;

export const en: Record<keyof typeof ru, string> = {
  Komanda: "Team",
  "Yeni işçi": "New team member",
  "İşçini redaktə et": "Edit team member",
  "İşçilər «Haqqımızda» səhifəsində bu sırada göstərilir. Sürüşdürərək və ya kart menyusundan sıranı dəyişin.":
    "Team members appear on the About page in this order. Drag them or use the card menu to change the order.",
  "İşçi «Haqqımızda» səhifəsinin «Komanda» bölməsində bu sırada göstərilir.":
    "The team member appears in the Team section of the About page in this order.",
  "Komanda yüklənmədi.": "The team could not be loaded.",
  "Komandaya hələ işçi əlavə olunmayıb.": "No team members have been added yet.",
  "İşçi saytdan götürüləcək. Foto media kitabxanasında qalır.":
    "The team member will be removed from the site. The photo stays in the media library.",
  Foto: "Photo",
  "Kvadrat və ya portret foto, ən azı 800 px.": "A square or portrait photo, at least 800 px.",
  "Sərbəst yazın, məsələn: Satış meneceri, Baş dizayner.":
    "Write it freely, for example: Sales manager, Lead designer.",
  "Haqqında ({locale})": "About ({locale})",
  "Təcrübəsi, ixtisası, hansı layihələrdə işləyib. 600 simvola qədər.":
    "Experience, specialisation, projects they worked on. Up to 600 characters.",
  "Mebline-ə gəldiyi il": "Year joined Mebline",
  "Saytda neçə ildir işlədiyi hesablanır.":
    "The site works out how many years they have been here.",
  "Saytda: {count} il": "On the site: {count} {count|year|years}",
  "İl göstərilməyib": "No year set",
  "{year} · {count} il": "{year} · {count} {count|year|years}",
  "İli rəqəmlə yazın.": "Enter the year in digits.",
  "İl 1990 ilə bu il arasında olmalıdır.": "The year must be between 1990 and this year.",
  "Nömrəni düzgün yazın, məsələn +994 55 255 54 23.":
    "Enter a valid number, for example +994 55 255 54 23.",
  "Adı və soyadı yazın.": "Enter the first and last name.",
  "Vəzifəni yazın.": "Enter the position.",
  "Şəkil düzgün deyil.": "The image is not valid.",
  "İşçi tapılmadı.": "Team member not found.",
  "Sıra təkrarlanan işçi ehtiva edir.": "The order contains a duplicate team member.",
};
