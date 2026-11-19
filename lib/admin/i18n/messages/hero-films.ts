import type { Messages } from "../translate";

export const ru = {
  "Hero filmləri": "Hero-фильмы",
  "Hero filmi": "Hero-фильм",
  "Yeni hero filmi": "Новый hero-фильм",
  "Yeni film": "Новый фильм",
  "Filmi redaktə et": "Редактировать фильм",
  "Ad#film": "Название",
  "Kadrlar bir dəfə yaddaşa yüklənir və bütün dillərdə eyni film göstərilir. Kadr adları: {example}":
    "Кадры загружаются в хранилище один раз, и на всех языках показывается один и тот же фильм. Имена кадров: {example}",
  "Kadrların qovluğu": "Папка кадров",
  "Yaddaşdakı qovluq, məsələn films/house. Sonunda «/» olmur.":
    "Папка в хранилище, например films/house. Без «/» в конце.",
  "Kadr sayı": "Количество кадров",
  "En, px": "Ширина, px",
  "Hündürlük, px": "Высота, px",
  Format: "Формат",
  Poster: "Постер",
  "Film yüklənənə qədər və hərəkət azaldılanda göstərilən şəkil.":
    "Изображение, которое показывается до загрузки фильма и при уменьшенной анимации.",
  "Ana səhifənin hero bölməsində scroll ilə oynadılan kadr ardıcıllıqları. Filmi «Ana səhifə bölmələri»ndə seçin.":
    "Последовательности кадров, которые прокручиваются скроллом в hero-блоке главной страницы. Фильм выбирается в «Разделах главной страницы».",
  "Filmlər yüklənmədi.": "Не удалось загрузить фильмы.",
  "Hələ hero filmi əlavə olunmayıb.": "Hero-фильмы ещё не добавлены.",
  "Film qeydi silinəcək, hero bölməsi filmsiz qalacaq. Yaddaşdakı kadr faylları silinmir.":
    "Запись фильма будет удалена, hero-блок останется без фильма. Файлы кадров в хранилище не удаляются.",
  "{count} kadr · {width}×{height} · {format}":
    "{count} {count|кадр|кадра|кадров} · {width}×{height} · {format}",
  "Hero-da": "В hero",
  "Film tapılmadı.": "Фильм не найден.",
  "Bu qovluq artıq başqa filmdə istifadə olunur.": "Эта папка уже используется другим фильмом.",
  "Bu qovluq artıq istifadə olunur.": "Эта папка уже используется.",
  "Filmin adını yazın.": "Введите название фильма.",
  "Qovluğu yazın.": "Укажите папку.",
  "Yalnız kiçik latın hərfləri, rəqəmlər, tire və «/».":
    "Только строчные латинские буквы, цифры, дефис и «/».",
  "Kadr sayını yazın.": "Укажите количество кадров.",
  "Ən azı 2 kadr olmalıdır.": "Нужно не меньше 2 кадров.",
  "Ən çox 2000 kadr ola bilər.": "Не больше 2000 кадров.",
  "Kadrın enini yazın.": "Укажите ширину кадра.",
  "Kadrın hündürlüyünü yazın.": "Укажите высоту кадра.",
  "Ən azı 160 px olmalıdır.": "Не меньше 160 px.",
  "Ən çox 7680 px ola bilər.": "Не больше 7680 px.",
  "Formatı seçin.": "Выберите формат.",
  "Film düzgün deyil.": "Фильм указан неверно.",
  "{count} hero filmi": "{count} hero-{count|фильм|фильма|фильмов}",
} satisfies Messages;

export const en: Record<keyof typeof ru, string> = {
  "Hero filmləri": "Hero films",
  "Hero filmi": "Hero film",
  "Yeni hero filmi": "New hero film",
  "Yeni film": "New film",
  "Filmi redaktə et": "Edit film",
  "Ad#film": "Name",
  "Kadrlar bir dəfə yaddaşa yüklənir və bütün dillərdə eyni film göstərilir. Kadr adları: {example}":
    "Frames are uploaded to storage once and the same film is shown in every language. Frame names: {example}",
  "Kadrların qovluğu": "Frame folder",
  "Yaddaşdakı qovluq, məsələn films/house. Sonunda «/» olmur.":
    "The folder in storage, for example films/house. No trailing «/».",
  "Kadr sayı": "Frame count",
  "En, px": "Width, px",
  "Hündürlük, px": "Height, px",
  Format: "Format",
  Poster: "Poster",
  "Film yüklənənə qədər və hərəkət azaldılanda göstərilən şəkil.":
    "The image shown until the film loads and when reduced motion is on.",
  "Ana səhifənin hero bölməsində scroll ilə oynadılan kadr ardıcıllıqları. Filmi «Ana səhifə bölmələri»ndə seçin.":
    "Frame sequences played by scrolling in the home page hero. Choose the film in «Home page sections».",
  "Filmlər yüklənmədi.": "Films could not be loaded.",
  "Hələ hero filmi əlavə olunmayıb.": "No hero films have been added yet.",
  "Film qeydi silinəcək, hero bölməsi filmsiz qalacaq. Yaddaşdakı kadr faylları silinmir.":
    "The film record will be deleted and the hero will have no film. Frame files in storage are not deleted.",
  "{count} kadr · {width}×{height} · {format}":
    "{count} {count|frame|frames} · {width}×{height} · {format}",
  "Hero-da": "In hero",
  "Film tapılmadı.": "Film not found.",
  "Bu qovluq artıq başqa filmdə istifadə olunur.": "This folder is already used by another film.",
  "Bu qovluq artıq istifadə olunur.": "This folder is already in use.",
  "Filmin adını yazın.": "Enter the film name.",
  "Qovluğu yazın.": "Enter the folder.",
  "Yalnız kiçik latın hərfləri, rəqəmlər, tire və «/».":
    "Only lowercase Latin letters, digits, hyphens and «/».",
  "Kadr sayını yazın.": "Enter the frame count.",
  "Ən azı 2 kadr olmalıdır.": "At least 2 frames are required.",
  "Ən çox 2000 kadr ola bilər.": "At most 2000 frames.",
  "Kadrın enini yazın.": "Enter the frame width.",
  "Kadrın hündürlüyünü yazın.": "Enter the frame height.",
  "Ən azı 160 px olmalıdır.": "At least 160 px.",
  "Ən çox 7680 px ola bilər.": "At most 7680 px.",
  "Formatı seçin.": "Choose a format.",
  "Film düzgün deyil.": "The film is not valid.",
  "{count} hero filmi": "{count} hero {count|film|films}",
};

