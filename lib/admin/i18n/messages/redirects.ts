import type { Messages } from "../translate";

export const ru = {
  Yönləndirmələr: "Редиректы",
  "Yönləndirmə saxlanıldı.": "Редирект сохранён.",
  "Yönləndirmə əlavə olundu.": "Редирект добавлен.",
  "{count} köhnə yönləndirmə də yeni ünvana yönəldildi.":
    "{count} {count|старый редирект тоже перенаправлен|старых редиректа тоже перенаправлены|старых редиректов тоже перенаправлены} на новый адрес.",
  "Yönləndirməni redaktə et": "Редактировать редирект",
  "Yeni yönləndirmə": "Новый редирект",
  "Köhnə ünvana gələn ziyarətçi bir addımda yeni ünvana keçir. Dəyişiklik saytda dərhal görünür.":
    "Посетитель старого адреса за один шаг попадает на новый. Изменение сразу видно на сайте.",
  "Köhnə ünvan": "Старый адрес",
  "Tam linki də yapışdıra bilərsiniz: domen və sondakı «/» atılır.":
    "Можно вставить и полную ссылку: домен и «/» в конце будут отброшены.",
  "Yeni ünvan": "Новый адрес",
  "Saytdakı ünvan, məsələn /mehsullar/rehber-destleri.":
    "Адрес на сайте, например /mehsullar/rehber-destleri.",
  Növ: "Тип",
  "Köhnə saytın ünvanları üçün 301 seçin: axtarış sistemləri yeni ünvanı yadda saxlayır.":
    "Для адресов старого сайта выбирайте 301: поисковые системы запоминают новый адрес.",
  "301 · daimi (tövsiyə olunur)": "301 · постоянный (рекомендуется)",
  "302 · müvəqqəti": "302 · временный",
  "307 · müvəqqəti, metod saxlanılır": "307 · временный, метод сохраняется",
  "308 · daimi, metod saxlanılır": "308 · постоянный, метод сохраняется",
  "Ləğv et": "Отмена",
  Saxlanılır: "Сохранение…",
  Saxla: "Сохранить",
  "Əlavə et": "Добавить",
  "Bütün ünvanlar": "Все адреса",
  Səhifələr: "Страницы",
  "Şəkillər və fayllar": "Изображения и файлы",
  Kod: "Код",
  Yaradılıb: "Создано",
  "Yönləndirmə silindi.": "Редирект удалён.",
  "{name}: əməliyyatlar": "{name}: действия",
  "Redaktə et": "Редактировать",
  "Saytda yoxla": "Проверить на сайте",
  Sil: "Удалить",
  "Köhnə saytın ünvanları yeni səhifələrə bir addımda (301) yönləndirilir. Dəyişikliklər saytda dərhal görünür.":
    "Адреса старого сайта перенаправляются на новые страницы за один шаг (301). Изменения сразу видны на сайте.",
  "Yenidən yüklə": "Загрузить снова",
  "Yönləndirmələr yüklənmədi.": "Не удалось загрузить редиректы.",
  "Köhnə və ya yeni ünvan ilə axtar": "Поиск по старому или новому адресу",
  "Ünvan növü": "Тип адреса",
  "Seçimə uyğun yönləndirmə tapılmadı.": "Подходящих редиректов не найдено.",
  "Hələ yönləndirmə yoxdur.": "Редиректов пока нет.",
  "«{name}» yönləndirməsi silinsin?": "Удалить редирект «{name}»?",
  "Bu ünvana gələn ziyarətçilər və axtarış sistemləri «Səhifə tapılmadı» görəcək.":
    "Посетители и поисковые системы по этому адресу увидят «Страница не найдена».",
} satisfies Messages;

export const en: Record<keyof typeof ru, string> = {
  Yönləndirmələr: "Redirects",
  "Yönləndirmə saxlanıldı.": "Redirect saved.",
  "Yönləndirmə əlavə olundu.": "Redirect added.",
  "{count} köhnə yönləndirmə də yeni ünvana yönəldildi.":
    "{count} old {count|redirect was|redirects were} also pointed to the new URL.",
  "Yönləndirməni redaktə et": "Edit redirect",
  "Yeni yönləndirmə": "New redirect",
  "Köhnə ünvana gələn ziyarətçi bir addımda yeni ünvana keçir. Dəyişiklik saytda dərhal görünür.":
    "A visitor to the old URL reaches the new one in a single step. The change is live on the site immediately.",
  "Köhnə ünvan": "Old URL",
  "Tam linki də yapışdıra bilərsiniz: domen və sondakı «/» atılır.":
    "You can also paste a full link: the domain and the trailing “/” are removed.",
  "Yeni ünvan": "New URL",
  "Saytdakı ünvan, məsələn /mehsullar/rehber-destleri.":
    "A path on the site, for example /mehsullar/rehber-destleri.",
  Növ: "Type",
  "Köhnə saytın ünvanları üçün 301 seçin: axtarış sistemləri yeni ünvanı yadda saxlayır.":
    "Choose 301 for the old site’s URLs: search engines remember the new URL.",
  "301 · daimi (tövsiyə olunur)": "301 · permanent (recommended)",
  "302 · müvəqqəti": "302 · temporary",
  "307 · müvəqqəti, metod saxlanılır": "307 · temporary, method kept",
  "308 · daimi, metod saxlanılır": "308 · permanent, method kept",
  "Ləğv et": "Cancel",
  Saxlanılır: "Saving…",
  Saxla: "Save",
  "Əlavə et": "Add",
  "Bütün ünvanlar": "All URLs",
  Səhifələr: "Pages",
  "Şəkillər və fayllar": "Images and files",
  Kod: "Code",
  Yaradılıb: "Created",
  "Yönləndirmə silindi.": "Redirect deleted.",
  "{name}: əməliyyatlar": "{name}: actions",
  "Redaktə et": "Edit",
  "Saytda yoxla": "Check on site",
  Sil: "Delete",
  "Köhnə saytın ünvanları yeni səhifələrə bir addımda (301) yönləndirilir. Dəyişikliklər saytda dərhal görünür.":
    "The old site’s URLs redirect to the new pages in a single step (301). Changes are live on the site immediately.",
  "Yenidən yüklə": "Reload",
  "Yönləndirmələr yüklənmədi.": "Could not load the redirects.",
  "Köhnə və ya yeni ünvan ilə axtar": "Search by old or new URL",
  "Ünvan növü": "URL type",
  "Seçimə uyğun yönləndirmə tapılmadı.": "No redirects match the filter.",
  "Hələ yönləndirmə yoxdur.": "No redirects yet.",
  "«{name}» yönləndirməsi silinsin?": "Delete the redirect “{name}”?",
  "Bu ünvana gələn ziyarətçilər və axtarış sistemləri «Səhifə tapılmadı» görəcək.":
    "Visitors and search engines coming to this URL will see “Page not found”.",
};
