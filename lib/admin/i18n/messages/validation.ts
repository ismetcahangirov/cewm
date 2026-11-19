import type { Messages } from "../translate";

export const ru = {
  "Bu sahəni doldurun.": "Заполните это поле.",
  "Seçim düzgün deyil.": "Неверный выбор.",
  "Ən çox {max} simvol ola bilər.": "Не более {max} {max|символа|символов|символов}.",
  "Yalnız kiçik latın hərfləri, rəqəmlər və tire.":
    "Только строчные латинские буквы, цифры и дефис.",
  "Status seçin.": "Выберите статус.",
  "Dəyər seçin.": "Выберите значение.",
  "Sıra boşdur.": "Порядок не задан.",
  "Dəyişiklik yoxdur.": "Нет изменений.",

  "E-poçt ünvanı düzgün deyil.": "Неверный адрес эл. почты.",
  "Şifrəni daxil edin.": "Введите пароль.",
  "Şifrə ən azı {min} simvol olmalıdır.":
    "Пароль должен быть не короче {min} {min|символа|символов|символов}.",
  "Şifrə çox uzundur.": "Пароль слишком длинный.",
  "Şifrə çox qısadır.": "Пароль слишком короткий.",
  "Şifrələr eyni deyil.": "Пароли не совпадают.",
  "E-poçt və ya şifrə yanlışdır.": "Неверная эл. почта или пароль.",
  "Hesabınız deaktiv edilib.": "Ваша учётная запись отключена.",
  "Link etibarsızdır və ya vaxtı keçib. Yeni link istəyin.":
    "Ссылка недействительна или устарела. Запросите новую ссылку.",
  "Çox cəhd edildi. Bir dəqiqə sonra yenidən yoxlayın.":
    "Слишком много попыток. Попробуйте снова через минуту.",

  "Daxil olmaq lazımdır.": "Нужно войти.",
  "Bu əməliyyat üçün icazəniz yoxdur.": "У вас нет прав на это действие.",
  "Sorğunun gövdəsi JSON deyil.": "Тело запроса не является JSON.",
  "Xəta baş verdi. Yenidən cəhd edin.": "Произошла ошибка. Попробуйте ещё раз.",
  "Məlumatlar düzgün deyil.": "Неверные данные.",
  "Siyahı köhnədir. Səhifəni yeniləyib yenidən cəhd edin.":
    "Список устарел. Обновите страницу и попробуйте снова.",
  "Bu ünvan artıq istifadə olunur.": "Этот адрес уже используется.",

  "Kateqoriyanın adını yazın.": "Введите название категории.",
  "Kateqoriyanı seçin.": "Выберите категорию.",
  "Kateqoriya tapılmadı.": "Категория не найдена.",
  "Kateqoriya təkrarlanır.": "Категория повторяется.",
  "Bu ünvan (slug) artıq başqa kateqoriyada istifadə olunur.":
    "Этот адрес (slug) уже используется в другой категории.",
  "Kateqoriya öz-özünün alt kateqoriyası ola bilməz.":
    "Категория не может быть подкатегорией самой себя.",
  "Kateqoriya öz-özünün altına keçə bilməz.": "Категорию нельзя перенести под саму себя.",
  "Üst kateqoriya tapılmadı.": "Родительская категория не найдена.",
  "Yalnız iki səviyyə olar: alt kateqoriyanın altına kateqoriya qoymaq olmaz.":
    "Допускается только два уровня: нельзя вложить категорию в подкатегорию.",
  "Alt kateqoriyaları olan kateqoriya başqasının altına keçə bilməz.":
    "Категорию с подкатегориями нельзя перенести под другую.",
  "Sıra təkrarlanan kateqoriya ehtiva edir.": "В порядке повторяется категория.",
  "Kateqoriyalardan biri tapılmadı.": "Одна из категорий не найдена.",
  "Məhsulları başqa kateqoriyaya köçürün.": "Перенесите товары в другую категорию.",
  "Hədəf kateqoriya tapılmadı.": "Целевая категория не найдена.",

  "Məhsulun adını yazın.": "Введите название товара.",
  "Məhsul seçin.": "Выберите товар.",
  "Məhsul düzgün deyil.": "Неверный товар.",
  "Məhsul təkrarlanır.": "Товар повторяется.",
  "Məhsul tapılmadı.": "Товар не найден.",
  "Məhsul özü ilə əlaqələndirilə bilməz.": "Товар нельзя связать с самим собой.",
  "Bu ünvan (slug) artıq başqa məhsulda istifadə olunur.":
    "Этот адрес (slug) уже используется в другом товаре.",
  "Ən çox {max} məhsul ola bilər.": "Не более {max} {max|товара|товаров|товаров}.",
  "Ən çox {max} məhsul seçmək olar.": "Можно выбрать не более {max} {max|товара|товаров|товаров}.",
  "Ən çox {max} əlaqəli məhsul seçmək olar.":
    "Можно выбрать не более {max} {max|связанного товара|связанных товаров|связанных товаров}.",
  "Ən çox {max} kateqoriya seçmək olar.":
    "Можно выбрать не более {max} {max|категории|категорий|категорий}.",
  "Ən çox {max} göstərici ola bilər.":
    "Не более {max} {max|характеристики|характеристик|характеристик}.",
  "Ən çox {max} şəkil ola bilər.": "Не более {max} {max|изображения|изображений|изображений}.",
  "Bir dəfəyə ən çox {max} məhsul.": "Не более {max} {max|товара|товаров|товаров} за раз.",
  "{count} məhsul dərc olunmadı: şəkli yoxdur və ya silinib.":
    "{count} {count|товар не опубликован|товара не опубликованы|товаров не опубликованы}: нет изображения или оно удалено.",
  "Göstəricinin adını yazın.": "Введите название характеристики.",
  "Dəyəri yazın.": "Введите значение.",
  "Şəkil seçin.": "Выберите изображение.",
  "Şəkil üçün alt mətn yazın.": "Введите alt-текст для изображения.",
  "Eyni şəkil iki dəfə əlavə olunub.": "Одно и то же изображение добавлено дважды.",
  "3D model üçün poster şəkli seçin.": "Выберите постер для 3D-модели.",
  "3D model GLB faylı olmalıdır.": "3D-модель должна быть файлом GLB.",
  "Poster şəkil olmalıdır.": "Постер должен быть изображением.",
  "Dərc etmək üçün ən azı bir şəkil əlavə edin.":
    "Чтобы опубликовать, добавьте хотя бы одно изображение.",
  "Əməliyyat seçin.": "Выберите действие.",
  "Məhsullardan biri tapılmadı və ya zibil qutusundadır.":
    "Один из товаров не найден или находится в корзине.",

  "Layihənin adını yazın.": "Введите название проекта.",
  "Layihənin növünü seçin.": "Выберите тип проекта.",
  "Layihəni seçin.": "Выберите проект.",
  "Layihə tapılmadı.": "Проект не найден.",
  "Layihələrdən biri tapılmadı.": "Один из проектов не найден.",
  "Sıra təkrarlanan layihə ehtiva edir.": "В порядке повторяется проект.",
  "Bu ünvan (slug) artıq başqa layihədə istifadə olunur.":
    "Этот адрес (slug) уже используется в другом проекте.",

  "Səhifənin adını yazın.": "Введите название страницы.",
  "Səhifəni seçin.": "Выберите страницу.",
  "Səhifə tapılmadı.": "Страница не найдена.",
  "Bu ünvan saytın bölməsinə aiddir. Başqa ünvan seçin.":
    "Этот адрес занят разделом сайта. Выберите другой адрес.",
  "Bu ünvan (slug) artıq başqa səhifədə istifadə olunur.":
    "Этот адрес (slug) уже используется на другой странице.",
  "Sistem səhifəsini silmək olmaz: sayt bu səhifəyə bağlıdır. Onu qaralamaya çevirə bilərsiniz.":
    "Системную страницу нельзя удалить: сайт зависит от неё. Её можно перевести в черновик.",

  "Yazının başlığını yazın.": "Введите заголовок записи.",
  "Tarix və saatı düzgün yazın.": "Введите корректные дату и время.",
  "Yazı tapılmadı.": "Запись не найдена.",
  "Bu ünvan (slug) artıq başqa yazıda istifadə olunur.":
    "Этот адрес (slug) уже используется в другой записи.",

  "Fayl adı yoxdur.": "Нет имени файла.",
  "Fayl adı çox uzundur.": "Имя файла слишком длинное.",
  "Bu fayl növü dəstəklənmir.": "Этот тип файла не поддерживается.",
  "Fayl boşdur.": "Файл пустой.",
  "Fayl {size}-dan böyük ola bilməz.": "Файл не может быть больше {size}.",
  "Fayl açarı düzgün deyil.": "Неверный ключ файла.",
  "Fayl yüklənməyib. Yenidən cəhd edin.": "Файл не загружен. Попробуйте снова.",
  "Fayl icazə verilən ölçüdən böyükdür.": "Файл больше допустимого размера.",
  "Faylın məzmunu növünə uyğun deyil.": "Содержимое файла не соответствует его типу.",
  "Fayl tapılmadı.": "Файл не найден.",
  "Fayl istifadə olunur. Əvvəlcə onu istifadə edən yerlərdən çıxarın.":
    "Файл используется. Сначала уберите его оттуда, где он используется.",
  "Həmişəlik silmək yalnız sahibə icazəlidir.": "Удалять навсегда может только владелец.",
  "PDF faylı seçin.": "Выберите PDF-файл.",
  "Şəkil tapılmadı.": "Изображение не найдено.",
  "JPG, PNG və ya WebP şəkil seçin.": "Выберите изображение JPG, PNG или WebP.",
  "Şəkil (PNG, WebP, SVG) seçin.": "Выберите изображение (PNG, WebP, SVG).",
  "Favikon kvadrat olmalıdır, məsələn 512 × 512.":
    "Фавикон должен быть квадратным, например 512 × 512.",
  "Şəklin ölçüləri bilinmir. Şəkli yenidən yükləyin.":
    "Размеры изображения неизвестны. Загрузите изображение заново.",

  "Qrupu seçin.": "Выберите группу.",
  "Adı yazın.": "Введите название.",
  "Loqo şəklini seçin.": "Выберите изображение логотипа.",
  "Loqo tapılmadı.": "Логотип не найден.",
  "Sıra təkrarlanan loqo ehtiva edir.": "В порядке повторяется логотип.",
  "Tam ünvan yazın: http:// və ya https:// ilə başlamalıdır.":
    "Введите полный адрес: он должен начинаться с http:// или https://.",

  "Elementin adını yazın.": "Введите название пункта.",
  "Keçid növünü seçin.": "Выберите тип ссылки.",
  "Ünvanı yazın.": "Введите адрес.",
  "https:// ilə tam ünvan, /yol, tel: və ya mailto: yazın.":
    "Введите полный адрес с https://, /путь, tel: или mailto:.",
  "Başlığı yazın.": "Введите заголовок.",
  "Sütunun başlığını yazın.": "Введите заголовок колонки.",
  "Ən çox {max} element ola bilər.": "Не более {max} {max|пункта|пунктов|пунктов}.",
  "Menyu tapılmadı.": "Меню не найдено.",
  "Menyu başqa yerdə dəyişdirilib. Səhifəni yeniləyib yenidən cəhd edin.":
    "Меню изменили в другом месте. Обновите страницу и попробуйте снова.",
  "Bəzi elementlərin hədəfi tapılmadı.": "Для некоторых пунктов не найдена цель.",
  "Altbilgi sütununda alt element ola bilməz.": "В колонке футера не может быть вложенных пунктов.",
  "Menyu ən çox {max} səviyyəli ola bilər.":
    "Меню может иметь не более {max} {max|уровня|уровней|уровней}.",
  "Menyuda təkrarlanan element var.": "В меню есть повторяющийся пункт.",
  "Əsas menyu silinə bilməz.": "Главное меню нельзя удалить.",
  "Yalnız altbilgi sütunları silinə bilər.": "Удалять можно только колонки футера.",
  "Sıra təkrarlanan sütun ehtiva edir.": "В порядке повторяется колонка.",

  "Bölmə düzgün deyil.": "Неверный раздел.",
  "Bütün bölmələr göndərilməlidir.": "Нужно отправить все разделы.",
  "Bölmə təkrarlanır.": "Раздел повторяется.",
  "Ən çox {max} slayd ola bilər.": "Не более {max} {max|слайда|слайдов|слайдов}.",
  "Slaydın başlığını yazın.": "Введите заголовок слайда.",
  "Slayd şəkli üfüqi olmalıdır: eni hündürlüyündən böyük. Bu şəkil {width} × {height} px-dir.":
    "Изображение слайда должно быть горизонтальным: ширина больше высоты. Это изображение {width} × {height} px.",
  "Slayd şəklinin eni ən azı {min} px olmalıdır. Bu şəklin eni {width} px-dir.":
    "Ширина изображения слайда должна быть не меньше {min} px. Ширина этого изображения {width} px.",
  "Mobil şəkil şaquli olmalıdır: hündürlüyü enindən böyük. Bu şəkil {width} × {height} px-dir.":
    "Мобильное изображение должно быть вертикальным: высота больше ширины. Это изображение {width} × {height} px.",
  "Mobil şəklin eni ən azı {min} px olmalıdır. Bu şəklin eni {width} px-dir.":
    "Ширина мобильного изображения должна быть не меньше {min} px. Ширина этого изображения {width} px.",
  "Saytdakı ünvanı «/» ilə (məsələn /mehsullar) və ya tam linki https:// ilə yazın.":
    "Введите адрес на сайте с «/» (например /mehsullar) или полную ссылку с https://.",

  "Şirkətin adı «MMC» olmadan yazılır, məsələn «Mebline».":
    "Название компании пишется без «MMC», например «Mebline».",
  "Link çox uzundur.": "Ссылка слишком длинная.",
  "Nömrə düzgün deyil.": "Неверный номер.",
  "Nömrəni ölkə kodu ilə yalnız rəqəmlərlə yazın, məsələn 994552555423.":
    "Введите номер с кодом страны, только цифрами, например 994552555423.",
  "Nömrənin adını yazın, məsələn «Ofis».": "Введите название номера, например «Офис».",
  "Şəbəkəni seçin.": "Выберите соцсеть.",
  "Linki https:// ilə tam yazın.": "Введите полную ссылку с https://.",
  "Xəritə linkini https:// ilə tam yazın.": "Введите полную ссылку на карту с https://.",
  "Ən azı bir telefon nömrəsi əlavə edin.": "Добавьте хотя бы один номер телефона.",
  "Ən çox {max} nömrə ola bilər.": "Не более {max} {max|номера|номеров|номеров}.",
  "Bu nömrə artıq əlavə olunub.": "Этот номер уже добавлен.",
  "Ən çox {max} ünvan ola bilər.": "Не более {max} {max|адреса|адресов|адресов}.",
  "Bu ünvan artıq əlavə olunub.": "Этот адрес уже добавлен.",
  "Ən çox {max} şəbəkə ola bilər.": "Не более {max} {max|соцсети|соцсетей|соцсетей}.",
  "Bu şəbəkə artıq əlavə olunub.": "Эта соцсеть уже добавлена.",

  "Köhnə ünvanı yazın.": "Введите старый адрес.",
  "Yeni ünvanı yazın.": "Введите новый адрес.",
  "Ünvan «/» ilə başlamalıdır.": "Адрес должен начинаться с «/».",
  "Ünvan düzgün deyil.": "Неверный адрес.",
  "Ünvanda boşluq olmamalıdır.": "В адресе не должно быть пробелов.",
  "Ana səhifəni yönləndirmək olmaz.": "Главную страницу нельзя перенаправить.",
  "Bu ünvan yönləndirilə bilməz.": "Этот адрес нельзя перенаправить.",
  "Saytdakı ünvanı «/» ilə başlayaraq yazın, məsələn /mehsullar.":
    "Введите адрес на сайте, начиная с «/», например /mehsullar.",
  "Kodu seçin.": "Выберите код.",
  "Köhnə və yeni ünvan eyni ola bilməz.": "Старый и новый адреса не могут совпадать.",
  "Yönləndirmə tapılmadı.": "Редирект не найден.",
  "Bu köhnə ünvan üçün yönləndirmə artıq var.": "Для этого старого адреса редирект уже есть.",
  "Bu ünvan özü də {target} ünvanına yönləndirilir. Son ünvanı yazın.":
    "Этот адрес сам перенаправляется на {target}. Укажите конечный адрес.",

  "Telefon nömrəsini yazın.": "Введите номер телефона.",
  "Telefon nömrəsi düzgün deyil.": "Неверный номер телефона.",
  "Nömrəni +994 XX XXX XX XX və ya 0XX XXX XX XX şəklində yazın.":
    "Введите номер в формате +994 XX XXX XX XX или 0XX XXX XX XX.",
  "Adınızı yazın.": "Введите ваше имя.",
  "Ad ən azı {min} simvol olmalıdır.":
    "Имя должно быть не короче {min} {min|символа|символов|символов}.",
  "Ad ən çox {max} simvol ola bilər.":
    "Имя может быть не длиннее {max} {max|символа|символов|символов}.",
  "Ad çox uzundur.": "Имя слишком длинное.",
  "Dil düzgün deyil.": "Неверный язык.",
  "Müraciət tapılmadı.": "Заявка не найдена.",

  "Rol seçin.": "Выберите роль.",
  "İstifadəçi tapılmadı.": "Пользователь не найден.",
  "Bu e-poçt ilə istifadəçi artıq var.": "Пользователь с этой эл. почтой уже есть.",
  "Deaktiv istifadəçiyə dəvət göndərilmir.":
    "Деактивированному пользователю приглашение не отправляется.",
  "Öz rolunuzu və statusunuzu dəyişə bilməzsiniz.": "Нельзя изменить собственную роль и статус.",

  "Yanlış dəyər": "Неверное значение",
  "Yanlış dəyər: gözlənilən {expected}, daxil olan {received}":
    "Неверное значение: ожидалось {expected}, получено {received}",
  "Yanlış dəyər: gözlənilən {value}": "Неверное значение: ожидалось {value}",
  "Yanlış seçim: aşağıdakılardan biri olmalıdır: {values}":
    "Неверный выбор: должно быть одно из значений: {values}",
  "Çox böyük: gözlənilən string <={max} simvol": "Не более {max} {max|символа|символов|символов}",
  "Çox böyük: gözlənilən array <={max} element":
    "Не более {max} {max|элемента|элементов|элементов}",
  "Çox böyük: gözlənilən file <={max} bayt": "Файл не более {max} {max|байта|байт|байт}",
  "Çox böyük: gözlənilən number <={max}": "Не больше {max}",
  "Çox böyük: gözlənilən number <{max}": "Должно быть меньше {max}",
  "Çox böyük: gözlənilən {origin} {limit} simvol":
    "Слишком большое значение: ожидается {origin} {limit} символов",
  "Çox böyük: gözlənilən {origin} {limit} element":
    "Слишком большое значение: ожидается {origin} {limit} элементов",
  "Çox böyük: gözlənilən {origin} {limit} bayt":
    "Слишком большое значение: ожидается {origin} {limit} байт",
  "Çox böyük: gözlənilən {origin} {limit}": "Слишком большое значение: ожидается {origin} {limit}",
  "Çox kiçik: gözlənilən string >={min} simvol": "Не менее {min} {min|символа|символов|символов}",
  "Çox kiçik: gözlənilən array >={min} element":
    "Не менее {min} {min|элемента|элементов|элементов}",
  "Çox kiçik: gözlənilən number >={min}": "Не меньше {min}",
  "Çox kiçik: gözlənilən number >{min}": "Должно быть больше {min}",
  "Çox kiçik: gözlənilən {origin} {limit} simvol":
    "Слишком маленькое значение: ожидается {origin} {limit} символов",
  "Çox kiçik: gözlənilən {origin} {limit} element":
    "Слишком маленькое значение: ожидается {origin} {limit} элементов",
  "Çox kiçik: gözlənilən {origin} {limit} bayt":
    "Слишком маленькое значение: ожидается {origin} {limit} байт",
  "Çox kiçik: gözlənilən {origin} {limit}":
    "Слишком маленькое значение: ожидается {origin} {limit}",
  'Yanlış mətn: "{prefix}" ilə başlamalıdır': "Неверный текст: должен начинаться с «{prefix}»",
  'Yanlış mətn: "{suffix}" ilə bitməlidir': "Неверный текст: должен заканчиваться на «{suffix}»",
  'Yanlış mətn: "{includes}" daxil olmalıdır': "Неверный текст: должен содержать «{includes}»",
  "Yanlış mətn: {pattern} şablonuna uyğun olmalıdır":
    "Неверный текст: должен соответствовать шаблону {pattern}",
  "Yanlış email address": "Неверный адрес эл. почты",
  "Yanlış URL": "Неверный URL",
  "Yanlış UUID": "Неверный UUID",
  "Yanlış ISO datetime": "Неверные дата и время ISO",
  "Yanlış ISO date": "Неверная дата ISO",
  "Yanlış input": "Неверный ввод",
  "Yanlış ədəd: {divisor} ilə bölünə bilən olmalıdır":
    "Неверное число: должно делиться на {divisor}",
  "Tanınmayan açar: {keys}": "Неизвестный ключ: {keys}",
  "Tanınmayan açarlar: {keys}": "Неизвестные ключи: {keys}",
  "{origin} daxilində yanlış açar": "Неверный ключ в {origin}",
  "{origin} daxilində yanlış dəyər": "Неверное значение в {origin}",
  "Fayl düzgün deyil.": "Неверный файл.",
  "Media növünü seçin.": "Выберите тип медиа.",
  "Düzülüşü seçin.": "Выберите расположение.",
  "Fonu seçin.": "Выберите фон.",
  "Medianın enini seçin.": "Выберите ширину медиа.",
  "Ən azı {min}% ola bilər.": "Не меньше {min}%.",
  "Ən çox {max}% ola bilər.": "Не больше {max}%.",
  "{step}%-lik addımlarla seçin.": "Выбирайте с шагом {step}%.",
  "Video seçin.": "Выберите видео.",
  "Video tapılmadı.": "Видео не найдено.",
  "Fon düzülüşü üçün şəkil və ya video seçin.":
    "Для фонового расположения выберите изображение или видео.",
  "Düymə üçün link yazın.": "Укажите ссылку для кнопки.",
  "Düymənin mətnini yazın.": "Введите текст кнопки.",
  "Başlıq, mətn və ya media əlavə edin.": "Добавьте заголовок, текст или медиа.",
  "Bütün bölmələr bir dəfə göndərilməlidir.": "Каждый раздел нужно отправить один раз.",
  "Ən çox {max} əlavə bölmə ola bilər.":
    "Не более {max} {max|дополнительного раздела|дополнительных разделов|дополнительных разделов}.",
} satisfies Messages;