export const de: Record<keyof typeof ru, string> = {
  "Hero filmləri": "Hero-Filme",
  "Hero filmi": "Hero-Film",
  "Yeni hero filmi": "Neuer Hero-Film",
  "Yeni film": "Neuer Film",
  "Filmi redaktə et": "Film bearbeiten",
  "Ad#film": "Name",
  "Kadrlar bir dəfə yaddaşa yüklənir və bütün dillərdə eyni film göstərilir. Kadr adları: {example}":
    "Die Einzelbilder werden einmal in den Speicher hochgeladen, in allen Sprachen läuft derselbe Film. Dateinamen der Einzelbilder: {example}",
  "Kadrların qovluğu": "Ordner der Einzelbilder",
  "Yaddaşdakı qovluq, məsələn films/house. Sonunda «/» olmur.":
    "Der Ordner im Speicher, zum Beispiel films/house. Ohne «/» am Ende.",
  "Kadr sayı": "Anzahl der Einzelbilder",
  "En, px": "Breite, px",
  "Hündürlük, px": "Höhe, px",
  Format: "Format",
  Poster: "Vorschaubild",
  "Film yüklənənə qədər və hərəkət azaldılanda göstərilən şəkil.":
    "Das Bild, das bis zum Laden des Films und bei reduzierter Bewegung angezeigt wird.",
  "Ana səhifənin hero bölməsində scroll ilə oynadılan kadr ardıcıllıqları. Filmi «Ana səhifə bölmələri»ndə seçin.":
    "Bildfolgen, die im Hero-Bereich der Startseite beim Scrollen abgespielt werden. Den Film wählen Sie unter «Startseitenbereiche».",
  "Filmlər yüklənmədi.": "Die Filme konnten nicht geladen werden.",
  "Hələ hero filmi əlavə olunmayıb.": "Es wurden noch keine Hero-Filme hinzugefügt.",
  "Film qeydi silinəcək, hero bölməsi filmsiz qalacaq. Yaddaşdakı kadr faylları silinmir.":
    "Der Filmeintrag wird gelöscht, der Hero-Bereich bleibt ohne Film. Die Bilddateien im Speicher werden nicht gelöscht.",
  "{count} kadr · {width}×{height} · {format}":
    "{count} {count|Einzelbild|Einzelbilder} · {width}×{height} · {format}",
  "Hero-da": "Im Hero",
  "Film tapılmadı.": "Film nicht gefunden.",
  "Bu qovluq artıq başqa filmdə istifadə olunur.":
    "Dieser Ordner wird bereits von einem anderen Film verwendet.",
  "Bu qovluq artıq istifadə olunur.": "Dieser Ordner wird bereits verwendet.",
  "Filmin adını yazın.": "Geben Sie den Namen des Films ein.",
  "Qovluğu yazın.": "Geben Sie den Ordner an.",
  "Yalnız kiçik latın hərfləri, rəqəmlər, tire və «/».":
    "Nur lateinische Kleinbuchstaben, Ziffern, Bindestriche und «/».",
  "Kadr sayını yazın.": "Geben Sie die Anzahl der Einzelbilder an.",
  "Ən azı 2 kadr olmalıdır.": "Es sind mindestens 2 Einzelbilder nötig.",
  "Ən çox 2000 kadr ola bilər.": "Höchstens 2000 Einzelbilder.",
  "Kadrın enini yazın.": "Geben Sie die Bildbreite an.",
  "Kadrın hündürlüyünü yazın.": "Geben Sie die Bildhöhe an.",
  "Ən azı 160 px olmalıdır.": "Mindestens 160 px.",
  "Ən çox 7680 px ola bilər.": "Höchstens 7680 px.",
  "Formatı seçin.": "Wählen Sie ein Format.",
  "Film düzgün deyil.": "Der Film ist ungültig.",
  "{count} hero filmi": "{count} {count|Hero-Film|Hero-Filme}",
};