export const en: Record<keyof typeof ru, string> = {
  "Bu sahəni doldurun.": "Fill in this field.",
  "Seçim düzgün deyil.": "Invalid selection.",
  "Ən çox {max} simvol ola bilər.": "At most {max} {max|character|characters}.",
  "Yalnız kiçik latın hərfləri, rəqəmlər və tire.":
    "Only lowercase Latin letters, digits and hyphens.",
  "Status seçin.": "Choose a status.",
  "Dəyər seçin.": "Choose a value.",
  "Sıra boşdur.": "The order is empty.",
  "Dəyişiklik yoxdur.": "There are no changes.",

  "E-poçt ünvanı düzgün deyil.": "The email address is not valid.",
  "Şifrəni daxil edin.": "Enter the password.",
  "Şifrə ən azı {min} simvol olmalıdır.":
    "The password must be at least {min} {min|character|characters}.",
  "Şifrə çox uzundur.": "The password is too long.",
  "Şifrə çox qısadır.": "The password is too short.",
  "Şifrələr eyni deyil.": "The passwords don't match.",
  "E-poçt və ya şifrə yanlışdır.": "Incorrect email or password.",
  "Hesabınız deaktiv edilib.": "Your account has been deactivated.",
  "Link etibarsızdır və ya vaxtı keçib. Yeni link istəyin.":
    "The link is invalid or has expired. Request a new link.",
  "Çox cəhd edildi. Bir dəqiqə sonra yenidən yoxlayın.":
    "Too many attempts. Try again in a minute.",

  "Daxil olmaq lazımdır.": "You need to sign in.",
  "Bu əməliyyat üçün icazəniz yoxdur.": "You don't have permission for this action.",
  "Sorğunun gövdəsi JSON deyil.": "The request body is not JSON.",
  "Xəta baş verdi. Yenidən cəhd edin.": "Something went wrong. Try again.",
  "Məlumatlar düzgün deyil.": "The data is not valid.",
  "Siyahı köhnədir. Səhifəni yeniləyib yenidən cəhd edin.":
    "The list is out of date. Refresh the page and try again.",
  "Bu ünvan artıq istifadə olunur.": "This URL is already in use.",

  "Kateqoriyanın adını yazın.": "Enter the category name.",
  "Kateqoriyanı seçin.": "Choose a category.",
  "Kateqoriya tapılmadı.": "Category not found.",
  "Kateqoriya təkrarlanır.": "The category is repeated.",
  "Bu ünvan (slug) artıq başqa kateqoriyada istifadə olunur.":
    "This URL (slug) is already used by another category.",
  "Kateqoriya öz-özünün alt kateqoriyası ola bilməz.": "A category can't be its own subcategory.",
  "Kateqoriya öz-özünün altına keçə bilməz.": "A category can't be moved under itself.",
  "Üst kateqoriya tapılmadı.": "Parent category not found.",
  "Yalnız iki səviyyə olar: alt kateqoriyanın altına kateqoriya qoymaq olmaz.":
    "Only two levels are allowed: a category can't go under a subcategory.",
  "Alt kateqoriyaları olan kateqoriya başqasının altına keçə bilməz.":
    "A category with subcategories can't be moved under another one.",
  "Sıra təkrarlanan kateqoriya ehtiva edir.": "The order contains a repeated category.",
  "Kateqoriyalardan biri tapılmadı.": "One of the categories was not found.",
  "Məhsulları başqa kateqoriyaya köçürün.": "Move the products to another category.",
  "Hədəf kateqoriya tapılmadı.": "Target category not found.",

  "Məhsulun adını yazın.": "Enter the product name.",
  "Məhsul seçin.": "Choose a product.",
  "Məhsul düzgün deyil.": "Invalid product.",
  "Məhsul təkrarlanır.": "The product is repeated.",
  "Məhsul tapılmadı.": "Product not found.",
  "Məhsul özü ilə əlaqələndirilə bilməz.": "A product can't be related to itself.",
  "Bu ünvan (slug) artıq başqa məhsulda istifadə olunur.":
    "This URL (slug) is already used by another product.",
  "Ən çox {max} məhsul ola bilər.": "At most {max} {max|product|products}.",
  "Ən çox {max} məhsul seçmək olar.": "You can choose at most {max} {max|product|products}.",
  "Ən çox {max} əlaqəli məhsul seçmək olar.":
    "You can choose at most {max} related {max|product|products}.",
  "Ən çox {max} kateqoriya seçmək olar.": "You can choose at most {max} {max|category|categories}.",
  "Ən çox {max} göstərici ola bilər.": "At most {max} {max|specification|specifications}.",
  "Ən çox {max} şəkil ola bilər.": "At most {max} {max|image|images}.",
  "Bir dəfəyə ən çox {max} məhsul.": "At most {max} {max|product|products} at a time.",
  "{count} məhsul dərc olunmadı: şəkli yoxdur və ya silinib.":
    "{count} {count|product was|products were} not published: no image, or the image was deleted.",
  "Göstəricinin adını yazın.": "Enter the specification name.",
  "Dəyəri yazın.": "Enter the value.",
  "Şəkil seçin.": "Choose an image.",
  "Şəkil üçün alt mətn yazın.": "Enter alt text for the image.",
  "Eyni şəkil iki dəfə əlavə olunub.": "The same image was added twice.",
  "3D model üçün poster şəkli seçin.": "Choose a poster image for the 3D model.",
  "3D model GLB faylı olmalıdır.": "The 3D model must be a GLB file.",
  "Poster şəkil olmalıdır.": "The poster must be an image.",
  "Dərc etmək üçün ən azı bir şəkil əlavə edin.": "Add at least one image to publish.",
  "Əməliyyat seçin.": "Choose an action.",
  "Məhsullardan biri tapılmadı və ya zibil qutusundadır.":
    "One of the products was not found or is in the trash.",

  "Layihənin adını yazın.": "Enter the project name.",
  "Layihənin növünü seçin.": "Choose the project type.",
  "Layihəni seçin.": "Choose a project.",
  "Layihə tapılmadı.": "Project not found.",
  "Layihələrdən biri tapılmadı.": "One of the projects was not found.",
  "Sıra təkrarlanan layihə ehtiva edir.": "The order contains a repeated project.",
  "Bu ünvan (slug) artıq başqa layihədə istifadə olunur.":
    "This URL (slug) is already used by another project.",

  "Səhifənin adını yazın.": "Enter the page name.",
  "Səhifəni seçin.": "Choose a page.",
  "Səhifə tapılmadı.": "Page not found.",
  "Bu ünvan saytın bölməsinə aiddir. Başqa ünvan seçin.":
    "This URL belongs to a section of the site. Choose another URL.",
  "Bu ünvan (slug) artıq başqa səhifədə istifadə olunur.":
    "This URL (slug) is already used by another page.",
  "Sistem səhifəsini silmək olmaz: sayt bu səhifəyə bağlıdır. Onu qaralamaya çevirə bilərsiniz.":
    "A system page can't be deleted: the site depends on it. You can turn it into a draft.",

  "Yazının başlığını yazın.": "Enter the post title.",
  "Tarix və saatı düzgün yazın.": "Enter a valid date and time.",
  "Yazı tapılmadı.": "Post not found.",
  "Bu ünvan (slug) artıq başqa yazıda istifadə olunur.":
    "This URL (slug) is already used by another post.",

  "Fayl adı yoxdur.": "The file has no name.",
  "Fayl adı çox uzundur.": "The file name is too long.",
  "Bu fayl növü dəstəklənmir.": "This file type is not supported.",
  "Fayl boşdur.": "The file is empty.",
  "Fayl {size}-dan böyük ola bilməz.": "The file can't be larger than {size}.",
  "Fayl açarı düzgün deyil.": "Invalid file key.",
  "Fayl yüklənməyib. Yenidən cəhd edin.": "The file was not uploaded. Try again.",
  "Fayl icazə verilən ölçüdən böyükdür.": "The file is larger than allowed.",
  "Faylın məzmunu növünə uyğun deyil.": "The file content doesn't match its type.",
  "Fayl tapılmadı.": "File not found.",
  "Fayl istifadə olunur. Əvvəlcə onu istifadə edən yerlərdən çıxarın.":
    "The file is in use. First remove it from the places that use it.",
  "Həmişəlik silmək yalnız sahibə icazəlidir.": "Only the owner can delete permanently.",
  "PDF faylı seçin.": "Choose a PDF file.",
  "Şəkil tapılmadı.": "Image not found.",
  "JPG, PNG və ya WebP şəkil seçin.": "Choose a JPG, PNG or WebP image.",
  "Şəkil (PNG, WebP, SVG) seçin.": "Choose an image (PNG, WebP, SVG).",
  "Favikon kvadrat olmalıdır, məsələn 512 × 512.":
    "The favicon must be square, for example 512 × 512.",
  "Şəklin ölçüləri bilinmir. Şəkli yenidən yükləyin.":
    "The image size is unknown. Upload the image again.",

  "Qrupu seçin.": "Choose a group.",
  "Adı yazın.": "Enter the name.",
  "Loqo şəklini seçin.": "Choose the logo image.",
  "Loqo tapılmadı.": "Logo not found.",
  "Sıra təkrarlanan loqo ehtiva edir.": "The order contains a repeated logo.",
  "Tam ünvan yazın: http:// və ya https:// ilə başlamalıdır.":
    "Enter the full URL: it must start with http:// or https://.",

  "Elementin adını yazın.": "Enter the item name.",
  "Keçid növünü seçin.": "Choose the link type.",
  "Ünvanı yazın.": "Enter the URL.",
  "https:// ilə tam ünvan, /yol, tel: və ya mailto: yazın.":
    "Enter a full URL with https://, a /path, tel: or mailto:.",
  "Başlığı yazın.": "Enter the title.",
  "Sütunun başlığını yazın.": "Enter the column title.",
  "Ən çox {max} element ola bilər.": "At most {max} {max|item|items}.",
  "Menyu tapılmadı.": "Menu not found.",
  "Menyu başqa yerdə dəyişdirilib. Səhifəni yeniləyib yenidən cəhd edin.":
    "The menu was changed elsewhere. Refresh the page and try again.",
  "Bəzi elementlərin hədəfi tapılmadı.": "The target of some items was not found.",
  "Altbilgi sütununda alt element ola bilməz.": "A footer column can't have sub-items.",
  "Menyu ən çox {max} səviyyəli ola bilər.": "The menu can have at most {max} {max|level|levels}.",
  "Menyuda təkrarlanan element var.": "The menu has a repeated item.",
  "Əsas menyu silinə bilməz.": "The main menu can't be deleted.",
  "Yalnız altbilgi sütunları silinə bilər.": "Only footer columns can be deleted.",
  "Sıra təkrarlanan sütun ehtiva edir.": "The order contains a repeated column.",

  "Bölmə düzgün deyil.": "Invalid section.",
  "Bütün bölmələr göndərilməlidir.": "All sections must be sent.",
  "Bölmə təkrarlanır.": "The section is repeated.",
  "Ən çox {max} slayd ola bilər.": "At most {max} {max|slide|slides}.",
  "Slaydın başlığını yazın.": "Enter the slide title.",
  "Slayd şəkli üfüqi olmalıdır: eni hündürlüyündən böyük. Bu şəkil {width} × {height} px-dir.":
    "The slide image must be landscape: wider than it is tall. This image is {width} × {height} px.",
  "Slayd şəklinin eni ən azı {min} px olmalıdır. Bu şəklin eni {width} px-dir.":
    "The slide image must be at least {min} px wide. This image is {width} px wide.",
  "Mobil şəkil şaquli olmalıdır: hündürlüyü enindən böyük. Bu şəkil {width} × {height} px-dir.":
    "The mobile image must be portrait: taller than it is wide. This image is {width} × {height} px.",
  "Mobil şəklin eni ən azı {min} px olmalıdır. Bu şəklin eni {width} px-dir.":
    "The mobile image must be at least {min} px wide. This image is {width} px wide.",
  "Saytdakı ünvanı «/» ilə (məsələn /mehsullar) və ya tam linki https:// ilə yazın.":
    "Enter a site URL with “/” (for example /mehsullar) or a full link with https://.",

  "Şirkətin adı «MMC» olmadan yazılır, məsələn «Mebline».":
    "Write the company name without “MMC”, for example “Mebline”.",
  "Link çox uzundur.": "The link is too long.",
  "Nömrə düzgün deyil.": "The number is not valid.",
  "Nömrəni ölkə kodu ilə yalnız rəqəmlərlə yazın, məsələn 994552555423.":
    "Enter the number with the country code, digits only, for example 994552555423.",
  "Nömrənin adını yazın, məsələn «Ofis».": "Enter a name for the number, for example “Office”.",
  "Şəbəkəni seçin.": "Choose a social network.",
  "Linki https:// ilə tam yazın.": "Enter the full link with https://.",
  "Xəritə linkini https:// ilə tam yazın.": "Enter the full map link with https://.",
  "Ən azı bir telefon nömrəsi əlavə edin.": "Add at least one phone number.",
  "Ən çox {max} nömrə ola bilər.": "At most {max} {max|number|numbers}.",
  "Bu nömrə artıq əlavə olunub.": "This number has already been added.",
  "Ən çox {max} ünvan ola bilər.": "At most {max} {max|address|addresses}.",
  "Bu ünvan artıq əlavə olunub.": "This address has already been added.",
  "Ən çox {max} şəbəkə ola bilər.": "At most {max} social {max|network|networks}.",
  "Bu şəbəkə artıq əlavə olunub.": "This social network has already been added.",

  "Köhnə ünvanı yazın.": "Enter the old URL.",
  "Yeni ünvanı yazın.": "Enter the new URL.",
  "Ünvan «/» ilə başlamalıdır.": "The URL must start with “/”.",
  "Ünvan düzgün deyil.": "The URL is not valid.",
  "Ünvanda boşluq olmamalıdır.": "The URL must not contain spaces.",
  "Ana səhifəni yönləndirmək olmaz.": "The home page can't be redirected.",
  "Bu ünvan yönləndirilə bilməz.": "This URL can't be redirected.",
  "Saytdakı ünvanı «/» ilə başlayaraq yazın, məsələn /mehsullar.":
    "Enter a site URL starting with “/”, for example /mehsullar.",
  "Kodu seçin.": "Choose a code.",
  "Köhnə və yeni ünvan eyni ola bilməz.": "The old and new URLs can't be the same.",
  "Yönləndirmə tapılmadı.": "Redirect not found.",
  "Bu köhnə ünvan üçün yönləndirmə artıq var.": "A redirect for this old URL already exists.",
  "Bu ünvan özü də {target} ünvanına yönləndirilir. Son ünvanı yazın.":
    "This URL itself redirects to {target}. Enter the final URL.",

  "Telefon nömrəsini yazın.": "Enter the phone number.",
  "Telefon nömrəsi düzgün deyil.": "The phone number is not valid.",
  "Nömrəni +994 XX XXX XX XX və ya 0XX XXX XX XX şəklində yazın.":
    "Enter the number as +994 XX XXX XX XX or 0XX XXX XX XX.",
  "Adınızı yazın.": "Enter your name.",
  "Ad ən azı {min} simvol olmalıdır.":
    "The name must be at least {min} {min|character|characters}.",
  "Ad ən çox {max} simvol ola bilər.": "The name can be at most {max} {max|character|characters}.",
  "Ad çox uzundur.": "The name is too long.",
  "Dil düzgün deyil.": "Invalid language.",
  "Müraciət tapılmadı.": "Request not found.",

  "Rol seçin.": "Choose a role.",
  "İstifadəçi tapılmadı.": "User not found.",
  "Bu e-poçt ilə istifadəçi artıq var.": "A user with this email already exists.",
  "Deaktiv istifadəçiyə dəvət göndərilmir.": "Invitations aren't sent to deactivated users.",
  "Öz rolunuzu və statusunuzu dəyişə bilməzsiniz.": "You can't change your own role and status.",

  "Yanlış dəyər": "Invalid value",
  "Yanlış dəyər: gözlənilən {expected}, daxil olan {received}":
    "Invalid value: expected {expected}, received {received}",
  "Yanlış dəyər: gözlənilən {value}": "Invalid value: expected {value}",
  "Yanlış seçim: aşağıdakılardan biri olmalıdır: {values}":
    "Invalid option: must be one of {values}",
  "Çox böyük: gözlənilən string <={max} simvol": "At most {max} {max|character|characters}",
  "Çox böyük: gözlənilən array <={max} element": "At most {max} {max|item|items}",
  "Çox böyük: gözlənilən file <={max} bayt": "File of at most {max} {max|byte|bytes}",
  "Çox böyük: gözlənilən number <={max}": "At most {max}",
  "Çox böyük: gözlənilən number <{max}": "Must be less than {max}",
  "Çox böyük: gözlənilən {origin} {limit} simvol": "Too big: expected {origin} {limit} characters",
  "Çox böyük: gözlənilən {origin} {limit} element": "Too big: expected {origin} {limit} items",
  "Çox böyük: gözlənilən {origin} {limit} bayt": "Too big: expected {origin} {limit} bytes",
  "Çox böyük: gözlənilən {origin} {limit}": "Too big: expected {origin} {limit}",
  "Çox kiçik: gözlənilən string >={min} simvol": "At least {min} {min|character|characters}",
  "Çox kiçik: gözlənilən array >={min} element": "At least {min} {min|item|items}",
  "Çox kiçik: gözlənilən number >={min}": "At least {min}",
  "Çox kiçik: gözlənilən number >{min}": "Must be greater than {min}",
  "Çox kiçik: gözlənilən {origin} {limit} simvol":
    "Too small: expected {origin} {limit} characters",
  "Çox kiçik: gözlənilən {origin} {limit} element": "Too small: expected {origin} {limit} items",
  "Çox kiçik: gözlənilən {origin} {limit} bayt": "Too small: expected {origin} {limit} bytes",
  "Çox kiçik: gözlənilən {origin} {limit}": "Too small: expected {origin} {limit}",
  'Yanlış mətn: "{prefix}" ilə başlamalıdır': "Invalid text: must start with “{prefix}”",
  'Yanlış mətn: "{suffix}" ilə bitməlidir': "Invalid text: must end with “{suffix}”",
  'Yanlış mətn: "{includes}" daxil olmalıdır': "Invalid text: must include “{includes}”",
  "Yanlış mətn: {pattern} şablonuna uyğun olmalıdır":
    "Invalid text: must match the pattern {pattern}",
  "Yanlış email address": "Invalid email address",
  "Yanlış URL": "Invalid URL",
  "Yanlış UUID": "Invalid UUID",
  "Yanlış ISO datetime": "Invalid ISO datetime",
  "Yanlış ISO date": "Invalid ISO date",
  "Yanlış input": "Invalid input",
  "Yanlış ədəd: {divisor} ilə bölünə bilən olmalıdır":
    "Invalid number: must be a multiple of {divisor}",
  "Tanınmayan açar: {keys}": "Unrecognized key: {keys}",
  "Tanınmayan açarlar: {keys}": "Unrecognized keys: {keys}",
  "{origin} daxilində yanlış açar": "Invalid key in {origin}",
  "{origin} daxilində yanlış dəyər": "Invalid value in {origin}",
  "Fayl düzgün deyil.": "Invalid file.",
  "Media növünü seçin.": "Choose the media type.",
  "Düzülüşü seçin.": "Choose the layout.",
  "Fonu seçin.": "Choose the background.",
  "Medianın enini seçin.": "Choose the media width.",
  "Ən azı {min}% ola bilər.": "At least {min}%.",
  "Ən çox {max}% ola bilər.": "At most {max}%.",
  "{step}%-lik addımlarla seçin.": "Choose in steps of {step}%.",
  "Video seçin.": "Choose a video.",
  "Video tapılmadı.": "Video not found.",
  "Fon düzülüşü üçün şəkil və ya video seçin.":
    "Choose an image or a video for the background layout.",
  "Düymə üçün link yazın.": "Enter a link for the button.",
  "Düymənin mətnini yazın.": "Enter the button text.",
  "Başlıq, mətn və ya media əlavə edin.": "Add a heading, text or media.",
  "Bütün bölmələr bir dəfə göndərilməlidir.": "Every section must be sent exactly once.",
  "Ən çox {max} əlavə bölmə ola bilər.": "At most {max} extra {max|section|sections}.",
};
