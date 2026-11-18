// Labels of the newer HR pages (reports, employees, orders, payroll, team, calculators...). Format per line: Azerbaijani|English|Russian.
// These pages do not translate themselves: observeTranslations (app/i18n.tsx) applies this table to the rendered text.
const LINES = `əlavə|add|добавить
boş|empty|пусто
Düzəlt|Fix|Исправить
Maliyyə|Finance|Финансы
Şöbə rəhbəri|Department head|Руководитель отдела
İşçi|Employee|Сотрудник
Sil|Delete|Удалить
Auditor / xarici mühasib (yalnız baxış)|Auditor / external accountant (view only)|Аудитор / внешний бухгалтер (только просмотр)
Baş ofis|Head office|Головной офис
İşləyir|Working|Работает
Ətraflı|Details|Подробнее
istifadə|in use|использовано
dəq|min|мин
gözləyən|pending|ожидающие
İş stajı|Length of service|Стаж работы
Son haqq-hesab|Final settlement|Окончательный расчёт
İş günləri (istehsalat təqvimi)|Working days (production calendar)|Рабочие дни (производственный календарь)
büdcə yazılmayıb|no budget entered|бюджет не указан
Excel-dən yüklə|Import from Excel|Загрузить из Excel
Maliyyə hesabatlılığı|Financial reporting|Финансовая отчётность
İşçi axtar və seç (məlumatlar avtomatik dolur)|Find and pick an employee (data fills in automatically)|Найдите и выберите сотрудника (данные заполнятся автоматически)
Maaş (gross ↔ net)|Salary (gross ↔ net)|Зарплата (gross ↔ net)
Məzuniyyət|Vacation|Отпуск
Məzuniyyət kompensasiyası|Vacation compensation|Компенсация за отпуск
Orta əmək haqqı|Average salary|Средняя заработная плата
İxtisar / xitam|Redundancy / termination|Сокращение / увольнение
İş günləri|Working days|Рабочие дни
Hamiləlik və doğuş|Pregnancy and maternity|Беременность и роды
Xəstəlik müavinəti|Sick-leave benefit|Пособие по болезни
Artıq iş, gecə, boşdayanma|Overtime, night work, downtime|Сверхурочные, ночные, простой
ƏDV və vergilər|VAT and taxes|НДС и налоги
Tam ştat|Full-time|Полная ставка
Satış|Sales|Продажи
Satış meneci|Sales manager|Менеджер по продажам
Satış meneceri|Sales manager|Менеджер по продажам
Test göndər|Send a test|Отправить тест
təhvil verilib|handed over|передано
İcazələr|Permissions|Права
Dayandır|Suspend|Приостановить
dəvəti qəbul etdi|accepted the invitation|принял(а) приглашение
dəvət göndərildi|invitation sent|приглашение отправлено
İmzalanıb|Signed|Подписано
Gündəlik|Daily|Ежедневно
Maliyyə təhlili|Financial analysis|Финансовый анализ
ştat|staff position|штатная единица
Nümunə fayl|Sample file|Образец файла
Müsahibə|Interview|Собеседование
Tövsiyə proqramı|Referral program|Реферальная программа
Ştat cədvəli|Staff schedule|Штатное расписание
Büdcə|Budget|Бюджет
İşə qəbul|Recruitment|Найм
Əmək haqqı|Payroll|Заработная плата
Təlim|Training|Обучение
Saxlama müddəti|Retention period|Срок хранения
Vəziyyət|Status|Состояние
Hazırdır|Ready|Готово
İpucu:|Tip:|Подсказка:
İşçilər|Employees|Сотрудники
İşçi sayı planı|Headcount plan|План численности
Xərclər|Expenses|Расходы
Məzuniyyət qrafiki|Vacation schedule|График отпусков
Sənəd reyestri|Document registry|Реестр документов
İşdən çıxma|Offboarding|Увольнение
Aktivlər (əmlak)|Assets (property)|Активы (имущество)
Təşkilat sxemi|Org chart|Организационная схема
Rəy yoxlaması|Review check|Проверка отзывов
Ad günləri və il dönümləri|Birthdays and anniversaries|Дни рождения и годовщины
Əməyin mühafizəsi|Occupational safety|Охрана труда
Qaydalar və razılıq|Rules and consent|Правила и согласие
Təqvim|Calendar|Календарь
Vakansiya yarat|Create a vacancy|Создать вакансию
işçi|employee|сотрудник
Yeni vəzifə (ştat genişlənməsi)|New position (headcount growth)|Новая должность (расширение штата)
Vaxt təyin edilməyib|No time set|Время не назначено
Dəvət olunub:|Invited:|Приглашены:
Vaxt təyin et|Set a time|Назначить время
Şöbə|Section|Отдел
həssas|sensitive|конфиденциально
Namizəd (iş axtaran)|Candidate (job seeker)|Кандидат (соискатель)
İşçi (İş yerim)|Employee (My workplace)|Сотрудник (Моё рабочее место)
İşəgötürən: işə qəbul|Employer: recruitment|Работодатель: найм
İşəgötürən: kadr (HR)|Employer: HR|Работодатель: кадры (HR)
Tez-tez verilən suallar|Frequently asked questions|Частые вопросы
Məlumatlarımı kim görür?|Who sees my data?|Кто видит мои данные?
Excel ilə necə məlumat yükləyirəm?|How do I upload data with Excel?|Как загрузить данные из Excel?
Səhv etdim, geri qaytara bilərəmmi?|I made a mistake, can I undo it?|Я ошибся(лась), можно ли отменить?
Bildirişlər haradan gəlir?|Where do notifications come from?|Откуда приходят уведомления?
Kömək lazımdırsa?|Need help?|Нужна помощь?
Cavab tapmadınız?|Did not find an answer?|Не нашли ответ?
Dəstəyə yazın|Write to support|Написать в поддержку
Təsdiqlənib|Approved|Подтверждено
Ştatda yeri yoxdur|No place in the staff plan|Нет места в штате
Tətbiq olunub|Applied|Применено
Gəncə filialı|Ganja branch|Филиал в Гяндже
Redaktə üçün aç|Open to edit|Открыть для редактирования
Xülasə|Summary|Сводка
Plandan kənar|Outside the plan|Вне плана
İnteqrasiya (1C, SAP)|Integration (1C, SAP)|Интеграция (1C, SAP)
nəfər|people|чел.
Göstər|Show|Показать
rol / icazə dəyişdi|role / permission changed|роль / права изменены
İş yerim (işçi profili)|My workplace (employee profile)|Моё рабочее место (профиль сотрудника)
Yerləşdir|Place|Разместить
Bakı|Baku|Баку
Gəncə|Ganja|Гянджа
Mərhələ:|Stage:|Этап:
göndərilib|sent|отправлено
keçmədi|did not pass|не прошёл
Təsdiqlənib / tətbiq olunub|Approved / applied|Подтверждено / применено
Təqvim günü|Calendar day|Календарный день
Hamısı|All|Все
Sertifikat və imtahan|Certificates and exams|Сертификаты и экзамены
Tədbirlər|Events|Мероприятия
Hədiyyələr və təbriklər|Gifts and greetings|Подарки и поздравления
Tibbi sığorta və müayinə|Medical insurance and check-ups|Медицинское страхование и осмотры
Geyim və təchizat|Clothing and supplies|Одежда и снаряжение
Digər HR xərcləri|Other HR expenses|Прочие расходы HR
Dəyiş|Change|Изменить
Bacarıq matrisi|Skills matrix|Матрица навыков
Növbə qrafiki|Shift schedule|График смен
Ezamiyyət|Business trip|Командировка
Elanlar və sorğular|Announcements and surveys|Объявления и опросы
büdcə yoxdur|no budget|нет бюджета
+ Xərc yaz|+ Add expense|+ Записать расход
Maaş bölgüsü|Salary breakdown|Распределение зарплаты
Baş mühasib|Chief accountant|Главный бухгалтер
Namizəd|Candidate|Кандидат
“Müsahibəyə dəvət et”|“Invite to interview”|«Пригласить на собеседование»
Vaxt gözləyir|Waiting for a time|Ожидает времени
Gələcək|Upcoming|Предстоящие
Rəy gözləyir|Awaiting feedback|Ожидает отзыва
Keçmiş|Past|Прошедшие
Cədvəl|Table|Таблица
Müsahibə sualları|Interview questions|Вопросы для собеседования
Yeni siyahı|New list|Новый список
Rəylərin müqayisəsi|Feedback comparison|Сравнение отзывов
— seçin —|— select —|— выберите —
Yarım ştat|Half-time|Полставки
Qalıq|Balance|Остаток
Kadr əməliyyatları|HR operations|Кадровые операции
Orta aylıq əmək haqqı|Average monthly salary|Средняя месячная зарплата
Namizədlər|Candidates|Кандидаты
İşə qəbul analitikası|Recruitment analytics|Аналитика найма
Rollar: kim nəyi görür|Roles: who sees what|Роли: кто что видит
Nə edə bilər|What they can do|Что может делать
Bütün hüquqlar, komandanı idarə edir|All rights, manages the team|Все права, управляет командой
Əmrlər reyestri|Orders registry|Реестр приказов
İnkişaf və kommunikasiya|Development and communication|Развитие и коммуникация
Hesablar və ödənişlər|Invoices and payments|Счета и платежи
İşləyib:|Worked:|Отработано:
Geri qaytarılıb|Returned|Возвращено
Satış və bonus|Sales and bonus|Продажи и бонус
Müraciət|Application|Заявка
Təklif|Offer|Предложение
Davamiyyət|Attendance|Посещаемость
Bağlanma səbəbi:|Reason for closing:|Причина закрытия:
Müsahibə aparan işçi təyin edilməyib.|No interviewer has been assigned.|Интервьюер не назначен.
İştirakçı əlavə et|Add a participant|Добавить участника
Vaxtı / iştirakçıları dəyiş|Change time / participants|Изменить время / участников
Ləğv et|Cancel|Отменить
Şirkət|Company|Компания
Məbləğ|Amount|Сумма
Təsdiq|Approval|Подтверждение
Dəstək|Support|Поддержка
Bütün departamentlər|All departments|Все департаменты
Təsdiq gözləyir|Awaiting approval|Ожидает подтверждения
Paylaş|Share|Поделиться
Namizəd gəlmədi|Candidate did not show up|Кандидат не явился
Rəy yaz|Write feedback|Написать отзыв
— pilləsiz —|— no grade —|— без ступени —
Rəhbər (Lead)|Lead|Руководитель (Lead)
Vakansiya və işə qəbul|Vacancies and recruitment|Вакансии и найм
Vakansiyanı təsdiqsiz yayımlamaq|Publish a vacancy without approval|Публиковать вакансию без подтверждения
Təsdiq zəncirinin birinci pilləsi.|First step of the approval chain.|Первая ступень цепочки подтверждения.
İş təklifi göndərmək|Send a job offer|Отправлять предложения о работе
Namizədə və işçiyə təklif məktubu göndərir.|Sends an offer letter to a candidate or employee.|Отправляет письмо с предложением кандидату и сотруднику.
Kadr və işçilər|HR and employees|Кадры и сотрудники
Ştat cədvəli, departament və şöbələr|Staff schedule, departments and sections|Штатное расписание, департаменты и отделы
Əmrlər və əmrlər reyestri|Orders and orders registry|Приказы и реестр приказов
Davamiyyət (tabel) və istehsalat təqvimi|Attendance (timesheet) and production calendar|Посещаемость (табель) и производственный календарь
İşçi sənəd qovluğu|Employee document folder|Папка документов сотрудника
İşçilərin şəxsi məlumatları|Employees' personal data|Личные данные сотрудников
Maliyyə və hesabat|Finance and reports|Финансы и отчёты
Maaşlar və təklif məbləğləri|Salaries and offer amounts|Зарплаты и суммы предложений
Əmək haqqı hesablanması, avans və ödənişlər|Payroll, advances and payments|Расчёт зарплаты, авансы и выплаты
Hesabatların Excel-ə ixracı|Export reports to Excel|Экспорт отчётов в Excel
Panel hesabatları və XLSX faylları.|Dashboard reports and XLSX files.|Отчёты панели и файлы XLSX.
Hesab-fakturalar və ödənişlər|Invoices and payments|Счета-фактуры и платежи
Paket, ödəniş və hesab-fakturalar.|Plan, payments and invoices.|Пакет, платежи и счета-фактуры.
Şirkət məlumatları və təsdiqləmə|Company details and verification|Данные компании и подтверждение
Şirkət jurnalı|Company log|Журнал компании
Kimin nə etdiyini görür.|Shows who did what.|Показывает, кто что сделал.
Seçin|Select|Выберите
Ödənilib|Paid|Оплачено
açıq|open|открыто
Rədd|Rejected|Отклонено
İşçi reyestri|Employee registry|Реестр сотрудников
Dövriyyə: səbəb və staj üzrə|Turnover: by reason and tenure|Текучесть: по причине и стажу
Ştat planı sətir-sətir|Staff plan line by line|Штатный план по строкам
Gözlənilən çıxışlar|Expected departures|Ожидаемые увольнения
Yerin dolma müddəti|Time to fill a position|Срок заполнения места
İşəgötürən kalkulyatoru|Employer calculator|Калькулятор работодателя
Güzəşt yoxdur|No relief|Без льгот
Əsas məzuniyyət|Main vacation|Основной отпуск
Məzuniyyətin başlanğıcı|Vacation start|Начало отпуска
İstifadə edilməmiş məzuniyyət kompensasiyası|Unused vacation compensation|Компенсация неиспользованного отпуска
Əmək haqqı saxlanılan iş günü|Paid working days|Оплачиваемые рабочие дни
Aydakı norma iş günü|Standard working days in the month|Норма рабочих дней в месяце
Müavinətin faizi (%)|Benefit rate (%)|Процент пособия (%)
Bir günlük müavinət|One-day benefit|Пособие за один день
Vəzifə|Position|Должность
Departament / Şöbə|Department / Section|Департамент / Отдел
Excel hesabatı|Excel report|Отчёт Excel
İmza gözləyir|Awaiting signature|Ожидает подписи
Nümunə:|Example:|Пример:
Davamiyyət cədvəli|Attendance table|Табель посещаемости
İstehsalat təqvimi və bayramlar|Production calendar and holidays|Производственный календарь и праздники
＋ Yeni ad əlavə et…|＋ Add a new name…|＋ Добавить новое имя…
Bir kliklə yerləşdir|Place in one click|Разместить в один клик
Əl ilə əlavə et|Add manually|Добавить вручную
büdcə|budget|бюджет
Baxışda|Under review|На рассмотрении
Mənim axtarışım|My search|Мой поиск
Cari axtarışı saxla|Save current search|Сохранить текущий поиск
Uyğunluq|Match|Соответствие
Göndərildi|Sent|Отправлено
AI hələ sıralamayıb|AI has not ranked yet|ИИ ещё не ранжировал
Namizəd təsdiqlədi|Candidate confirmed|Кандидат подтвердил
Pillə|Grade|Ступень
Ştatın növü|Position type|Тип штата
Nə vaxtdan (ay)|From when (month)|С какого времени (месяц)
Nə vaxta qədər (müvəqqəti üçün)|Until when (for temporary)|До какого времени (для временных)
Səbəb (məcburi)|Reason (required)|Причина (обязательно)
Qərar|Decision|Решение
Kimə|To whom|Кому
Sifariş|Order|Заказ
İş günü|Working day|Рабочий день
İstirahət günü|Rest day|Выходной день
Cəmi|Total|Итого
Şirkət hesabını qurmaq|Setting up the company account|Настройка аккаунта компании
Əvvəl şirkətin məlumatları və komanda.|First the company details and the team.|Сначала данные компании и команда.
Qeydiyyatda «İşəgötürən» rolunu seçin.|Choose the “Employer” role when registering.|При регистрации выберите роль «Работодатель».
Şirkət məlumatları|Company details|Данные компании
Komanda və rollar|Team and roles|Команда и роли
HR AI köməkçi|HR AI assistant|HR-ассистент ИИ
Vakansiyalarım|My vacancies|Мои вакансии
Namizədlərlə işləmək|Working with candidates|Работа с кандидатами
Müraciətləri mərhələlərlə irəliləyin.|Move applications through the stages.|Продвигайте заявки по этапам.
Müsahibə və qiymətləndirmə|Interviews and assessment|Собеседования и оценка
Müsahibələr|Interviews|Собеседования
Testlər|Tests|Тесты
Təklif və işə qəbul|Offer and hiring|Предложение и приём на работу
İstedad bazası və mesajlar|Talent pool and messages|База талантов и сообщения
Namizədi vakansiyaya dəvət edin.|Invite a candidate to a vacancy.|Пригласите кандидата на вакансию.
İstedad bazası|Talent pool|База талантов
Nəticəni Excel faylı kimi yükləyin.|Download the result as an Excel file.|Скачайте результат как файл Excel.
İşçilər: kart və idxal|Employees: card and import|Сотрудники: карточка и импорт
Əmrlər reyestri və kadr hadisəsi|Orders registry and HR event|Реестр приказов и кадровое событие
Aylıq hesablama, avans, ödəniş, bank və təsdiq.|Monthly calculation, advance, payment, bank and approval.|Месячный расчёт, аванс, выплата, банк и подтверждение.
Plan və fakt, ştat cədvəli, ehtiyac təklifi|Plan vs actual, staff schedule, hiring proposal|План и факт, штатное расписание, заявка на найм
Plan və fakt|Plan vs actual|План и факт
Ehtiyac təklifi|Hiring proposal|Заявка на найм
Kadr əməliyyatları və davamiyyət|HR operations and attendance|Кадровые операции и посещаемость
Hesabatlar, təsdiqlər və kalkulyatorlar|Reports, approvals and calculators|Отчёты, подтверждения и калькуляторы
Rəqəmlər, təsdiq axını və hesablamalar.|Figures, approval flow and calculations.|Цифры, процесс подтверждения и расчёты.
Təsdiqlər|Approvals|Подтверждения
Platforma paketi və hesab-fakturalar.|Platform plan and invoices.|Пакет платформы и счета-фактуры.
Sual olsa «Dəstək»dən yazın.|If you have a question, write via “Support”.|Если есть вопрос, напишите через «Поддержку».
Excel-dən əlavə et|Add from Excel|Добавить из Excel
İşçi sayı|Headcount|Численность
faktiki / bu ayın planı|actual / this month's plan|факт / план этого месяца
Harada nə yazılır?|What goes where?|Что где писать?
İşçi ərizələri|Employee applications|Заявления сотрудников
Rədd et|Reject|Отклонить
Əmlak|Property|Имущество
Nəticə|Result|Результат
Zəfər günü|Victory Day|День Победы
Dövlət Bayrağı günü|State Flag Day|День государственного флага
Novruz bayramı|Novruz holiday|Праздник Новруз
maaş|salary|зарплата
hesab rekviziti yoxdur|no account details|нет реквизитов счёта
Ödə|Pay|Оплатить
Ştat|Position|Штат
plan həddi|plan limit|лимит плана
Bonus qaydası|Bonus rule|Правило бонуса
şöbəsiz|no section|без отдела
son 12 həftə|last 12 weeks|последние 12 недель
Rəqəmlər cədvəli|Figures table|Таблица значений
Uyğun deyil|Does not match|Не соответствует
Tövsiyə (tanışlıq)|Referral|Рекомендация (знакомство)
Daxili işçiyə təklif|Offer to an internal employee|Предложение внутреннему сотруднику
Digər səbəb|Other reason|Другая причина
Vəzifə dolduruldu|Position filled|Должность заполнена
Təcrübə|Experience|Опыт
Əsas bacarıqlar|Key skills|Ключевые навыки
İşə qəbul edildi|Hired|Принят на работу
Etiket və qeyd|Tags and note|Метки и заметка
Etiketlər:|Tags:|Метки:
Gələcək üçün|For the future|На будущее
Cavab gözlənilir|Awaiting a reply|Ожидается ответ
Texniki müsahibə|Technical interview|Техническое собеседование
Müsahibə aparanlar:|Interviewers:|Интервьюеры:
Təklif edildi|Offered|Предложено
Mənbə|Source|Источник
Ehtiyac təklifi: departamentiniz üçün yeni yer|Hiring proposal: a new position for your department|Заявка на найм: новое место для вашего департамента
Şöbə (istəyə görə)|Section (optional)|Отдел (по желанию)
— şöbəsiz —|— no section —|— без отдела —
Neçə nəfər|How many people|Сколько человек
Təklif etdiyiniz maaş — minimum (AZN, gross)|Proposed salary — minimum (AZN, gross)|Предлагаемая зарплата — минимум (AZN, gross)
Maaş — maksimum (AZN, gross)|Salary — maximum (AZN, gross)|Зарплата — максимум (AZN, gross)
Təklifi göndər|Send the proposal|Отправить заявку
Komandaya üzv dəvət et|Invite a team member|Пригласить участника в команду
Test məsul şəxsi|Test owner|Ответственный за тесты
İlkin seçim üzrə rekruter|Screening recruiter|Рекрутер по первичному отбору
Şöbə rəhbəri (testlərlə)|Department head (with tests)|Руководитель отдела (с тестами)
Kadr mütəxəssisi|HR specialist|Кадровый специалист
Tabel məsulu|Timekeeper|Ответственный за табель
Ştat və struktur məsulu|Staffing and structure owner|Ответственный за штат и структуру
Əmr və sənəd məsulu|Orders and documents owner|Ответственный за приказы и документы
Maliyyə / əmək haqqı mütəxəssisi|Finance / payroll specialist|Специалист по финансам / зарплате
Əlavə icazələr (rolun üstündən)|Extra permissions (on top of the role)|Дополнительные права (сверх роли)
rolla gəlir|comes with the role|входит в роль
Dəvət et|Invite|Пригласить
Rolların icazələri|Role permissions|Права ролей
— hər rolun özündə nə var|— what each role has|— что есть у каждой роли
İcazə|Permission|Право
Yekun təsdiq (direktor)|Final approval (director)|Итоговое подтверждение (директор)
Komanda və rolların idarəsi|Team and role management|Управление командой и ролями
Üzv dəvət edir, rolları və icazələri dəyişir.|Invites members and changes roles and permissions.|Приглашает участников, меняет роли и права.
Fəaliyyət jurnalı|Activity log|Журнал активности
Üzv fəaliyyəti (30 gün)|Member activity (30 days)|Активность участников (30 дней)
Rol və icazə tarixçəsi|Role and permission history|История ролей и прав
Nə|What|Что
Təfərrüat|Detail|Подробности
davamiyyət kilidi açıldı|attendance lock opened|блокировка табеля снята
düzəliş|correction|исправление
Yoxlanılır|Being checked|Проверяется
Şirkət rekvizitləri|Company details|Реквизиты компании
İşəgötürən səhifəsi (namizədlərə görünür)|Employer page (visible to candidates)|Страница работодателя (видна кандидатам)
Səhifə|Page|Страница
İşə qəbul haqqında əmr|Order on hiring|Приказ о приёме на работу
Sınaq müddətinin yekunları haqqında əmr|Order on probation results|Приказ об итогах испытательного срока
Əmək müqaviləsinin müddətinin uzadılması haqqında əmr|Order on extending the employment contract|Приказ о продлении срока трудового договора
Ştat ixtisarı ilə əlaqədar xitam haqqında əmr|Order on termination due to redundancy|Приказ о прекращении в связи с сокращением штата
Əmək müqaviləsinə xitam haqqında əmr|Order on termination of the employment contract|Приказ о прекращении трудового договора
İllik əmək məzuniyyəti haqqında əmr|Order on annual leave|Приказ о ежегодном трудовом отпуске
Hamiləlik və doğuş (analıq) məzuniyyəti haqqında əmr|Order on maternity leave|Приказ об отпуске по беременности и родам
Uşağa qulluq məzuniyyəti haqqında əmr|Order on childcare leave|Приказ об отпуске по уходу за ребёнком
Atalıq məzuniyyəti haqqında əmr|Order on paternity leave|Приказ об отпуске отца
Təhsil məzuniyyəti haqqında əmr|Order on study leave|Приказ об учебном отпуске
Ödənişsiz (öz hesabına) məzuniyyət haqqında əmr|Order on unpaid leave|Приказ о неоплачиваемом отпуске
Məzuniyyətdən geri çağırma haqqında əmr|Order on recall from leave|Приказ об отзыве из отпуска
Yaradıcılıq məzuniyyəti haqqında əmr|Order on creative leave|Приказ о творческом отпуске
Əmək məzuniyyətinin başqa vaxta keçirilməsi haqqında əmr|Order on postponing leave|Приказ о переносе отпуска
İstifadə edilməmiş məzuniyyət üçün kompensasiya haqqında əmr|Order on compensation for unused leave|Приказ о компенсации неиспользованного отпуска
Donor günü və əlavə istirahət günü haqqında əmr|Order on donor day and extra rest day|Приказ о дне донора и дополнительном дне отдыха
Tibbi müayinə üçün icazə haqqında əmr|Order on leave for a medical check-up|Приказ об освобождении для медосмотра
Məhkəmə və ya dövlət orqanına çağırışla əlaqədar əmr|Order on a court or state authority summons|Приказ в связи с вызовом в суд или госорган
Hərbi toplanış və ya hərbi çağırışla əlaqədar əmr|Order on military training or call-up|Приказ в связи с военными сборами или призывом
Boşdayanma haqqında əmr|Order on downtime|Приказ о простое
Uzaqdan (distant) işə keçirmə haqqında əmr|Order on transfer to remote work|Приказ о переводе на удалённую работу
İstirahət və ya bayram günü işə cəlb haqqında əmr|Order on work on a rest day or holiday|Приказ о привлечении к работе в выходной или праздник
İş vaxtından artıq işə cəlb haqqında əmr|Order on overtime work|Приказ о привлечении к сверхурочной работе
Ezamiyyət haqqında əmr|Order on a business trip|Приказ о командировке
Təlimə göndərmə haqqında əmr|Order on sending to training|Приказ о направлении на обучение
Müvəqqəti əvəzetmə (əlavə vəzifənin icrası) haqqında əmr|Order on temporary substitution|Приказ о временном замещении
İş rejiminin dəyişdirilməsi haqqında əmr|Order on changing the work mode|Приказ об изменении режима работы
İşdən kənarlaşdırma haqqında əmr|Order on suspension from work|Приказ об отстранении от работы
Ad və ya soyadın dəyişdirilməsi haqqında əmr|Order on changing a name or surname|Приказ об изменении имени или фамилии
Əmək haqqının dəyişdirilməsi haqqında əmr|Order on changing the salary|Приказ об изменении заработной платы
Mükafatlandırma haqqında əmr|Order on a bonus|Приказ о премировании
İntizam tənbehi haqqında əmr|Order on a disciplinary penalty|Приказ о дисциплинарном взыскании
Yeni əmr|New order|Новый приказ
Kadr hadisəsi|HR event|Кадровое событие
İmzalanıb, kartda tətbiq gözləyir|Signed, waiting to apply to the card|Подписан, ожидает применения в карточке
Təkrarlanan nömrə|Duplicate number|Повторяющийся номер
Axtarış (nömrə, işçi, departament)|Search (number, employee, department)|Поиск (номер, сотрудник, департамент)
İmza gözləyənlər|Awaiting signature|Ожидают подписи
Əmrin növü|Order type|Тип приказа
Tarixdən|From|С даты
Tarixədək|Until|По дату
Gözləmə|Waiting|Ожидание
Tətbiq gözləyir|Waiting to apply|Ожидает применения
Çap (imza vərəqi)|Print (signature sheet)|Печать (лист подписей)
İşçi axını və dövriyyə|Workforce flow and turnover|Движение персонала и текучесть
Kadr və əmək haqqı|HR and payroll|Кадры и зарплата
Kadr və əmək haqqı fondu|HR and payroll fund|Кадры и фонд заработной платы
İşçilərlə hesablaşma hesabatı|Settlement report with employees|Отчёт о расчётах с сотрудниками
Aylıq əmək haqqı cədvəli|Monthly payroll table|Месячная ведомость зарплаты
Kadr dinamikası, proqnoz və plan-fakt|HR dynamics, forecast and plan vs actual|Кадровая динамика, прогноз и план-факт
Əmək haqqı fondunun aylıq dəyişikliyi|Monthly change of the payroll fund|Месячное изменение фонда зарплаты
Ştat planı və fakt|Staff plan and actual|Штатный план и факт
Ştat xərci: plan və fakt (departament üzrə)|Staffing cost: plan vs actual (by department)|Расходы на штат: план и факт (по департаментам)
Ştat uyğunsuzluqları|Staffing mismatches|Несоответствия штата
Plandan kənar sorğular və təkliflər|Out-of-plan requests and proposals|Внеплановые запросы и предложения
Filial üzrə icmal|Branch summary|Сводка по филиалам
Davamiyyət və vaxt|Attendance and time|Посещаемость и время
Gecikmə və erkən çıxış|Lateness and early leave|Опоздания и ранний уход
Məzuniyyət öhdəliyi (işçi üzrə)|Vacation liability (by employee)|Обязательства по отпускам (по сотрудникам)
Davamiyyət xülasəsi|Attendance summary|Сводка посещаемости
Saat uçotu: artıq iş, gecə və istirahət günü|Hours: overtime, night and rest days|Учёт часов: сверхурочные, ночные и выходные
Məzuniyyət qalığı və qrafiki|Vacation balance and schedule|Остаток отпусков и график
Ezamiyyətlər və xərclər|Business trips and expenses|Командировки и расходы
İnkişaf|Development|Развитие
Təlimlər və büdcə|Training and budget|Обучение и бюджет
Performans nəticələri|Performance results|Результаты оценки
Sorğu nəticələri (eNPS)|Survey results (eNPS)|Результаты опросов (eNPS)
İşçi ərizələri və cavab müddəti|Employee applications and response time|Заявления сотрудников и срок ответа
İşdən çıxma prosesləri|Offboarding processes|Процессы увольнения
Şirkət əmlakı|Company property|Имущество компании
Sənəd müddətləri|Document deadlines|Сроки документов
Təsdiqlər və jurnal|Approvals and log|Подтверждения и журнал
Təsdiqlər: say və gözləmə müddəti|Approvals: count and waiting time|Подтверждения: количество и срок ожидания
Şirkət əməliyyat jurnalı|Company activity log|Журнал операций компании
Xarici alətlər (Power BI, Excel)|External tools (Power BI, Excel)|Внешние инструменты (Power BI, Excel)
Açar yarat|Create a key|Создать ключ
İşə qəbul icmalı|Recruitment overview|Обзор найма
Rəy yoxlamaları|Review checks|Проверки отзывов
Hazır hesabatlar (arxa planda hazırlananlar)|Ready reports (prepared in the background)|Готовые отчёты (подготовленные в фоне)
İşə qəbul: mərhələ müddəti və təklifin qəbulu|Hiring: stage time and offer acceptance|Найм: срок этапа и принятие предложения
İşə qəbul müddəti (median)|Time to hire (median)|Срок найма (медиана)
İşə qəbul qıfı|Hiring funnel|Воронка найма
İşə qəbul faizi|Hire rate|Доля принятых
Mənbələr: hansı mənbə işə qəbul gətirir|Sources: which source brings hires|Источники: какой источник приводит к найму
Platforma (müraciət)|Platform (application)|Платформа (заявка)
Şirkət dəvəti|Company invitation|Приглашение компании
Dəvət|Invitation|Приглашение
Dayanmış namizəd|Stalled candidate|Застрявший кандидат
Mərhələ|Stage|Этап
Əlavə alətlər|Extra tools|Дополнительные инструменты
İşçi profili kodları|Employee profile codes|Коды профиля сотрудника
Qalan məzuniyyət|Remaining vacation|Остаток отпуска
Ştat yeri|Staff position|Штатная единица
Aylıq fond: gross|Monthly fund: gross|Месячный фонд: gross
Arxivi gizlət (12 aydan əvvəl çıxanlar)|Hide archive (left more than 12 months ago)|Скрыть архив (уволенные более 12 месяцев назад)
Hesab-fakturalar|Invoices|Счета-фактуры
o cümlədən ƏDV|including VAT|в том числе НДС
Bu bölmə necə işləyir?|How does this section work?|Как работает этот раздел?
Vakansiya təsdiqləri|Vacancy approvals|Подтверждения вакансий
Direktor qərarı tələb edən sorğular|Requests needing a director's decision|Запросы, требующие решения директора
sizin qərarınız|your decision|ваше решение
İcazələr və əvəzedici|Permissions and substitute|Права и заместитель
Kim nəyi nə qədərə təsdiq edir|Who approves what and up to how much|Кто что и до какой суммы подтверждает
Digər gözləyən təsdiqlər|Other pending approvals|Другие ожидающие подтверждения
Ezamiyyət sorğuları|Business trip requests|Запросы на командировки
Çatışmayanlar:|Missing:|Не хватает:
Şəxsi məlumatların şifrələnməsi|Personal data encryption|Шифрование личных данных
Rəhbər|Lead|Руководитель
AI paketi və əlavə analiz|AI package and extra analyses|ИИ-пакет и дополнительные анализы
Tam CV analizi: qalıb|Full CV analysis: left|Полный анализ резюме: осталось
AI reytinqi: qalıb|AI ranking: left|ИИ-рейтинг: осталось
Paketi dəyiş|Change package|Сменить пакет
Əlavə analiz al|Buy extra analyses|Купить дополнительные анализы
Yüksəlt|Upgrade|Повысить
Keç|Switch|Перейти
Al|Buy|Купить
Aktiv|Active|Активен
Aylıq limit bitəndə istifadə olunur; müddəti bitmir.|Used when the monthly limit runs out; it does not expire.|Используется, когда месячный лимит исчерпан; срок не ограничен.
Kiçik əlavə paket|Small extra pack|Малый дополнительный пакет
Orta əlavə paket|Medium extra pack|Средний дополнительный пакет
Böyük əlavə paket|Large extra pack|Большой дополнительный пакет
Pulsuz|Free|Бесплатный
Başlanğıc|Starter|Стартовый
Standart|Standard|Стандарт
Peşəkar|Professional|Профессиональный
Böyük|Large|Большой
Təcili|Urgent|Срочно
Təcili: iş dayanıb və ya məlumat itir|Urgent: work has stopped or data is being lost|Срочно: работа остановлена или данные теряются
Mövzu|Topic|Тема
Başlıq|Title|Заголовок
Mesaj|Message|Сообщение
Məzuniyyət müddəti və məzuniyyət pulu|Vacation length and vacation pay|Продолжительность отпуска и отпускные
Əmək stajı (il)|Length of service (years)|Трудовой стаж (лет)
İşçinin yaşı|Employee's age|Возраст сотрудника
Qadın / təkbaşına böyüdən ata / övladlığa götürən|Woman / single father / adoptive parent|Женщина / отец-одиночка / усыновитель
Əlilliyi olan uşaq var|Has a child with a disability|Есть ребёнок с инвалидностью
Zərərli şərait əlavəsi (gün)|Harmful-conditions extra (days)|Дополнение за вредные условия (дней)
Verilən gün (boş = hüquq qədər)|Days granted (empty = full entitlement)|Предоставляемые дни (пусто = по праву)
Staja görə əlavə|Extra for service|Дополнение за стаж
Uşaqlı qadın/təkvalideynə görə əlavə|Extra for a woman with children / single parent|Дополнение для женщины с детьми / одинокого родителя
Zərərli şəraitə görə əlavə|Extra for harmful conditions|Дополнение за вредные условия
Cəmi məzuniyyət hüququ|Total vacation entitlement|Всего права на отпуск
Hesablanan gün sayı|Calculated number of days|Рассчитанное количество дней
Bayram günləri (sayılmır)|Holidays (not counted)|Праздничные дни (не считаются)
Məzuniyyətin son günü|Last day of vacation|Последний день отпуска
İşə çıxış tarixi|Return-to-work date|Дата выхода на работу
Məzuniyyət pulu|Vacation pay|Отпускные
Ən geci ödəniş tarixi|Latest payment date|Крайний срок выплаты
Əsas məzuniyyət təqvim günü ilə sayılır.|The main vacation is counted in calendar days.|Основной отпуск считается в календарных днях.
İşə qəbul tarixi|Hire date|Дата приёма на работу
İşdən çıxma tarixi|Termination date|Дата увольнения
İllik əsas məzuniyyət (gün)|Annual main vacation (days)|Ежегодный основной отпуск (дней)
Artıq istifadə edilən gün|Days already used|Уже использованные дни
Tam iş ili|Full working year|Полный рабочий год
Yarımçıq ilin günü|Days of the incomplete year|Дни неполного года
İstifadə edilən|Used|Использовано
İstifadə edilməyən|Unused|Не использовано
Bir günlük məbləğ|One-day amount|Сумма за один день
Orta əmək haqqı (ezamiyyət, donor günü, məhkəmə və s.)|Average salary (business trip, donor day, court, etc.)|Средняя зарплата (командировка, день донора, суд и т. д.)
Əvvəlki 2 ayın əmək haqqı cəmi (AZN)|Salary total of the previous 2 months (AZN)|Сумма зарплаты за предыдущие 2 месяца (AZN)
O aylardakı iş günü sayı|Working days in those months|Количество рабочих дней в эти месяцы
Sonuncu bir günlük əmək haqqı|Last one-day salary|Последняя однодневная зарплата
Bir günlük orta əmək haqqı|Average one-day salary|Средняя однодневная зарплата
Ödəniləcək məbləğ|Amount to pay|Сумма к выплате
İxtisar, işdənçıxarma müavinəti və xəbərdarlıq|Redundancy, severance pay and notice|Сокращение, выходное пособие и уведомление
İşəgötürəndə əmək stajı (il)|Service with the employer (years)|Стаж у работодателя (лет)
Orta aylıq əmək haqqı (AZN)|Average monthly salary (AZN)|Средняя месячная зарплата (AZN)
Xitam əsası|Ground for termination|Основание прекращения
Müəssisənin ləğvi|Liquidation of the enterprise|Ликвидация предприятия
Digər əsas|Other ground|Другое основание
Xəbərdarlıq müddəti|Notice period|Срок уведомления
Müavinət əmsalı|Benefit coefficient|Коэффициент пособия
İşdənçıxarma müavinəti (minimum)|Severance pay (minimum)|Выходное пособие (минимум)
İşçi ərizə verərsə: ən tez xitam|If the employee applies: earliest termination|Если сотрудник подаст заявление: самое раннее прекращение
Sınaq müddətinin həddi|Probation period limit|Предел испытательного срока
Aylıq maaş (gross)|Monthly salary (gross)|Месячная зарплата (gross)
Son ayda işlənmiş gün|Days worked in the last month|Отработанные дни в последнем месяце
İstifadə edilməmiş əsas məzuniyyət (gün)|Unused main vacation (days)|Неиспользованный основной отпуск (дней)
Bir günlük məzuniyyət məbləği|One-day vacation amount|Сумма отпуска за один день
İşdənçıxarma müavinəti|Severance pay|Выходное пособие
Qeyri-neft özəl|Non-oil private|Ненефтяной частный
Dövlət / neft-qaz|State / oil and gas|Государственный / нефтегазовый
Vergiyə cəlb olunan cəmi (gross)|Total taxable (gross)|Всего облагаемого (gross)
Ələ keçən (net)|Take-home (net)|На руки (net)
Ödəniləcək cəmi|Total to pay|Всего к выплате
Bayram və qeyri-iş günü|Holiday and non-working day|Праздничный и нерабочий день
İş saatı (8 saat × iş günü)|Working hours (8 h × working days)|Рабочие часы (8 ч × рабочие дни)
Gözlənilən doğuş tarixi|Expected birth date|Ожидаемая дата родов
Faktiki doğuş tarixi (məlumdursa)|Actual birth date (if known)|Фактическая дата родов (если известна)
Çətin doğuş|Difficult birth|Сложные роды
İki və daha çox uşaq|Two or more children|Двое и более детей
Doğuşdan əvvəl|Before birth|До родов
Doğuşdan sonra|After birth|После родов
İşə çıxış|Return to work|Выход на работу
Ata üçün ödənişli məzuniyyət|Paid leave for the father|Оплачиваемый отпуск для отца
Hamiləlik və doğuş müavinəti|Pregnancy and maternity benefit|Пособие по беременности и родам
Xəstəliyin başlanğıcı|Start of illness|Начало болезни
Xəstəlik dövrü|Illness period|Период болезни
Müavinət|Benefit|Пособие
Dövr sayı|Number of periods|Количество периодов
Cəmi staj|Total service|Общий стаж
Məzuniyyətə görə əlavə gün|Extra days for leave|Дополнительные дни за отпуск
İş vaxtından artıq, istirahət günü, gecə işi və boşdayanma|Overtime, rest-day work, night work and downtime|Сверхурочные, работа в выходные, ночные и простой
Aylıq iş vaxtı norması (saat)|Monthly working-time norm (hours)|Месячная норма рабочего времени (часы)
İş vaxtından artıq saat|Overtime hours|Сверхурочные часы
İstirahət/bayram günü işlənən saat|Hours worked on rest/holidays|Часы, отработанные в выходные/праздники
Gecə saatı (22:00–06:00)|Night hours (22:00–06:00)|Ночные часы (22:00–06:00)
Gecə əlavəsi (%) — müqavilədə|Night supplement (%) — in the contract|Ночная надбавка (%) — по договору
Saatlıq maaş|Hourly pay|Почасовая оплата
Gündəlik maaş|Daily pay|Дневная оплата
İş vaxtından artıq iş (2 qat)|Overtime (double)|Сверхурочная работа (в двойном размере)
Gecə işinə əlavə|Night-work supplement|Надбавка за ночную работу
Boşdayanma (2/3)|Downtime (2/3)|Простой (2/3)
Tutulmaların həddi və yarımçıq ay|Deduction limit and incomplete month|Предел удержаний и неполный месяц
İşçiyə verilməli əmək haqqı (AZN)|Salary due to the employee (AZN)|Зарплата к выдаче сотруднику (AZN)
İcra sənədləri (50%)|Enforcement documents (50%)|Исполнительные документы (50%)
Tutulma faizi (boş = qanunun həddi qədər)|Deduction rate (empty = legal limit)|Процент удержания (пусто = по закону)
İşlənmiş iş günü|Working days worked|Отработанные рабочие дни
Qanunun həddi (maksimum)|Legal limit (maximum)|Предел по закону (максимум)
Tətbiq olunan faiz|Applied rate|Применяемый процент
Tutulan məbləğ|Deducted amount|Удержанная сумма
İşçidə qalmalı|Must remain with the employee|Должно остаться у сотрудника
Yarımçıq ay üçün əmək haqqı|Salary for the incomplete month|Зарплата за неполный месяц
Hesabla|Calculate|Рассчитать
Yeni dövr|New period|Новый период
Yeni əmr|New order|Новый приказ
Rəhbər (Lead)|Lead|Руководитель
İşçi profili kodları|Employee profile codes|Коды профиля сотрудника
Şəxsi məlumatları Excel-dən|Personal data from Excel|Личные данные из Excel
Aylıq fond: gross|Monthly fund: gross|Месячный фонд: gross
Maaşı ştat həddindən kənar|Salary outside the staff limit|Зарплата вне лимита штата
Ştat cədvəli (Plan və fakt bölməsində) ↗|Staff schedule (in Plan vs actual) ↗|Штатное расписание (в разделе «План и факт») ↗
Qalan məzuniyyət|Remaining vacation|Остаток отпуска
Sınaq:|Probation:|Испытательный:
Planlaşdırılıb|Planned|Запланировано
Planı olmayan işçi|Employee without a plan|Сотрудник без плана
Tarixlər|Dates|Даты
Bu il üçün hələ məzuniyyət planlaşdırılmayıb.|No vacation has been planned for this year yet.|На этот год отпуск ещё не запланирован.
Planı olmayanlar:|Without a plan:|Без плана:
Sənəd|Document|Документ
Xərc|Expense|Расход
Gecə|Night|Ночь
Toplu qeyd (məzuniyyət, xəstəlik…)|Bulk mark (vacation, sickness…)|Массовая отметка (отпуск, болезнь…)
İşlənib (gün)|Worked (days)|Отработано (дней)
Saat: faktiki / ödənilən|Hours: actual / paid|Часы: фактические / оплаченные
Məzuniyyət və s.|Vacation, etc.|Отпуск и т. д.
Qeyri-iş günü|Non-working day|Нерабочий день
İş günü (məsələn, işlək şənbə)|Working day (e.g. working Saturday)|Рабочий день (например, рабочая суббота)
Qısaldılmış gün (7 saat, haqq tam)|Shortened day (7 hours, full pay)|Сокращённый день (7 часов, оплата полная)
Şirkət təqviminə əlavə et|Add to the company calendar|Добавить в календарь компании
Real xərc (ödənilib)|Actual expense (paid)|Фактический расход (оплачено)
Gözləyən / təxmini|Pending / estimated|Ожидаемый / ориентировочный
İcra (real)|Execution (actual)|Исполнение (факт)
Sifarişdə|On order|В заказе
Ştat cədvəlinə keç ↗|Go to the staff schedule ↗|Перейти к штатному расписанию ↗
Adı dəyiş|Rename|Переименовать
iş sizi gözləyir|work is waiting for you|вас ждёт работа
Müsahibələr (14 gün)|Interviews (14 days)|Собеседования (14 дней)
təyin olunmuş|scheduled|назначено
Vakansiya baxışları|Vacancy views|Просмотры вакансий
Müraciət dinamikası|Application trend|Динамика заявок
həftəsi|week|неделя
Vakansiya baxışı|Vacancy views|Просмотр вакансии
Kollektiv göstəriciləri|Workforce indicators|Показатели коллектива
İşçilərə keç ↗|Go to employees ↗|Перейти к сотрудникам ↗
son 4 həftə|last 4 weeks|последние 4 недели
Departamentlər üzrə işçilər|Employees by department|Сотрудники по департаментам
Təkrar yayımlandı|Republished|Опубликовано повторно
İştirakçılar|Participants|Участники
Namizəd:|Candidate:|Кандидат:
Ləğv edildi|Cancelled|Отменено
Rəy:|Feedback:|Отзыв:
Bütün iştirakçılar|All participants|Все участники
İşə qəbul qıfı|Hiring funnel|Воронка найма
Mərhələdə keçən müddət (median)|Time in stage (median)|Время на этапе (медиана)
Ölçü sayı|Sample size|Размер выборки
Dayanmış namizəd|Stalled candidate|Застрявший кандидат
Namizəd niyə rədd edilib|Why the candidate was rejected|Почему кандидат отклонён
Qaranlıq rejim|Dark mode|Тёмный режим
Proqram bölməsi|Program section|Раздел программы
İstehsalat təqvimi|Production calendar|Производственный календарь
İşəgötürən AI paketləri|Employer AI packages|ИИ-пакеты работодателя
İŞÇİ, ƏMR, ƏMƏK HAQQI, DAVAMİYYƏT|EMPLOYEE, ORDER, PAYROLL, ATTENDANCE|СОТРУДНИК, ПРИКАЗ, ЗАРПЛАТА, ПОСЕЩАЕМОСТЬ
Qəbul, köçürmə, məzuniyyət və xitam əmrini bir yerdən hazırlayın.|Prepare hiring, transfer, vacation and termination orders in one place.|Готовьте приказы о приёме, переводе, отпуске и увольнении в одном месте.
VAKANSİYA, NAMİZƏD, MÜSAHİBƏ|VACANCY, CANDIDATE, INTERVIEW|ВАКАНСИЯ, КАНДИДАТ, СОБЕСЕДОВАНИЕ
Ad, vəzifə və ya departament yazın|Type a name, position or department|Введите имя, должность или департамент
açıq vakansiya|open vacancy|открытая вакансия
Səbəbləri göstər|Show reasons|Показать причины
«Dəstək» bölməsindən sorğu yazın; cavab burada görünür.|Write a request in “Support”; the reply appears here.|Напишите обращение в «Поддержке»; ответ появится здесь.
İstifadəçi növü|User type|Тип пользователя
Təlimatda axtar (məsələn: məzuniyyət, müsahibə, təsdiq)|Search the guide (e.g. vacation, interview, approval)|Поиск в руководстве (например: отпуск, собеседование, подтверждение)
Təlimatda axtar|Search the guide|Поиск в руководстве
Çıxar|Remove|Убрать
İş yerim|My workplace|Моё рабочее место
Müəssisə ilə yazışmalar|Correspondence with the company|Переписка с предприятием
Məzuniyyət qrafikim|My vacation schedule|Мой график отпусков
Əmlakım|My property|Моё имущество
Çıxış müsahibəsi|Exit interview|Выходное интервью
Təlimlərim|My training|Моё обучение
Giriş-çıxış|Clock in/out|Приход/уход
Növbəm|My shift|Моя смена
Ezamiyyətlər|Business trips|Командировки
Qaydalar və təhlükəsizlik|Rules and safety|Правила и безопасность
Sənədlər|Documents|Документы
Məlumatlarım|My data|Мои данные
İş yerini qoş|Link a workplace|Подключить место работы
Qoş|Link|Подключить
İki mərhələli giriş aktiv deyil.|Two-step sign-in is not active.|Двухэтапный вход не включён.
Adda rəqəm və ya işarələr çoxdur|The name has many digits or symbols|В названии много цифр или знаков
Vakansiya yaradır (HR və direktor təsdiqi ilə), namizədlərə baxır|Creates vacancies (with HR and director approval) and reviews candidates|Создаёт вакансии (с подтверждением HR и директора), просматривает кандидатов
Maliyyə, bankçılıq və sığorta|Finance, banking and insurance|Финансы, банки и страхование
Vakansiyaları yekun təsdiq edir, maaşları və hesabları görür|Gives final approval to vacancies, sees salaries and invoices|Окончательно подтверждает вакансии, видит зарплаты и счета
Namizədlərlə işləyir, vakansiyanı təsdiqə göndərir|Works with candidates and sends vacancies for approval|Работает с кандидатами, отправляет вакансии на подтверждение
Haqq-hesab vərəqəsi|Payslip|Расчётный листок
Mütəxəssis|Specialist|Специалист
bu il eyni nömrə təkrarlanır|the same number repeats this year|в этом году номер повторяется
Müsahibə mərhələləri|Interview stages|Этапы собеседования
Dəvət olunub, vaxt təyin edilməyib|Invited, no time set|Приглашён, время не назначено
Təyin olunmuş müsahibələr|Scheduled interviews|Назначенные собеседования
Keçib, rəy yazılmayıb|Held, no feedback written|Прошло, отзыв не написан
Rəy yazılmış və bağlanmış|Feedback written and closed|Отзыв написан, закрыто
Həftəlik dolu və boş saatlar|Weekly busy and free hours|Занятые и свободные часы недели
Namizəd və ya vakansiya axtar|Search a candidate or vacancy|Поиск кандидата или вакансии
(ƏDV daxil)|(VAT included)|(НДС включён)
Bayram ərəfəsi: qısaldılmış iş günü (1 saat az, haqq tam)|Holiday eve: shortened working day (1 hour less, full pay)|Предпраздничный день: сокращённый рабочий день (на 1 час меньше, оплата полная)
Vakansiya açır, namizədləri seçir, müsahibə və təklif göndərir.|Opens vacancies, selects candidates, sends interviews and offers.|Открывает вакансии, отбирает кандидатов, отправляет приглашения и предложения.
Tələbləri yazın: AI elanı sizinlə birlikdə hazırlayır.|Write the requirements: AI prepares the listing with you.|Опишите требования: ИИ подготовит объявление вместе с вами.
Şablonlardan və əvvəlki vakansiyanın kopyasından istifadə edin.|Use templates and copies of earlier vacancies.|Используйте шаблоны и копии прежних вакансий.
Elanı paylaşın: keçid, sosial şəbəkə və xarici lent.|Share the listing: link, social networks and external feed.|Поделитесь объявлением: ссылка, соцсети и внешняя лента.
Rədd edəndə səbəbi seçin; istəsəniz namizədlə paylaşın.|When rejecting, choose a reason; share it with the candidate if you wish.|При отказе выберите причину; при желании поделитесь ею с кандидатом.
Dəvət, vaxt, iştirakçılar və kriteriyalar üzrə rəy.|Invitation, time, participants and feedback by criteria.|Приглашение, время, участники и отзыв по критериям.
«Rəylərin müqayisəsi»ndə namizədləri bal üzrə yan-yana görürsünüz.|In “Feedback comparison” you see candidates side by side by score.|В «Сравнении отзывов» вы видите кандидатов рядом по баллам.
Namizədə rəsmi təklif göndərin; qəbul edəndə işçi kartı yaranır.|Send the candidate a formal offer; an employee card is created on acceptance.|Отправьте кандидату официальное предложение; при принятии создаётся карточка сотрудника.
Təklifi geri çəkmək olar; namizədin cavabı bildirişlə gəlir.|The offer can be withdrawn; the candidate's reply arrives as a notification.|Предложение можно отозвать; ответ кандидата приходит уведомлением.
Gələcək üçün namizədləri saxlayın, onlarla yazışın.|Keep candidates for the future and write to them.|Сохраняйте кандидатов на будущее и переписывайтесь с ними.
«Mesajlar»da yazışın, şablon və qoşmadan istifadə edin.|Write in “Messages”, use templates and attachments.|Пишите в «Сообщениях», используйте шаблоны и вложения.
Namizədlərin harada itdiyini və prosesin nə qədər çəkdiyini görün.|See where candidates drop off and how long the process takes.|Смотрите, где теряются кандидаты и сколько длится процесс.
İş axtarır, CV hazırlayır, vakansiyalara müraciət edir.|Looks for work, builds a CV and applies to vacancies.|Ищет работу, готовит резюме и откликается на вакансии.
İlk addımlar: hesab və profil|First steps: account and profile|Первые шаги: аккаунт и профиль
Qeydiyyatdan keçin (e-poçt və şifrə) və «Namizəd» rolunu seçin.|Register (e-mail and password) and choose the “Candidate” role.|Зарегистрируйтесь (e-mail и пароль) и выберите роль «Кандидат».
Profil nə qədər dolu olsa, uyğunluq balı bir o qədər dəqiq olur.|The fuller the profile, the more accurate the match score.|Чем полнее профиль, тем точнее оценка соответствия.
Vakansiyalar siyahısı sizə uyğunluq balı ilə sıralanır.|The vacancy list is sorted for you by match score.|Список вакансий сортируется по оценке соответствия.
«Şirkətlər» bölməsində şirkətin profilinə və rəylərə baxın.|In “Companies” see the company profile and reviews.|В разделе «Компании» смотрите профиль компании и отзывы.
Müraciət etmək və izləmək|Applying and tracking|Отклик и отслеживание
Müraciətin hər mərhələsini bir yerdə izləyirsiniz.|You track every stage of an application in one place.|Вы отслеживаете каждый этап отклика в одном месте.
Təklif məktubu gələndə oxuyun və qəbul və ya rədd edin.|When an offer letter arrives, read it and accept or decline.|Когда придёт предложение, прочитайте и примите или отклоните его.
AI köməkçi və CV-ni vakansiyaya uyğunlaşdırmaq|AI assistant and tailoring the CV to a vacancy|ИИ-помощник и адаптация резюме под вакансию
Mesajlar, kalkulyatorlar və dəstək|Messages, calculators and support|Сообщения, калькуляторы и поддержка
İşəgötürənlə yazışma, əmək haqqı hesabı və kömək.|Chat with the employer, salary calculation and help.|Переписка с работодателем, расчёт зарплаты и помощь.
«Mesajlar» bölməsində işəgötürənlərlə yazışın, fayl göndərin.|In “Messages” write to employers and send files.|В разделе «Сообщения» переписывайтесь с работодателями и отправляйте файлы.
Sual və ya problem üçün «Dəstək» bölməsindən müraciət yazın.|For a question or problem, write a request in “Support”.|По вопросу или проблеме напишите обращение в «Поддержку».
İşçilər, əmrlər, əmək haqqı, davamiyyət, plan və komanda ilə işləyir.|Works with employees, orders, payroll, attendance, plan and team.|Работает с сотрудниками, приказами, зарплатой, посещаемостью, планом и командой.
Hər işçinin tək kartı: məlumat, maaş, məzuniyyət, sənəd, əmr.|One card per employee: data, salary, vacation, documents, orders.|Одна карточка на сотрудника: данные, зарплата, отпуск, документы, приказы.
İşçi profili kodunu göndərin: işçi öz «İş yerim»inə qoşulur.|Send the employee profile code: the employee joins their “My workplace”.|Отправьте код профиля сотрудника: сотрудник подключается к своему «Рабочему месту».
İşçi ərizələri ayrıca nişdə gəlir: ərizədən birbaşa əmr hazırlayın.|Employee applications come in a separate tab: prepare an order straight from an application.|Заявления сотрудников приходят на отдельной вкладке: готовьте приказ прямо из заявления.
Məzuniyyət qrafiki, sənədlər, işdən çıxma, əmlak, davamiyyət cədvəli.|Vacation schedule, documents, offboarding, property, attendance table.|График отпусков, документы, увольнение, имущество, табель.
Performans, bacarıq, təlim, növbə, ezamiyyət, elanlar və sorğular.|Performance, skills, training, shifts, business trips, announcements and surveys.|Оценка, навыки, обучение, смены, командировки, объявления и опросы.
Cari paketi, hesab-fakturaları, ödənişləri və qalıq borcu görün.|See the current plan, invoices, payments and outstanding debt.|Смотрите текущий пакет, счета-фактуры, платежи и остаток долга.
Faktura və ödəniş siyahısını Excel faylı kimi yükləyin.|Download the invoice and payment list as an Excel file.|Скачайте список счетов и платежей как файл Excel.
Əvvəlki ay|Previous month|Предыдущий месяц
Növbəti ay|Next month|Следующий месяц
Sorğu|Request|Запрос
Status: Müsahibə|Status: Interview|Статус: Собеседование
Ödəniş tezliklə aktiv olacaq|Payment will be active soon|Оплата скоро будет доступна
(əlavə olunmuş)|(added)|(добавлено)
boşdursa minimumla eyni|if empty, same as the minimum|если пусто — как минимум
Vakansiya HR və direktor təsdiqi olmadan dərc olunur.|A vacancy is published without HR and director approval.|Вакансия публикуется без подтверждения HR и директора.
Vakansiya və sorğuları HR mərhələsində təsdiqləmək|Approve vacancies and requests at the HR step|Подтверждать вакансии и запросы на этапе HR
Testlər (yaratmaq, göndərmək, nəticələr, test faylı)|Tests (create, send, results, test file)|Тесты (создание, отправка, результаты, файл теста)
İşəgötürən testləri ilə tam iş.|Full work with employer tests.|Полная работа с тестами работодателя.
İşçi kartları (əlavə, düzəliş, Excel idxalı, silmə)|Employee cards (add, edit, Excel import, delete)|Карточки сотрудников (добавление, правка, импорт Excel, удаление)
Əmr yaradır, imzaya göndərir, reyestri idarə edir.|Creates orders, sends them for signing, manages the registry.|Создаёт приказы, отправляет на подпись, ведёт реестр.
İşçilərin gününü qeyd edir, şirkət təqvimini dəyişir.|Marks employees' days, changes the company calendar.|Отмечает дни сотрудников, меняет календарь компании.
Müqavilə, əmr və vəsiqə kimi sənədləri yükləyir və açır.|Uploads and opens documents such as contracts, orders and ID.|Загружает и открывает документы: договоры, приказы, удостоверения.
Şəxsiyyət vəsiqəsi, FİN, ünvan, IBAN və ailə məlumatları.|ID card, FIN, address, IBAN and family data.|Удостоверение личности, FIN, адрес, IBAN и семейные данные.
Şirkət profilini və doğrulama sənədlərini dəyişir.|Changes the company profile and verification documents.|Меняет профиль компании и документы верификации.
aylıq|monthly|ежемесячно
İş yerinizi hesabınıza qoşmaq|Linking your workplace to your account|Подключение места работы к аккаунту
Şirkətin HR-ı sizə işçi profili kodu göndərir.|The company's HR sends you an employee profile code.|HR компании присылает вам код профиля сотрудника.
Kodun müddəti məhduddur; bitibsə HR-dan yenisini istəyin.|The code is time-limited; if it expired, ask HR for a new one.|Код действует ограниченное время; если истёк, попросите у HR новый.
Hər ayın əmək haqqı hesablamasını və ödənişləri görürsünüz.|You see each month's payroll calculation and payments.|Вы видите расчёт зарплаты и выплаты за каждый месяц.
Vərəqəni çap edə və ya PDF kimi saxlaya bilərsiniz.|You can print the slip or save it as PDF.|Листок можно распечатать или сохранить как PDF.
Məzuniyyət, ərizələr və məlumatların dəyişdirilməsi|Vacation, applications and changing your data|Отпуск, заявления и изменение данных
HR-a yazılı ərizəni platformadan göndərirsiniz.|You send a written application to HR through the platform.|Вы отправляете письменное заявление в HR через платформу.
Rəhbərinizin təsdiqi lazım olan ərizələr əvvəl rəhbərə gedir.|Applications needing your manager's approval go to the manager first.|Заявления, требующие подтверждения руководителя, сначала идут к нему.
Performans, bacarıq, növbə və təlimatlar|Performance, skills, shifts and instructions|Оценка, навыки, смены и инструкции
Şirkət bunları aktivləşdirəndə hesabınızda görürsünüz.|You see these in your account when the company activates them.|Вы увидите это в аккаунте, когда компания их включит.
Bacarıq matrisində bacarıqlarınızı və səviyyənizi görürsünüz.|In the skills matrix you see your skills and level.|В матрице навыков вы видите свои навыки и уровень.
Səhifədəkilərin hamısını seç|Select all on the page|Выбрать всё на странице
İyn|Jun|Июн
İyl|Jul|Июл
Novruz bayramı / Ramazan bayramı|Novruz / Ramadan holiday|Новруз / Рамазан байрам
İşçinin departament, şöbə, vəzifə və maaşı ilə yeni ştat sətri açılır|A new staff line is opened with the employee's department, section, position and salary|Открывается новая штатная строка с департаментом, отделом, должностью и зарплатой сотрудника
Test səbəbi|Test reason|Тестовая причина
Xəta|Error|Ошибка
Əvvəlki 12 ayın əmək haqqı (bir rəqəm = hər ay; və ya vergüllə)|Salary of the previous 12 months (one number = every month; or comma-separated)|Зарплата за предыдущие 12 месяцев (одно число = каждый месяц; или через запятую)
Bir günlük (÷ 30,4)|One day (÷ 30.4)|За один день (÷ 30,4)
Son 12 ayın əmək haqqı (bir rəqəm = hər ay)|Salary of the last 12 months (one number = every month)|Зарплата за последние 12 месяцев (одно число = каждый месяц)
Sonuncu gündən aşağı olmasın (177.3-1)|Must not be below the last day (177.3-1)|Не ниже последнего дня (177.3-1)
Əmək məzuniyyəti pulu bu qayda ilə yox, 140-cı maddə ilə hesablanır.|Vacation pay is calculated under article 140, not by this rule.|Отпускные рассчитываются по статье 140, а не по этому правилу.
Əməyin ödənilməsinə aid bütün ödənclər nəzərə alınır (177.4).|All payments related to remuneration are counted (177.4).|Учитываются все выплаты, относящиеся к оплате труда (177.4).
Ştatların / işçi sayının ixtisarı|Reduction of positions / headcount|Сокращение штатов / численности
Ərizə tarixi (işçi təşəbbüsü ilə)|Application date (at the employee's initiative)|Дата заявления (по инициативе работника)
azı 4 təqvim həftəsi|at least 4 calendar weeks|не менее 4 календарных недель
Xəbərdarlıq əvəzi birdəfəlik ödəniş (işçinin razılığı ilə)|Lump sum instead of notice (with the employee's consent)|Единовременная выплата вместо уведомления (с согласия работника)
Qeyd: 77.3 məbləği 'azı' ifadəsi ilə verir — bu, qanundakı minimumdur.|Note: 77.3 gives the amount with “at least”: this is the legal minimum.|Примечание: ст. 77.3 указывает сумму словами «не менее»: это минимум по закону.
Son ayın işlənmiş günlərinin maaşı|Pay for the days worked in the last month|Оплата отработанных дней последнего месяца
Sosial, işsizlik və tibbi sığorta (işçi)|Social, unemployment and medical insurance (employee)|Социальное, по безработице и медицинское страхование (работник)
İşdənçıxarma müavinəti (vergisiz)|Severance pay (tax-free)|Выходное пособие (без налога)
Hamiləlik və doğuş məzuniyyəti və müavinəti|Pregnancy and maternity leave and benefit|Отпуск и пособие по беременности и родам
Kənd təsərrüfatı istehsalında çalışır|Works in agricultural production|Работает в сельскохозяйственном производстве
Xəstəlik (müvəqqəti əmək qabiliyyətsizliyi) müavinəti|Sickness (temporary incapacity) benefit|Пособие по болезни (временной нетрудоспособности)
Bir günlük orta (÷ 30,4)|Average per day (÷ 30.4)|Среднее за день (÷ 30,4)
Sosial Sığorta Qanunu, md. 6, 15, 17|Social Insurance Law, art. 6, 15, 17|Закон о социальном страховании, ст. 6, 15, 17
İş aylıq norma çərçivəsindədir|The work is within the monthly norm|Работа в рамках месячной нормы
Tarif (vəzifə) maaşı — boşdayanma|Tariff (position) pay — downtime|Тарифная (должностная) ставка — простой
İstirahət/bayram günü işi (maaşa əlavə)|Rest/holiday day work (added to pay)|Работа в выходной/праздник (доплата к зарплате)
Artıq iş əlavə istirahət günü ilə əvəz edilə bilməz (165.3).|Overtime cannot be replaced by an extra rest day (165.3).|Сверхурочную работу нельзя заменить дополнительным днём отдыха (165.3).
Aliment, sağlamlığa/cinayət zərəri (70%)|Alimony, harm to health / crime damage (70%)|Алименты, вред здоровью / ущерб от преступления (70%)
Aylıq maaş|Monthly salary|Месячная зарплата
Əmək haqqından tutulmalar yalnız 175-ci maddədəki hallarda mümkündür.|Deductions from salary are possible only in the cases of article 175.|Удержания из зарплаты возможны только в случаях, указанных в статье 175.
İşdənçıxarma müavinətindən tutulma olmaz (175.4).|No deductions from severance pay (175.4).|Из выходного пособия удержания не производятся (175.4).
ƏDV, sadələşdirilmiş vergi, sahibkar gəlir vergisi|VAT, simplified tax, entrepreneur income tax|НДС, упрощённый налог, подоходный налог предпринимателя
Məbləğ (ƏDV üçün)|Amount (for VAT)|Сумма (для НДС)
Məbləğin içindən ayır|Extract from the amount|Выделить из суммы
Məbləğin üstünə əlavə et|Add on top of the amount|Добавить к сумме
Dövriyyə / vergiyə cəlb olunan gəlir|Turnover / taxable income|Оборот / облагаемый доход
Sadələşdirilmiş vergi dərəcəsi (%)|Simplified tax rate (%)|Ставка упрощённого налога (%)
ƏDV-siz məbləğ|Amount without VAT|Сумма без НДС
ƏDV (18%)|VAT (18%)|НДС (18%)
ƏDV-li məbləğ|Amount with VAT|Сумма с НДС
Sadələşdirilmiş vergi|Simplified tax|Упрощённый налог
Sahibkar gəlir vergisi (20%)|Entrepreneur income tax (20%)|Подоходный налог предпринимателя (20%)
: departament, vəzifə, say və maaş həddi (öz təsdiq qaydası ilə).|: department, position, number and salary limit (with its own approval procedure).|: департамент, должность, количество и предел зарплаты (со своим порядком подтверждения).
: əmək haqqı, təlim və bütün HR xərc növləri, departament və ay üzrə.|: payroll, training and all HR expense types, by department and month.|: зарплата, обучение и все виды расходов HR, по департаментам и месяцам.
Əmrlər bölməsi|Orders section|Раздел приказов
Ərizənin növü|Application type|Тип заявления
İllik əmək məzuniyyəti ərizəsi|Annual leave application|Заявление на ежегодный отпуск
Bank hesabı (IBAN) və ya kart yoxdur: bank sənədinə düşməyəcək.|No bank account (IBAN) or card: will not be included in the bank document.|Нет банковского счёта (IBAN) или карты: не попадёт в банковский документ.
Status: Uyğun deyil|Status: Not a match|Статус: Не подходит
(bu gün)|(today)|(сегодня)
· limit qoyulmayıb|· no limit set|· лимит не задан
Müsahibəyə dəvət|Interview invitation|Приглашение на собеседование
Aylıq limit (dollar, 0 = yoxdur)|Monthly limit (dollars, 0 = none)|Месячный лимит (доллары, 0 = нет)
Namizəd: sırala|Candidate: sort|Кандидат: сортировать
Təcrübə: sırala|Experience: sort|Опыт: сортировать
Uyğunluq: sırala|Match: sort|Соответствие: сортировать
Əməliyyatlar|Actions|Действия
məs. Mühasib|e.g. Accountant|напр. Бухгалтер
məs. yeni layihə, iş yükü artıb, əvəzetmə|e.g. new project, increased workload, replacement|напр. новый проект, рост нагрузки, замещение
Təsdiq zəncirinin son pilləsi, ştat planının təsdiqi.|Last step of the approval chain, approval of the staff plan.|Последняя ступень цепочки подтверждения, утверждение штатного плана.
Rekruter + testləri yaradır, göndərir və nəticələri görür|Recruiter + creates and sends tests and sees results|Рекрутер + создаёт и отправляет тесты, видит результаты
Şöbə rəhbəri + hesabatları Excel-ə ixrac edir|Department head + exports reports to Excel|Руководитель отдела + экспортирует отчёты в Excel
Rekruter + testlər və hesabatlar|Recruiter + tests and reports|Рекрутер + тесты и отчёты
Şöbə rəhbəri + namizədlərə test göndərir|Department head + sends tests to candidates|Руководитель отдела + отправляет тесты кандидатам
Şöbə rəhbəri + davamiyyət cədvəlini və təqvimi aparır|Department head + keeps the timesheet and calendar|Руководитель отдела + ведёт табель и календарь
Rekruter + əmrlər reyestri və işçi sənəd qovluğu|Recruiter + orders registry and employee document folder|Рекрутер + реестр приказов и папка документов сотрудника
Şöbə rəhbəri + maaşlar, hesabatlar və davamiyyət|Department head + salaries, reports and attendance|Руководитель отдела + зарплаты, отчёты и посещаемость
% tamamlanıb.|% completed.|% завершено.
Hələ şəkil əlavə edilməyib.|No picture added yet.|Фото ещё не добавлено.
qoyulmayıb|not set|не задано
Qalereyaya şəkil əlavə et|Add a picture to the gallery|Добавить фото в галерею
Təklif, maaş, çıxarma, ştat|Offer, salary, removal, staffing|Предложение, зарплата, удаление, штат
Təfərrüatı görmək üçün siyahıdan vakansiyanı seçin.|Pick a vacancy from the list to see the details.|Выберите вакансию из списка, чтобы увидеть детали.
işçi ərizəsi cavab gözləyir →|an employee application awaits a reply →|заявление сотрудника ждёт ответа →
Təsdiq bölmələri|Approval sections|Разделы подтверждений
İşçilərin tövsiyə etdiyi namizədlər, vəziyyəti və bonusları.|Candidates recommended by employees, their status and bonuses.|Кандидаты, рекомендованные сотрудниками, их статус и бонусы.
Namizədlərin rəy verənləri və nəticələri.|Candidates' referees and their results.|Рекомендатели кандидатов и результаты.
İşə qəbul, ayrılma, işçi sayı və dövriyyə faizi; dövr üzrə süzgəc.|Hires, departures, headcount and turnover rate; filter by period.|Найм, увольнения, численность и текучесть; фильтр по периоду.
İşçilərin məzuniyyət hüququ, qalığı və planlaşdırılmış günləri.|Employees' vacation entitlement, balance and planned days.|Право на отпуск, остаток и запланированные дни сотрудников.
İl üzrə təlimlər, xərc, saat, iştirakçı sayı və büdcə qalığı.|Training by year: cost, hours, participants and budget balance.|Обучение за год: расходы, часы, число участников и остаток бюджета.
İşçi sorğuları, cavab sayı, eNPS və orta qiymətlər.|Employee surveys, response count, eNPS and average scores.|Опросы сотрудников, число ответов, eNPS и средние оценки.
Sətir|Row|Строка
Şirkət əməliyyat jurnalı (tam)|Company activity log (full)|Журнал операций компании (полный)
Vakansiyanı necə yaradım?|How do I create a vacancy?|Как создать вакансию?
Komandaya üzvü necə dəvət edim?|How do I invite a team member?|Как пригласить участника в команду?
Namizədə testi necə göndərim?|How do I send a test to a candidate?|Как отправить тест кандидату?
İş təklifi nə vaxt göndərilə bilər?|When can a job offer be sent?|Когда можно отправить предложение о работе?
Şirkətim niyə “Təsdiqlənməyib”?|Why is my company “Not verified”?|Почему моя компания «Не подтверждена»?
Hesab silinəndə nə olur?|What happens when an account is deleted?|Что происходит при удалении аккаунта?
Bu gün nə etməli|What to do today|Что сделать сегодня
İşçi sayı dinamikası|Headcount trend|Динамика численности
Şöbələr üzrə işçilər|Employees by section|Сотрудники по отделам
. Maaşlar yalnız HR, direktor və hesab sahibinə görünür.|. Salaries are visible only to HR, the director and the account owner.|. Зарплаты видны только HR, директору и владельцу аккаунта.
Sınaq 14 gün ərzində bitir|Probation ends within 14 days|Испытательный срок заканчивается в течение 14 дней
Müqavilə 30 gün ərzində bitir|Contract ends within 30 days|Договор заканчивается в течение 30 дней
İşçilər bölməsi|Employees section|Раздел сотрудников
Ad, vəzifə, departament və ya şöbə|Name, position, department or section|Имя, должность, департамент или отдел
Əmək məzuniyyətinin uzadılması haqqında əmr (xəstəlik, bayram günləri)|Order on extending leave (illness, holidays)|Приказ о продлении отпуска (болезнь, праздничные дни)
İntizam tənbehi|Disciplinary penalty|Дисциплинарное взыскание
İmza gözləyir: Direktor|Awaiting signature: Director|Ожидает подписи: Директор
Əmək haqqının dəyişdirilməsi|Salary change|Изменение зарплаты
İş rejiminin dəyişdirilməsi|Change of work mode|Изменение режима работы
Əmək müqaviləsinin müddətinin uzadılması|Extension of the employment contract|Продление срока трудового договора
+ Məzuniyyət planla|+ Plan a vacation|+ Запланировать отпуск
işçi təklifləri daxildir|employee proposals included|включены предложения сотрудников
qrafikə daxil edilməyib|not included in the schedule|не включён в график
Departament üzrə yük (ayda məzuniyyətdə olan işçi sayı)|Load by department (employees on vacation per month)|Нагрузка по департаментам (число сотрудников в отпуске в месяц)
Hələ dövr yoxdur. “Yeni dövr” ilə başlayın.|No period yet. Start with “New period”.|Периодов пока нет. Начните с «Нового периода».
Bu ayın davamiyyəti kilidlidir (|This month's attendance is locked (|Посещаемость этого месяца заблокирована (
: Əmək haqqı təsdiqləndi|: Payroll approved|: Зарплата подтверждена
ayının qeyri-iş günləri və şirkət təqvimi|non-working days of the month and the company calendar|нерабочие дни месяца и календарь компании
istirahət|rest|выходной
Beynəlxalq Qadınlar günü|International Women's Day|Международный женский день
Beynəlxalq Qadınlar günü (iş günü köçürülüb)|International Women's Day (working day moved)|Международный женский день (рабочий день перенесён)
Faşizm üzərində Qələbə günü|Victory over Fascism Day|День Победы над фашизмом
Faşizm üzərində Qələbə günü (iş günü köçürülüb)|Victory over Fascism Day (working day moved)|День Победы над фашизмом (рабочий день перенесён)
Qurban bayramı|Eid al-Adha|Курбан-байрам
Müstəqillik günü / Qurban bayramı|Independence Day / Eid al-Adha|День независимости / Курбан-байрам
Qurban bayramı (iş günü köçürülüb)|Eid al-Adha (working day moved)|Курбан-байрам (рабочий день перенесён)
Milli Qurtuluş günü|National Salvation Day|День национального спасения
Silahlı Qüvvələr günü|Armed Forces Day|День вооружённых сил
Dünya Azərbaycanlılarının Həmrəyliyi günü|World Azerbaijanis Solidarity Day|День солидарности азербайджанцев мира
Əvvəlki il|Previous year|Предыдущий год
Növbəti il|Next year|Следующий год
Hesablanıb (gross)|Accrued (gross)|Начислено (gross)
— əvvəl departamenti seçin —|— pick a department first —|— сначала выберите департамент —
＋ Vəzifə əlavə et…|＋ Add a position…|＋ Добавить должность…
Boş|Vacant|Свободно
sətir: ştat cədvəlində dəyişin|line: change it in the staff schedule|строка: измените в штатном расписании
Baş ofis (boş buraxın)|Head office (leave empty)|Головной офис (оставьте пустым)
Ştat sətri|Staff line|Штатная строка
işləyir|working|работает
Filial ştat cədvəlinin «Departament və şöbələr» bölməsində yaradılır.|A branch is created in the “Departments and sections” part of the staff schedule.|Филиал создаётся в разделе «Департаменты и отделы» штатного расписания.
İlk addımlar|First steps|Первые шаги
Başla|Start|Начать
Filtrlər|Filters|Фильтры
bu gün|today|сегодня
Gross/net göstərilməyib|Gross/net not specified|Gross/net не указано
Vəzifə (1-ci istinad)|Position (reference 1)|Должность (рекомендатель 1)
Şirkət (1-ci istinad)|Company (reference 1)|Компания (рекомендатель 1)
Telefon və ya e-poçt (1-ci istinad)|Phone or e-mail (reference 1)|Телефон или e-mail (рекомендатель 1)
Vəzifə (2-ci istinad)|Position (reference 2)|Должность (рекомендатель 2)
Şirkət (2-ci istinad)|Company (reference 2)|Компания (рекомендатель 2)
Telefon və ya e-poçt (2-ci istinad)|Phone or e-mail (reference 2)|Телефон или e-mail (рекомендатель 2)
Status: İşə qəbul edildi|Status: Hired|Статус: Принят на работу
Əlavə əmək məzuniyyəti ərizəsi|Additional leave application|Заявление на дополнительный отпуск
Yaradıcılıq məzuniyyəti ərizəsi|Creative leave application|Заявление на творческий отпуск
Təhsil məzuniyyəti ərizəsi|Study leave application|Заявление на учебный отпуск
Ödənişsiz məzuniyyət ərizəsi|Unpaid leave application|Заявление на неоплачиваемый отпуск
Uşağa qulluq məzuniyyəti ərizəsi|Childcare leave application|Заявление на отпуск по уходу за ребёнком
Hamiləlik və doğuş məzuniyyəti ərizəsi|Maternity leave application|Заявление на отпуск по беременности и родам
Atalıq məzuniyyəti ərizəsi|Paternity leave application|Заявление на отпуск отца
Məzuniyyətin başqa vaxta keçirilməsi ərizəsi|Application to postpone leave|Заявление о переносе отпуска
Məzuniyyətin uzadılması ərizəsi|Leave extension application|Заявление о продлении отпуска
Donor günü ərizəsi|Donor day application|Заявление на день донора
Tibbi müayinə üçün icazə ərizəsi|Medical check-up permission application|Заявление на освобождение для медосмотра
Uzaqdan işləmə ərizəsi|Remote work application|Заявление на удалённую работу
İş rejiminin dəyişdirilməsi (natamam iş vaxtı) ərizəsi|Application to change the work mode (part-time)|Заявление об изменении режима работы (неполное время)
Ad və ya soyadın dəyişdirilməsi ərizəsi|Application to change a name or surname|Заявление об изменении имени или фамилии
İstefa (əmək müqaviləsinə xitam) ərizəsi|Resignation (termination of the employment contract) application|Заявление об увольнении (прекращении трудового договора)
Digər ərizə və ya müraciət (cavab tələb edir)|Other application or request (needs a reply)|Другое заявление или обращение (требует ответа)
Əsas (arayış, sənəd nömrəsi — varsa)|Basis (certificate, document number — if any)|Основание (справка, номер документа — если есть)
Qeyd və ya səbəb|Note or reason|Примечание или причина
Şirkətə göndər|Send to the company|Отправить в компанию
Yazışmalar reyestri|Correspondence registry|Реестр переписки
Ərizə|Application|Заявление
Şirkətin cavabı|The company's reply|Ответ компании
Hələ ərizə yazmamısınız.|You have not written any application yet.|Вы ещё не писали заявлений.
İşəgötürənə neçəyə başa gəlir? Super-gross necə yaranır?|What does it cost the employer? How is super-gross made up?|Во сколько это обходится работодателю? Из чего складывается super-gross?
Super-gross işəgötürənin bir işçiyə ayda ödədiyi|Super-gross is what the employer pays for one employee a month|Super-gross — это то, что работодатель платит за одного сотрудника в месяц
ümumi xərcdir|the total cost|общие расходы
İşçinin maaşı vergi və işçi ayırmalarından əvvəl.|The employee's pay before tax and employee deductions.|Зарплата сотрудника до налога и удержаний.
Bütün maaşdan 0,5%.|0.5% of the whole salary.|0,5% от всей зарплаты.
İşəgötürən paylarının cəmi gross maaşın|The employer contributions add up to|Сумма взносов работодателя составляет
%-i qədərdir.|% of the gross salary.|% от gross-зарплаты.
Super-gross necə yaranır|How super-gross is made up|Как формируется super-gross
· yenilənir:|· renewed:|· обновляется:
Başqa|Other|Другое
Ölkə|Country|Страна
Kataloqları, istifadəçiləri, ödənişləri və dəstəyi idarə edir.|Manages catalogues, users, payments and support.|Управляет каталогами, пользователями, платежами и поддержкой.
Vahid siyahılar bütün istifadəçilər üçün eyni adları təmin edir.|Shared lists give all users the same names.|Единые списки обеспечивают одинаковые названия для всех пользователей.
«Kataloq yoxlaması» təkrar və səhv yazılmış qeydləri tapır.|“Catalogue check” finds duplicate and misspelled entries.|«Проверка каталога» находит повторяющиеся и ошибочные записи.
İstifadəçilər, ödənişlər və dəstək|Users, payments and support|Пользователи, платежи и поддержка
Platformanın gündəlik idarəsi.|Day-to-day management of the platform.|Ежедневное управление платформой.
«Platforma icmalı»nda əsas göstəricilərə baxın.|See the key indicators in “Platform overview”.|Смотрите основные показатели в «Обзоре платформы».
«Sorğular və mesajlar»da istifadəçi sorğularına cavab verin.|Answer user requests in “Requests and messages”.|Отвечайте на запросы пользователей в «Запросах и сообщениях».
Uyğunluq balı və istehsalat təqvimi|Match score and production calendar|Оценка соответствия и производственный календарь
Namizəd-vakansiya uyğunluğu və iş günləri.|Candidate–vacancy match and working days.|Соответствие кандидата вакансии и рабочие дни.
Bu ay:|This month:|В этом месяце:
müraciət ·|applications ·|откликов ·
Həftə|Week|Неделя
Müraciətlər həftələr üzrə|Applications by week|Заявки по неделям
İşçilərin staj paylanması|Distribution of employees by length of service|Распределение сотрудников по стажу
Vəzifə, şəhər, kateqoriya axtar|Search position, city, category|Поиск по должности, городу, категории
Təsdiq mərhələləri|Approval stages|Этапы подтверждения
Texniki rəhbər|Technical lead|Технический руководитель
Çər.|Wed|Ср
Cümə|Fri|Пт
Şən.|Sat|Сб
Müsahibə cədvəli|Interview schedule|Расписание собеседований
Əvvəlki həftə|Previous week|Предыдущая неделя
Növbəti həftə|Next week|Следующая неделя
Vakansiya üzrə cədvəl|Schedule by vacancy|Расписание по вакансиям
İştirakçı üzrə cədvəl|Schedule by participant|Расписание по участникам
müraciətdən|from application|с момента заявки
Maaş gözləntisi uyğun gəlmir|Salary expectation does not match|Зарплатные ожидания не совпадают
Tələb olunan təcrübə çatmır|The required experience is missing|Не хватает требуемого опыта
Açıq|Open|Открыто
Hərəkətsiz|Inactive|Без движения
Dayanma həddi|Stall threshold|Порог простоя
Bütün yazışmalar|All conversations|Вся переписка
Tap və yaz|Find and write|Найти и написать
Namizəd kodu ilə yaz: JM-XXXXX-XXXXX|Write by candidate code: JM-XXXXX-XXXXX|Написать по коду кандидата: JM-XXXXX-XXXXX
Namizəd kodu|Candidate code|Код кандидата
KADR ƏMƏLİYYATLARI|HR OPERATIONS|КАДРОВЫЕ ОПЕРАЦИИ
Kollektivinizi idarə edin.|Manage your team.|Управляйте коллективом.
İşçilər, əmrlər, əmək haqqı və davamiyyət bir yerdə.|Employees, orders, payroll and attendance in one place.|Сотрудники, приказы, зарплата и посещаемость в одном месте.
Aktiv işçi|Active employee|Активный сотрудник
nəfər bu gün yoxdur|people are absent today|чел. сегодня отсутствуют
İşə qəbul (30 gün)|Hires (30 days)|Найм (30 дней)
nəfər çıxıb|people left|чел. ушло
Gözləyən əmr və ərizə|Pending orders and applications|Ожидающие приказы и заявления
ərizə|application|заявление
əmək haqqı|payroll|зарплата
ödəniş günü|pay day|день выплаты
iş|work|работа
İşçi ərizəsi cavab gözləyir|An employee application awaits a reply|Заявление сотрудника ждёт ответа
Ezamiyyət sorğusu HR qərarını gözləyir|A business trip request awaits an HR decision|Запрос на командировку ждёт решения HR
Direktor/HR təsdiqi gözləyən sorğu|A request awaiting director/HR approval|Запрос, ожидающий подтверждения директора/HR
Ştatda yeri olmayan işçi|Employee without a place in the staff plan|Сотрудник без места в штате
Boş ştat yeri var, vakansiya açılmayıb|There is a vacant staff place but no vacancy is open|Есть свободное место в штате, но вакансия не открыта
Plandan kənar sorğu və ya departament təklifi gözləyir|An out-of-plan request or department proposal is waiting|Ожидает внеплановый запрос или предложение департамента
Müddətlər|Deadlines|Сроки
Yaxın 30 gündə bitən müqavilə, sınaq müddəti və ya sənəd yoxdur.|No contract, probation or document expires in the next 30 days.|В ближайшие 30 дней ни один договор, испытательный срок или документ не истекает.
çıxış|exit|выход
Qəbul|Hire|Приём
Bu gün yoxda olanlar|Absent today|Отсутствующие сегодня
Hamı işdədir.|Everyone is at work.|Все на работе.
Yaxın 14 gün məzuniyyət|Vacations in the next 14 days|Отпуска в ближайшие 14 дней
Planlaşdırılmış məzuniyyət yoxdur.|No vacation is planned.|Запланированных отпусков нет.
İşçilərə keç|Go to employees|Перейти к сотрудникам
Şöbəsiz|No section|Без отдела
İşçi kartları|Employee cards|Карточки сотрудников
Sənəd və müqavilə müddətləri|Document and contract deadlines|Сроки документов и договоров
Ay sonu işçi sayı|Month-end headcount|Численность на конец месяца
Qısa yollar|Shortcuts|Быстрые ссылки
Yalnız gözləyənlər|Pending only|Только ожидающие
Ərizə qeyd et|Record an application|Зарегистрировать заявление
ərizə cavablandırılıb|application answered|заявление обработано
; gözləyən|; pending|; ожидает
Ərizə tarixi|Application date|Дата заявления
Səbəb|Reason|Причина
İllik məzuniyyət qrafikinə əsasən|Based on the annual vacation schedule|На основании годового графика отпусков
Əmr yarat|Create an order|Создать приказ
Süzgəc|Filter|Фильтр
Bütün növlər|All types|Все типы
Əmr|Order|Приказ
Şəxsiyyət sənədi|ID document|Документ, удостоверяющий личность
Təhsil və sertifikat|Education and certificate|Образование и сертификат
Tibbi sənəd|Medical document|Медицинский документ
Müddətləri Excel-dən yüklə|Import deadlines from Excel|Загрузить сроки из Excel
Nömrə / tarix|Number / date|Номер / дата
İşçi, sənəd və ya nömrə|Employee, document or number|Сотрудник, документ или номер
Çıxış prosesi başlat: işçi seçin|Start offboarding: pick an employee|Начать процесс увольнения: выберите сотрудника
Başlat|Start|Начать
ümumi dəyər|total value|общая стоимость
İşçilərdə|With employees|У сотрудников
təhvil-təslim aktı ilə|with a handover act|по акту приёма-передачи
Anbarda / təmirdə|In storage / repair|На складе / в ремонте
+ Əmlak əlavə et|+ Add property|+ Добавить имущество
Nömrələr|Numbers|Номера
Dəyər|Value|Стоимость
Əmlak yoxdur. “Əmlak əlavə et” və ya Excel-dən yükləyin.|No property. Use “Add property” or import from Excel.|Имущества нет. Нажмите «Добавить имущество» или загрузите из Excel.
Ad, seriya, inventar nömrəsi və ya işçi|Name, series, inventory number or employee|Название, серия, инвентарный номер или сотрудник
Şirkət → departament → şöbə → işçi.|Company → department → section → employee.|Компания → департамент → отдел → сотрудник.
işçi,|employees,|сотрудников,
departament. Departamentin düyməsi ilə qolu yığıb aça bilərsiniz.|departments. You can collapse and expand a branch with the department's button.|департаментов. Кнопкой департамента можно свернуть и развернуть ветку.
Bütün şirkət|Whole company|Вся компания
Mətn variantı (siyahı)|Text version (list)|Текстовый вариант (список)
Sxemi böyüt və ya kiçilt|Zoom the chart in or out|Увеличить или уменьшить схему
Pəncərəyə sığdır|Fit to window|Вписать в окно
Departamentsiz: yığ|No department: collapse|Без департамента: свернуть
Maliyyə: yığ|Finance: collapse|Финансы: свернуть
Satış: yığ|Sales: collapse|Продажи: свернуть
Tövsiyə edən|Referrer|Рекомендующий
Hələ tövsiyə yoxdur.|No referrals yet.|Рекомендаций пока нет.
+ Rəy verən əlavə et|+ Add a referee|+ Добавить рекомендателя
Rəy verən|Referee|Рекомендатель
Rəy yoxlaması yoxdur.|No reference check.|Проверки отзывов нет.
İşçilərə göstər və həmin gün təbrik göndər|Show to colleagues and send a greeting that day|Показывать коллегам и отправлять поздравление в этот день
Tibbi baxış|Medical examination|Медицинский осмотр
Qəza / hadisə|Accident / incident|Несчастный случай / происшествие
Yalnız seçilənlər|Selected only|Только выбранные
Giriş təlimatı|Induction briefing|Вводный инструктаж
İş yerində ilkin təlimat|Initial on-the-job briefing|Первичный инструктаж на рабочем месте
Təkrar təlimat|Repeat briefing|Повторный инструктаж
Növbədənkənar təlimat|Unscheduled briefing|Внеплановый инструктаж
Təlimatı keçən şəxs|Person who gave the briefing|Проводивший инструктаж
Növbəti təlimat (boşdursa 6 ay sonra)|Next briefing (6 months later if empty)|Следующий инструктаж (если пусто — через 6 месяцев)
İşçi jurnalda imzalayıb|The employee signed the log|Сотрудник расписался в журнале
Yeni sənəd|New document|Новый документ
Daxili əmək qaydaları|Internal labour rules|Правила внутреннего трудового распорядка
Şəxsi məlumatların işlənməsinə razılıq|Consent to personal data processing|Согласие на обработку персональных данных
Şəxsi məlumatların qorunması siyasəti|Personal data protection policy|Политика защиты персональных данных
Vəzifə təlimatı|Job description|Должностная инструкция
Hələ sənəd yoxdur. Yuxarıdakı nümunələrdən birini seçin.|No document yet. Pick one of the samples above.|Документов пока нет. Выберите один из образцов выше.
Sənəd qrupu|Document group|Группа документов
Şəxsi işlər və əmək müqavilələri|Personal files and employment contracts|Личные дела и трудовые договоры
Kadr əmrləri (qəbul, köçürmə, xitam)|HR orders (hiring, transfer, termination)|Кадровые приказы (приём, перевод, увольнение)
Məzuniyyət və icazə əmrləri|Vacation and leave orders|Приказы об отпусках и отгулах
Tabel və davamiyyət|Timesheet and attendance|Табель и посещаемость
Əmək haqqı sənədləri|Payroll documents|Документы по зарплате
Əməyin mühafizəsi jurnalları və qəza aktları|Occupational safety logs and accident reports|Журналы охраны труда и акты о несчастных случаях
İşə qəbul olmayan namizədlərin sənədləri|Documents of candidates who were not hired|Документы кандидатов, не принятых на работу
Gələn 12 ayda müddəti bitəcək:|Expiring in the next 12 months:|Истекают в ближайшие 12 месяцев:
Bacarıq axtar: kataloq və ESCO (məs. Excel, forklift, xidmət)|Search skills: catalogue and ESCO (e.g. Excel, forklift, service)|Поиск навыков: каталог и ESCO (напр. Excel, погрузчик, сервис)
Bacarıq axtar|Search skills|Поиск навыков
Büdcəni Plan və fakt bölməsində dəyiş ↗|Change the budget in Plan vs actual ↗|Изменить бюджет в разделе «План и факт» ↗
+ Təlim planla|+ Plan a training|+ Запланировать обучение
Planlaşdırılan xərc|Planned cost|Плановые расходы
İştirakçı|Participant|Участник
Bu il üçün təlim planlaşdırılmayıb.|No training is planned for this year.|На этот год обучение не запланировано.
Tamamlanmış təlim saatı:|Completed training hours:|Завершённых часов обучения:
hələ yoxdur|none yet|пока нет
Növbəli işçilər|Shift workers|Сменные сотрудники
Standart rejimlə doldur|Fill with the standard pattern|Заполнить по стандартному режиму
Excel: növbə cədvəli|Excel: shift schedule|Excel: график смен
Excel: növbəli işçilər|Excel: shift workers|Excel: сменные сотрудники
Dövrü şablon|Cyclic pattern|Цикличный шаблон
+ Növbə növü|+ Shift type|+ Тип смены
Bu nə üçündür?|What is this for?|Для чего это?
Növbə növləri:|Shift types:|Типы смен:
Səhər|Morning|Утро
Axşam|Evening|Вечер
Saat (1-ci / 2-ci həftə)|Hours (week 1 / week 2)|Часы (1-я / 2-я неделя)
Rəsmi norma cədvəli|Official norms table|Таблица официальных норм
Gündəlik normalar və məzənnə|Daily norms and exchange rate|Суточные нормы и курс
+ Ezamiyyət|+ Business trip|+ Командировка
Görüş|Meeting|Встреча
xarici ezamiyyət|foreign business trip|зарубежная командировка
+ eNPS sorğusu|+ eNPS survey|+ Опрос eNPS
+ Öz sorğum|+ My own survey|+ Мой опрос
Bayram və köçürülmüş gün|Holiday and moved day|Праздник и перенесённый день
Qısaldılmış gün (ərəfə)|Shortened day (eve)|Сокращённый день (канун)
İş saatı (faktiki)|Working hours (actual)|Рабочие часы (фактические)
Ödənilən saat|Paid hours|Оплаченные часы
İl üzrə|By year|За год
köçürülmüş istirahət günü|moved rest day|перенесённый выходной
şirkətin qeyri-iş günü|company non-working day|нерабочий день компании
qısaldılmış gün (bayram ərəfəsi)|shortened day (holiday eve)|сокращённый день (канун праздника)
Giriş-çıxış jurnalı|Clock-in/out log|Журнал прихода/ухода
Excel: gündəlik saat|Excel: daily hours|Excel: ежедневные часы
gündəlik|daily|ежедневно
İşlənən saat|Hours worked|Отработанные часы
Artıq iş|Overtime|Сверхурочные
İstirahət/bayram günü|Rest/holiday day|Выходной/праздничный день
Gecikmə|Lateness|Опоздание
Boş gün|Empty day|Пустой день
Cədvəl (XLSX)|Table (XLSX)|Таблица (XLSX)
Bəyannamə üçün (XLSX)|For the tax return (XLSX)|Для декларации (XLSX)
Hesablama iş kitabı (Excel)|Calculation workbook (Excel)|Рабочая книга расчётов (Excel)
Mühasibat jurnalı (1C)|Accounting journal (1C)|Бухгалтерский журнал (1C)
Müavinət uçotu|Benefit records|Учёт пособий
İllik yekun (XLSX)|Annual total (XLSX)|Годовой итог (XLSX)
Hesablaşma hesabatı|Settlement report|Отчёт о расчётах
Filiallar üzrə bölgü|Breakdown by branch|Распределение по филиалам
Bank və ödəniş sənədləri|Bank and payment documents|Банковские и платёжные документы
Ödəniş ayarları|Payment settings|Настройки выплат
Ödəniş günü:|Pay day:|День выплаты:
(istirahət və bayram günü olarsa əvvəlki iş günü — Əmək M. 172.3)|(if it falls on a rest day or holiday, the previous working day — Labour Code 172.3)|(если выпадает на выходной или праздник — предыдущий рабочий день — ТК 172.3)
Minimum aylıq əmək haqqı: 400 AZN|Minimum monthly salary: 400 AZN|Минимальная месячная зарплата: 400 AZN
İcbari tibbi sığorta: hər tərəf 8000 AZN-dək 2%, yuxarısı 0,5%|Compulsory medical insurance: each side 2% up to 8000 AZN, 0.5% above|Обязательное медицинское страхование: с каждой стороны 2% до 8000 AZN, 0,5% выше
İşsizlik sığortası: işçi 0,5%, işəgötürən 0,5%|Unemployment insurance: employee 0.5%, employer 0.5%|Страхование по безработице: работник 0,5%, работодатель 0,5%
iş günü|working days|рабочих дней
Vergi və sığorta (işçi)|Tax and insurance (employee)|Налог и страхование (работник)
gəlir vergisi|income tax|подоходный налог
Ödənilib (avans və maaş)|Paid (advance and salary)|Выплачено (аванс и зарплата)
% · cəmi|% · total|% · итого
Ödəniləcək qalıq|Balance to pay|Остаток к выплате
hesablanmış|accrued|начислено
İşəgötürənin xərci|Employer cost|Расходы работодателя
sığorta payı|insurance share|страховые взносы
Hamısını ödənilmiş qeyd et|Mark all as paid|Отметить всё как оплаченное
Təsdiqi geri çək (direktor)|Withdraw the approval (director)|Отозвать подтверждение (директор)
Yalnız qalığı olanlar|Only those with a balance|Только с остатком
Vergi və sığorta|Tax and insurance|Налог и страхование
Ödəniləcək|To pay|К выплате
İşçi, vəzifə və ya departament axtar|Search employee, position or department|Поиск сотрудника, должности или департамента
İşçi axtar|Search employee|Поиск сотрудника
Ştat planını qur|Build the staff plan|Составить штатный план
Ştat cədvəlinə|To the staff schedule|В штатное расписание
düşür; orada faktiki işçilər, boş yerlər və vakansiya yaratma görünür.|goes there; actual employees, vacant places and vacancy creation are shown there.|попадает туда; там видны фактические сотрудники, свободные места и создание вакансий.
Boş = baş ofis. Yeni filialın adını yazsanız, o ştatdan yaranır.|Empty = head office. If you type a new branch name, it is created from that line.|Пусто = головной офис. Если ввести имя нового филиала, он создаётся из этой строки.
Pillə (təcrübə səviyyəsi)|Grade (experience level)|Ступень (уровень опыта)
İşçi sayı (neçə nəfər)|Headcount (how many people)|Число сотрудников (сколько человек)
Yer nə vaxtdan açılır (ay)|From when the place opens (month)|С какого времени открывается место (месяц)
Nə vaxta qədər (müvəqqəti yer üçün)|Until when (for a temporary place)|До какого времени (для временного места)
Maaş həddi — minimum (AZN, gross)|Salary limit — minimum (AZN, gross)|Предел зарплаты — минимум (AZN, gross)
Maaş həddi — maksimum (AZN, gross)|Salary limit — maximum (AZN, gross)|Предел зарплаты — максимум (AZN, gross)
Plana əlavə et|Add to the plan|Добавить в план
Ştat cədvəlinə keç|Go to the staff schedule|Перейти к штатному расписанию
tam ştat vahidi|full-time units|полных штатных единиц
Maaş həddi|Salary limit|Предел зарплаты
Aylıq xərc*|Monthly cost*|Месячные расходы*
İndi işçi|Employees now|Сейчас сотрудников
Ştat / faktiki|Staff / actual|Штат / факт
Bu ay dövriyyə|Turnover this month|Текучесть в этом месяце
Yerin orta dolma müddəti:|Average time to fill a place:|Среднее время заполнения места:
Plan xətti təsdiqlənmiş ştat planından (büdcədən) gəlir.|The plan line comes from the approved staff plan (budget).|Линия плана берётся из утверждённого штатного плана (бюджета).
Plan-fakt: ştat cədvəli və faktiki işçi|Plan vs actual: staff schedule and actual employees|План-факт: штатное расписание и фактические сотрудники
Departament planını dəyiş|Change the department plan|Изменить план департамента
Qırıq çərçivə: ştat · dolu zolaq: faktiki (qırmızı: ştatdan artıq)|Dashed frame: staff plan · filled bar: actual (red: above the plan)|Пунктирная рамка: штат · заполненная полоса: факт (красная: сверх штата)
İşçi sayının aylar üzrə dəyişməsi və proqnoz|Headcount change by month and forecast|Изменение численности по месяцам и прогноз
Planlaşdırılan ştat|Planned staff|Плановый штат
ştatda yeri olan işçi|employees with a staff place|сотрудники с местом в штате
Ştatda yeri olmayan|Without a staff place|Без места в штате
aşağıda siyahıdadır|listed below|перечислены ниже
Aylıq maaş fondu|Monthly payroll fund|Месячный фонд зарплаты
Departament və şöbələr|Departments and sections|Департаменты и отделы
Vəzifələr|Positions|Должности
Hamısını yerləşdir|Place all|Разместить всех
Maaş həddi (gross)|Salary limit (gross)|Предел зарплаты (gross)
filialsız (ümumi)|no branch (general)|без филиала (общий)
Departament, şöbə və ya vəzifə|Department, section or position|Департамент, отдел или должность
Plandan kənar işə qəbul və maaş artımı|Out-of-plan hiring and salary increase|Внеплановый найм и повышение зарплаты
səbəblə|with a reason|с причиной
yazılır.|is entered.|указывается.
Direktor kimi sorğu dərhal tətbiq olunur (işçi maaşı istisna olmaqla).|A request made as the director applies immediately (except an employee's salary).|Запрос от директора применяется сразу (кроме зарплаты сотрудника).
Hamısı aşağıdakı siyahıda saxlanır.|Everything is kept in the list below.|Всё хранится в списке ниже.
Plandan kənar işçi yeri|Out-of-plan employee place|Внеплановое место сотрудника
Departament təklifi|Department proposal|Предложение департамента
Maaş həddi artımı|Salary limit increase|Повышение предела зарплаты
İşçinin maaş artımı|Employee salary increase|Повышение зарплаты сотрудника
Əlavə neçə nəfər|How many extra people|Сколько дополнительных человек
Ştatın növü (yeni sətir üçün)|Position type (for a new line)|Тип штата (для новой строки)
Gəlir vergisi (qeyri-dövlət, qeyri-neft): 2500 AZN-dək 3% (əsas iş yerində gəlir 2500-dək olduqda əvvəlcə 200 AZN azad edilir, md. 102.1.6); 2500–8000: 75 + 10%; 8000-dən yuxarı: 625 + 14%|Income tax (non-state, non-oil): 3% up to 2500 AZN (200 AZN is exempt first when the income at the main workplace is up to 2500, art. 102.1.6); 2500–8000: 75 + 10%; above 8000: 625 + 14%|Подоходный налог (негосударственный, ненефтяной сектор): 3% до 2500 AZN (при доходе по основному месту работы до 2500 сначала освобождаются 200 AZN, ст. 102.1.6); 2500–8000: 75 + 10%; свыше 8000: 625 + 14%
Gəlir vergisi (dövlət və neft-qaz): 2500 AZN-dək 14% (gəlir 2500-dək olduqda əvvəlcə 200 AZN azad edilir, md. 102.1.6), yuxarısı 350 + 25%|Income tax (state and oil-gas): 14% up to 2500 AZN (200 AZN is exempt first when income is up to 2500, art. 102.1.6), above that 350 + 25%|Подоходный налог (государственный и нефтегазовый сектор): 14% до 2500 AZN (при доходе до 2500 сначала освобождаются 200 AZN, ст. 102.1.6), свыше — 350 + 25%
DSMF (özəl): işçi 200-dək 3%, yuxarısı 10%; işəgötürən 200-dək 22%, 200–8000 15%, yuxarısı 11%. Dövlət/neft-qaz: işçi 3%, işəgötürən 22%|DSMF (private): employee 3% up to 200, 10% above; employer 22% up to 200, 15% for 200–8000, 11% above. State/oil-gas: employee 3%, employer 22%|ГФСЗ (частный): работник 3% до 200, выше 10%; работодатель 22% до 200, 15% на 200–8000, выше 11%. Государственный/нефтегазовый: работник 3%, работодатель 22%
Maaş həddi — minimum (yeni sətir üçün)|Salary limit — minimum (for a new line)|Предел зарплаты — минимум (для новой строки)
Maaş həddi — maksimum (yeni sətir üçün)|Salary limit — maximum (for a new line)|Предел зарплаты — максимум (для новой строки)
Tətbiq et|Apply|Применить
Təsdiqlərə keç|Go to approvals|Перейти к подтверждениям
Hazırkı plan|Current plan|Текущий план
Plandan kənar sorğu (bu il)|Out-of-plan request (this year)|Внеплановый запрос (в этом году)
Ssenari: əlavə işçi götürsək, xərc nə qədər artar?|Scenario: if we hire extra staff, how much does the cost rise?|Сценарий: насколько вырастут расходы, если нанять дополнительных сотрудников?
— sətir seçin —|— pick a line —|— выберите строку —
Direktor hesabatı (Excel)|Director report (Excel)|Отчёт директора (Excel)
Göndərən|Sender|Отправитель
məs. yeni layihə, təcili əvəzetmə, bazar maaşı|e.g. new project, urgent replacement, market salary|напр. новый проект, срочная замена, рыночная зарплата
İllik cəmi (AZN)|Annual total (AZN)|Годовой итог (AZN)
«Bölünməmiş» sətrinə 12 aya böl|Split the “Unallocated” line over 12 months|Разделить строку «Нераспределённое» на 12 месяцев
Büdcəni saxla|Save the budget|Сохранить бюджет
İllik|Annual|Годовой
Bölünməmiş (ümumi)|Unallocated (general)|Нераспределённое (общее)
Ümumi müqayisə: növlər üzrə|Overall comparison: by type|Общее сравнение: по видам
İllik büdcə|Annual budget|Годовой бюджет
Bu günə büdcə|Budget to date|Бюджет на сегодня
Sifarişdə (ödənilməyib)|On order (not paid)|В заказе (не оплачено)
Qalıq (büdcə − real − sifariş)|Balance (budget − actual − on order)|Остаток (бюджет − факт − заказ)
Aylar üzrə: bütün növlərin cəmi|By month: total of all types|По месяцам: сумма всех видов
Cəmi büdcə|Total budget|Итого бюджет
Büdcə növü|Budget type|Вид бюджета
Departament əlavə et|Add a department|Добавить департамент
Departament adı|Department name|Название департамента
Ayrılıb|Allocated|Выделено
Real (ödənilib)|Actual (paid)|Факт (оплачено)
Elan, agentlik, test, namizəd yol xərci, uyğunlaşdırma|Advertising, agency, tests, candidate travel, onboarding|Объявления, агентство, тесты, дорожные расходы кандидатов, адаптация
Sertifikat, lisenziya, imtahan və yenilənmə haqqı|Certificate, licence, exam and renewal fees|Сертификаты, лицензии, экзамены и плата за продление
Korporativ tədbir, komanda yığıncağı, təqdimat|Corporate event, team meeting, presentation|Корпоративное мероприятие, встреча команды, презентация
Ad günü, bayram, yubiley, mükafat hədiyyəsi|Birthday, holiday, anniversary, bonus gift|День рождения, праздник, юбилей, подарок-премия
Sığorta, tibbi baxış, peyvənd|Insurance, medical check-up, vaccination|Страховка, медосмотр, вакцинация
Uniforma, iş geyimi, şəxsi mühafizə vasitəsi|Uniform, workwear, personal protective equipment|Форма, спецодежда, средства индивидуальной защиты
Yuxarıdakılara aid olmayan kadr xərcləri|HR costs not covered above|Кадровые расходы, не вошедшие выше
+ Yeni xərc|+ New expense|+ Новый расход
Ödəniş|Payment|Оплата
Xərc növü|Expense type|Вид расхода
Xarici proqramlarla mübadilə (1C, SAP, digər ERP)|Exchange with external programs (1C, SAP, other ERP)|Обмен с внешними программами (1C, SAP, другие ERP)
Bildiriş ünvanı (istəyə görə, https://…)|Notification address (optional, https://…)|Адрес уведомления (по желанию, https://…)
İmza şifrəsi|Signature secret|Ключ подписи
(istəyə görə)|(optional)|(по желанию)
Sınaq bildirişi göndər|Send a test notification|Отправить тестовое уведомление
İz|Trace|След
Yaradılıb|Created|Создано
Son istifadə|Last used|Последнее использование
Hələ açar yoxdur.|No key yet.|Ключей пока нет.
Digər ERP / mühasibat|Other ERP / accounting|Другой ERP / бухгалтерия
Yeni açar yarat|Create a new key|Создать новый ключ
Proqramçı üçün qısa təlimat|Short guide for the developer|Краткая инструкция для разработчика
Mübadilə jurnalı (son 40)|Exchange log (last 40)|Журнал обмена (последние 40)
İstiqamət|Direction|Направление
Hələ mübadilə olmayıb.|No exchange yet.|Обмена пока не было.
Açarın adı, məs. 1C mühasibat|Key name, e.g. 1C accounting|Название ключа, напр. 1C бухгалтерия
Açarın adı|Key name|Название ключа
Filialsız (şirkət üzrə)|No branch (company-wide)|Без филиала (по компании)
vəzifəsiz|no position|без должности
Vəzifə bu filialda|Position in this branch|Должность в этом филиале
Pay % (istəyə görə)|Share % (optional)|Доля % (по желанию)
Tarix və bonus|Date and bonus|Дата и бонус
Filial üzrə süz|Filter by branch|Фильтр по филиалу
Departament › Şöbə|Department › Section|Департамент › Отдел
Vəzifə (filialda)|Position (in the branch)|Должность (в филиале)
Hələ bağlantı yoxdur.|No link yet.|Привязок пока нет.
əvvəl filial|branch first|сначала филиал
istəyə görə|optional|по желанию
məs. Baş mühasib|e.g. Chief accountant|напр. Главный бухгалтер
boş = rejimə görə|empty = by mode|пусто = по режиму
Bu ayın əmək haqqı təsdiqlənib: satış və limit dəyişmir.|This month's payroll is approved: sales and limit cannot be changed.|Зарплата этого месяца подтверждена: продажи и лимит не меняются.
Satış limiti (AZN)|Sales limit (AZN)|Лимит продаж (AZN)
Satış (AZN)|Sales (AZN)|Продажи (AZN)
Bonus dəyəri|Bonus value|Размер бонуса
Sabit məbləğ|Fixed amount|Фиксированная сумма
Maaşın faizi|Percent of salary|Процент от зарплаты
Satışı saxla|Save sales|Сохранить продажи
Qaydanı saxla|Save the rule|Сохранить правило
ay təsdiqlənib|month approved|месяц подтверждён
Filial sayına görə bərabər|Equal by number of branches|Поровну по числу филиалов
Filialların satışına görə|By branch sales|По продажам филиалов
Satış limiti|Sales limit|Лимит продаж
İşəgötürən xərci|Employer cost|Расходы работодателя
Təcrübə, təhsil və bacarıqları yazın (70%+)|Add experience, education and skills (70%+)|Укажите опыт, образование и навыки (70%+)
CV-ni AI ilə təhlil edin|Analyse your CV with AI|Проанализируйте резюме с помощью ИИ
Güclü və zəif tərəflərə rəy alın|Get feedback on strengths and weaknesses|Получите отзыв о сильных и слабых сторонах
Vakansiyanı yadda saxlayın|Save a vacancy|Сохраните вакансию
Bəyəndiyiniz elanı işarələyin|Bookmark a listing you like|Отметьте понравившееся объявление
İlk müraciəti göndərin|Send your first application|Отправьте первый отклик
Uyğun vakansiyaya bir kliklə müraciət edin|Apply to a matching vacancy in one click|Откликнитесь на подходящую вакансию в один клик
Təcrübəsiz|No experience|Без опыта
Tam səhifə|Full page|Полная страница
Profilinizə|To your profile|Вашему профилю
% uyğundur|% match|% соответствие
Vəzifə, şirkət və ya bacarıq|Position, company or skill|Должность, компания или навык
Maliyyə, mühasibatlıq və bank|Finance, accounting and banking|Финансы, бухгалтерия и банки
Maliyyə üzrə mütəxəssis|Finance specialist|Специалист по финансам
(Bakı vaxtı)|(Baku time)|(по бакинскому времени)
dəq ·|min ·|мин ·
İş təklifi:|Job offer:|Предложение о работе:
Status: Baxışda|Status: Under review|Статус: На рассмотрении
İş təklifi: göndərildi|Job offer: sent|Предложение о работе: отправлено
Status: Təklif edildi|Status: Offered|Статус: Предложено
İş təklifi: qəbul edildi|Job offer: accepted|Предложение о работе: принято
Vergi və sığortadan sonra|After tax and insurance|После налога и страхования
Vərəqə / çap|Slip / print|Листок / печать
Nə dəyişib?|What changed?|Что изменилось?
Bu, ilk haqq-hesab vərəqənizdir: müqayisə üçün əvvəlki ay yoxdur.|This is your first payslip: there is no previous month to compare.|Это ваш первый расчётный листок: предыдущего месяца для сравнения нет.
Qalan məzuniyyət:|Remaining vacation:|Остаток отпуска:
Məzuniyyət təklif et|Propose a vacation|Предложить отпуск
Gün sayı|Number of days|Количество дней
Sizə şirkət əmlakı verilməyib.|No company property has been issued to you.|Вам не выдавалось имущество компании.
Hazırda çıxış prosesi açıq deyil.|No offboarding process is open right now.|Процесс увольнения сейчас не открыт.
Şirkətdə hələ qiymətləndirmə dövrü açılmayıb.|The company has not opened an evaluation period yet.|В компании ещё не открыт период оценки.
Sizə təlim təyin olunmayıb.|No training has been assigned to you.|Вам не назначено обучение.
Gəldim|I have arrived|Я пришёл
Bakı vaxtı|Baku time|Бакинское время
· iş saatı|· working hours|· рабочие часы
Növbəti 3 həftə üçün sizə növbə təyin olunmayıb.|No shift is assigned to you for the next 3 weeks.|На ближайшие 3 недели вам не назначены смены.
Ezamiyyət sorğusu|Business trip request|Запрос на командировку
Azərbaycan daxilində|Within Azerbaijan|По Азербайджану
Xarici ölkə|Foreign country|Зарубежная страна
Şəhər / yer (qanunun cədvəlindən)|City / place (from the table of the law)|Город / место (из таблицы закона)
Seçin…|Select…|Выберите…
Bakı şəhəri (125 AZN)|Baku city (125 AZN)|город Баку (125 AZN)
Naxçıvan şəhəri (100 AZN)|Nakhchivan city (100 AZN)|город Нахчыван (100 AZN)
Gəncə şəhəri (95 AZN)|Ganja city (95 AZN)|город Гянджа (95 AZN)
Sumqayıt şəhəri (95 AZN)|Sumgait city (95 AZN)|город Сумгаит (95 AZN)
Digər şəhər, rayon mərkəzi, qəsəbə və ya kənd (90 AZN)|Other city, district centre, town or village (90 AZN)|Другой город, районный центр, посёлок или село (90 AZN)
Məqsəd|Purpose|Цель
Bitmə|End|Окончание
Sorğu göndər|Send the request|Отправить запрос
Ezamiyyət növü|Business trip type|Тип командировки
Şirkət hələ sənəd yerləşdirməyib.|The company has not posted any documents yet.|Компания ещё не разместила документов.
Əməyin mühafizəsi: təlimatlarım və tibbi baxışlarım|Occupational safety: my briefings and medical examinations|Охрана труда: мои инструктажи и медосмотры
Təsdiq üçün sənəd yoxdur.|No documents to approve.|Нет документов для подтверждения.
Tanıdığınız uyğun şəxsi açıq vakansiyaya tövsiyə edin|Recommend someone you know for an open vacancy|Порекомендуйте знакомого на открытую вакансию
Ümumi tövsiyə|General recommendation|Общая рекомендация
Niyə uyğundur?|Why is the person a match?|Почему подходит?
Tövsiyə et|Recommend|Рекомендовать
Bu ay qalıb:|Left this month:|Осталось в этом месяце:
Aylıq AI balansı|Monthly AI balance|Месячный ИИ-баланс
CV-ni necə yükləyim və profil necə doldurulur?|How do I upload a CV and fill in the profile?|Как загрузить резюме и заполнить профиль?
Vakansiyaya necə müraciət edirəm?|How do I apply to a vacancy?|Как откликнуться на вакансию?
Yeni uyğun vakansiyalardan necə xəbərdar olum?|How do I get notified about new matching vacancies?|Как узнавать о новых подходящих вакансиях?
Şifrəni unutdum, nə edim?|I forgot my password, what do I do?|Я забыл(а) пароль, что делать?
Profilimi işəgötürənlər görür?|Do employers see my profile?|Видят ли работодатели мой профиль?
Məlumatlarımı necə yükləyə və ya silə bilərəm?|How can I download or delete my data?|Как скачать или удалить мои данные?
Test zamanı bağlantı kəsilsə nə olur?|What happens if the connection drops during a test?|Что будет, если соединение прервётся во время теста?
Administrator hesabında iki mərhələli giriş söndürülüdür|Two-step sign-in is switched off on the administrator account|На аккаунте администратора двухэтапный вход отключён
Satış və müştəri xidməti|Sales and customer service|Продажи и обслуживание клиентов
bacarıq|skill|навык
Auditor sertifikatı (AR Auditorlar Palatası)|Auditor certificate (Chamber of Auditors of Azerbaijan)|Сертификат аудитора (Палата аудиторов Азербайджана)
Azərbaycan Respublikasının Auditorlar Palatası|Chamber of Auditors of the Republic of Azerbaijan|Палата аудиторов Азербайджанской Республики
Hazır universitetlər|Ready universities|Готовые университеты
Hazır ixtisaslar|Ready majors|Готовые специальности
Hazır kataloq|Ready catalogue|Готовый каталог
Namizədlərin təhsil bölməsində seçdiyi hazır universitet və ixtisaslar|Ready universities and majors candidates choose in the education section|Готовые университеты и специальности, которые кандидаты выбирают в разделе образования
Bütün ölkələr|All countries|Все страны
Ad, qısaltma və ya ingilis adı|Name, abbreviation or English name|Название, аббревиатура или английское название
Tərcümə qeydləri|Translation entries|Записи переводов
Təkrar qrupları|Duplicate groups|Группы дубликатов
Vəzifələr:|Positions:|Должности:
. Təhsil:|. Education:|. Образование:
Vəzifə nümunəsi (.csv)|Position sample (.csv)|Образец должностей (.csv)
Təhsil nümunəsi (.csv)|Education sample (.csv)|Образец образования (.csv)
Təkrar qeyd tapılmadı.|No duplicate entry found.|Повторяющихся записей не найдено.
Tərcümə problemi tapılmadı.|No translation problem found.|Проблем с переводом не найдено.
AI qiymətləndirmə nümunələri|AI evaluation samples|Образцы оценки ИИ
“səhvdir” işarəsi|“wrong” flag|Отметка «ошибка»
İstehsalat təqvimi (bütün şirkətlər üçün)|Production calendar (for all companies)|Производственный календарь (для всех компаний)
İş günü:|Working day:|Рабочий день:
· iş saatı:|· working hours:|· рабочие часы:
· admin dəyişikliyi:|· admin change:|· изменение администратора:
Bayram dövrü əlavə et|Add a holiday period|Добавить праздничный период
Son (boşdursa 1 gün)|End (1 day if empty)|Конец (1 день, если пусто)
Qısaldılmış iş günü|Shortened working day|Сокращённый рабочий день
— günə klik edib dəyişin|— click a day to change it|— нажмите на день, чтобы изменить
köçürülmüş gün|moved day|перенесённый день
qısaldılmış gün|shortened day|сокращённый день
admin dəyişikliyi|admin change|изменение администратора
Ramazan bayramı|Ramadan holiday|Рамазан байрам
Aylıq haqq|Monthly fee|Месячная плата
AI sıralaması|AI ranking|ИИ-ранжирование
Net qazanc hədəfi|Net profit target|Целевая чистая прибыль
Ən pis halda net qazanc|Net profit in the worst case|Чистая прибыль в худшем случае
Tam analiz (işlənib / kvota)|Full analysis (used / quota)|Полный анализ (использовано / квота)
Sıralama (işlənib / kvota)|Ranking (used / quota)|Ранжирование (использовано / квота)
Ödəniş inteqrasiyası hələ qoşulmayıb: paketi admin təyin edir.|Payment integration is not connected yet: the admin assigns the plan.|Платёжная интеграция ещё не подключена: пакет назначает администратор.
İlk cavab: orta|First reply: average|Первый ответ: в среднем
· cavabsız|· unanswered|· без ответа
· hədəf: ilk cavab 24 saat (təcili: 4 saat)|· target: first reply 24 hours (urgent: 4 hours)|· цель: первый ответ за 24 часа (срочные: 4 часа)
· hədəf aşılıb: cavabsız sorğu var|· target exceeded: there is an unanswered request|· цель превышена: есть запрос без ответа
Universitetin əlavə edilməsi|Adding a university|Добавление университета
İxtisasın əlavə edilməsi|Adding a major|Добавление специальности
Dəyişdirilmiş rəy mətni burada yazılıb.|The changed feedback text is written here.|Изменённый текст отзыва записан здесь.
AI-nin aylıq xərc limiti|AI monthly cost limit|Месячный лимит расходов на ИИ
Bu ay təxmini xərc:|Estimated cost this month:|Ориентировочные расходы в этом месяце:
CV tərəfi (namizəd)|CV side (candidate)|Сторона резюме (кандидат)
Vakansiya tərəfi (işəgötürən)|Vacancy side (employer)|Сторона вакансий (работодатель)
xəta|error|ошибка
AI-nin dəqiqliyi (işəgötürən rəyləri)|AI accuracy (employer feedback)|Точность ИИ (отзывы работодателей)
Rəy sayı|Number of reviews|Количество отзывов
“yanlış”|“wrong”|«неверно»
rəylərin payı|share of reviews|доля отзывов
Orta bal səhvi (AI)|Average score error (AI)|Средняя ошибка оценки (ИИ)
bal göstərilib|score shown|балл показан
Orta bal səhvi (qaydalar)|Average score error (rules)|Средняя ошибка оценки (правила)
kifayət qədər rəy yoxdur|not enough reviews|недостаточно отзывов
Tövsiyə üzrə|By recommendation|По рекомендации
AI-nin tövsiyəsi|The AI's recommendation|Рекомендация ИИ
Rəy|Feedback|Отзыв
AI nə dedi, işəgötürən nə qərar verdi|What the AI said and what the employer decided|Что сказал ИИ и что решил работодатель
AI \\ İşəgötürən|AI \\ Employer|ИИ \\ Работодатель
Son “yanlış” rəylər|Latest “wrong” reviews|Последние отзывы «неверно»
Hələ “yanlış” rəy yoxdur.|No “wrong” review yet.|Отзывов «неверно» пока нет.
Rəyləri CSV kimi yüklə|Download reviews as CSV|Скачать отзывы как CSV
Rəyləri sıfırla|Reset the reviews|Сбросить отзывы
Aylıq limit|Monthly limit|Месячный лимит
CV tərəfi (namizəd): aylıq limit|CV side (candidate): monthly limit|Сторона резюме (кандидат): месячный лимит
Vakansiya tərəfi (işəgötürən): aylıq limit|Vacancy side (employer): monthly limit|Сторона вакансий (работодатель): месячный лимит
şəxs ·|person ·|чел. ·
Sənəd oxunmur. Daha aydın şəkil və ya PD|The document is unreadable. A clearer picture or PD|Документ нечитаем. Более чёткое изображение или PD
Sənədin etibarlılıq müddəti bitib.|The document has expired.|Срок действия документа истёк.
Hesablamalar məlumat xarakterlidir; kollektiv/əmək müqaviləsi qanundan yüksək şərtlər nəzərdə tuta bilər. Rəsmi sənədləşmədən əvvəl mühasib və ya hüquqşünasla yoxlayın.|Calculations are for information; a collective or employment contract may provide terms above the law. Check with an accountant or lawyer before official documentation.|Расчёты носят информационный характер; коллективный или трудовой договор может предусматривать условия выше закона. Перед оформлением документов проверьте у бухгалтера или юриста.
Əsas: Əmək Məcəlləsi / Vergi Məcəlləsi, maddə|Basis: Labour Code / Tax Code, article|Основание: Трудовой кодекс / Налоговый кодекс, статья
Saxlanmış hesablamalar (|Saved calculations (|Сохранённые расчёты (
iş günü,|working days,|рабочих дней,
Platformadan necə istifadə etmək: addım-addım, hər istifadəçi növü üçün|How to use the platform: step by step, for every user type|Как пользоваться платформой: шаг за шагом для каждого типа пользователя
Hər istifadəçi yalnız rolunun icazəsi çatan məlumatı görür. İşəgötürənin komandasında şəxsi məlumatlar (FİN, IBAN) və maaşlar ayrıca icazə tələb edir; auditor yalnız baxır və şəxsi məlumatı görmür. Şirkətin şifrələmə açarı qoyulduqda şəxsi məlumatlar şifrələnmiş saxlanılır.|Each user sees only the data their role allows. In an employer's team, personal data (FIN, IBAN) and salaries need a separate permission; an auditor only views and does not see personal data. When the company sets an encryption key, personal data is stored encrypted.|Каждый пользователь видит только данные, доступные его роли. В команде работодателя личные данные (FIN, IBAN) и зарплаты требуют отдельного права; аудитор только просматривает и не видит личные данные. Когда компания задаёт ключ шифрования, личные данные хранятся в зашифрованном виде.
İşçilər, ştat, davamiyyət, məzuniyyət qrafiki, əmək haqqı əlavələri və digər bölmələrdə «Excel-dən əlavə et» düyməsi var. Düyməyə basanda nümunə faylı yükləyin, doldurun və geri yükləyin: əvvəl önizləmə göstərilir, səhvlər sətir-sətir bildirilir.|Employees, staffing, attendance, vacation schedule, payroll additions and other sections have an “Add from Excel” button. Download the sample file, fill it in and upload it back: a preview is shown first and errors are reported line by line.|В разделах «Сотрудники», «Штат», «Посещаемость», «График отпусков», «Дополнения к зарплате» и других есть кнопка «Добавить из Excel». Скачайте образец, заполните и загрузите обратно: сначала показывается предпросмотр, ошибки сообщаются построчно.
İmzalanmış əmrin kartdakı təsiri geri qaytarıla bilər; təsdiqlənmiş əmək haqqı ayını direktor yenidən aça bilər; ödənişi geri çəkmək mümkündür. Bu əməliyyatlar jurnala yazılır.|The effect of a signed order on the card can be reverted; the director can reopen an approved payroll month; a payment can be withdrawn. These actions are logged.|Действие подписанного приказа в карточке можно отменить; директор может повторно открыть подтверждённый месяц зарплаты; выплату можно отозвать. Эти действия записываются в журнал.
Yuxarıdakı zəng işarəsində. Müraciət, müsahibə, təsdiq, haqq-hesab vərəqəsi və xatırlatmalar bildiriş kimi gəlir; e-poçt bildirişi hesab ayarlarınıza görədir.|In the bell icon at the top. Applications, interviews, approvals, payslips and reminders arrive as notifications; e-mail notifications follow your account settings.|В значке колокольчика вверху. Отклики, собеседования, подтверждения, расчётные листки и напоминания приходят как уведомления; e-mail-уведомления зависят от настроек аккаунта.
Şirkətin HR-ının verdiyi qoşulma kodunu yazın (məsələn: K7M2P-9XQ4W). Kod bir dəfə işləyir və bir həftə qüvvədədir.|Enter the join code given by the company's HR (e.g. K7M2P-9XQ4W). The code works once and is valid for a week.|Введите код подключения от HR компании (например: K7M2P-9XQ4W). Код одноразовый и действует неделю.
Administrator hesabı bütün platformaya təsir edir. «Hesab ayarları → Təhlükəsizlik» bölməsində autentifikator tətbiqini qoşun.|The administrator account affects the whole platform. Connect an authenticator app in “Account settings → Security”.|Аккаунт администратора влияет на всю платформу. Подключите приложение-аутентификатор в «Настройки аккаунта → Безопасность».
Vakansiyaları təsdiq edir, təklif göndərir, işçiləri və maaşları idarə edir|Approves vacancies, sends offers, manages employees and salaries|Подтверждает вакансии, отправляет предложения, управляет сотрудниками и зарплатами
Əmək haqqı, işçilər, davamiyyət, sənədlər və hesabatlara baxır, heç nəyi dəyişə bilmir; şəxsi məlumatları (IBAN, FİN) görmür|Views payroll, employees, attendance, documents and reports, cannot change anything; does not see personal data (IBAN, FIN)|Просматривает зарплату, сотрудников, посещаемость, документы и отчёты, ничего не может менять; не видит личные данные (IBAN, FIN)
planı:|plan:|план:
Plan təsdiqlənib və kilidlidir. Dəyişmək üçün direktor «Redaktə üçün aç» düyməsini basır, sonra yenidən təsdiqə göndərilir. Ştat cədvəlinin öz təsdiq qaydası var (aşağıda).|The plan is approved and locked. To change it, the director presses “Open for editing”, and it is sent for approval again. The staff schedule has its own approval procedure (below).|План подтверждён и заблокирован. Чтобы изменить, директор нажимает «Открыть для редактирования», затем план снова отправляется на подтверждение. У штатного расписания свой порядок подтверждения (ниже).
dəqiqə · göndərilib|min · sent|мин · отправлено
Müsahibəyə dəvət etmək üçün “Namizədlər” bölməsində namizədin yanındakı|To invite to an interview, in “Candidates” press the button next to the candidate|Чтобы пригласить на собеседование, в разделе «Кандидаты» нажмите кнопку рядом с кандидатом
düyməsini basın: namizəd avtomatik burada “Vaxt gözləyir” siyahısına düşür. Buradan vaxt təyin edir, test göndərir və vakansiyanın suallarını açırsınız.|: the candidate automatically lands here in the “Waiting for a time” list. From here you set a time, send a test and open the vacancy's questions.|: кандидат автоматически попадает сюда в список «Ожидает времени». Отсюда вы назначаете время, отправляете тест и открываете вопросы вакансии.
siyahı. Vakansiyaya bağlanan siyahı həmin vakansiyanın müsahibələrində avtomatik açılır|list. A list linked to a vacancy opens automatically in that vacancy's interviews|список. Список, привязанный к вакансии, автоматически открывается в собеседованиях этой вакансии
Eyni vakansiyaya müsahibə verən namizədlərin rəyləri bir cədvəldə. Yekun qərarı özünüz verirsiniz.|Feedback of candidates interviewed for the same vacancy in one table. You make the final decision yourself.|Отзывы о кандидатах, прошедших собеседование на одну вакансию, в одной таблице. Окончательное решение принимаете вы.
Son 12 ayın əmək haqqı (vergiyə cəlb olunan, aylıq; vergül/boşluqla ayırın)|Salary of the last 12 months (taxable, monthly; separate with commas/spaces)|Зарплата за последние 12 месяцев (облагаемая, помесячно; через запятую/пробел)
Müavinət almaq üçün ən azı 6 ay sosial sığorta stajı lazımdır (md. 6): stajı yazın.|At least 6 months of social insurance service is needed to receive the benefit (art. 6): enter the service.|Для получения пособия нужен стаж социального страхования не менее 6 месяцев (ст. 6): укажите стаж.
Müavinət son 12 ayın sığorta haqqı ödənilmiş orta aylıq əmək haqqından (÷ 30,4) təqvim günlərinə görə hesablanır; bayram və istirahət günləri də daxildir.|The benefit is calculated from the average monthly salary of the last 12 months on which insurance was paid (÷ 30.4) by calendar days; holidays and rest days are included.|Пособие рассчитывается от средней месячной зарплаты за последние 12 месяцев, с которой уплачены взносы (÷ 30,4), по календарным дням; праздничные и выходные дни включаются.
Müavinətin faizi (100%) Sosial Sığorta Qanununda göstərilmir: onu müvafiq qanunvericilik aktına görə ayarlarda yazın.|The benefit percentage (100%) is not stated in the Social Insurance Law: enter it in the settings according to the relevant legal act.|Процент пособия (100%) в Законе о социальном страховании не указан: введите его в настройках согласно соответствующему акту.
Müavinət məcburi sosial sığorta haqqı hesablanan gəlirə daxil deyil (md. 15) və adətən sığortaçı tərəfindən nağdsız, birbaşa sığortaolunana ödənilir (md. 17).|The benefit is not part of the income on which compulsory social insurance contributions are calculated (art. 15) and is usually paid by the insurer by non-cash transfer directly to the insured person (art. 17).|Пособие не входит в доход, с которого исчисляются обязательные взносы социального страхования (ст. 15), и обычно выплачивается страховщиком безналично непосредственно застрахованному (ст. 17).
Aylıq maksimal həddi (minimum əmək pensiyasının 25 mislindən çox ola bilməz, md. 6) hesablamaq üçün minimum pensiyanın məbləğini yazın.|To calculate the monthly maximum (not more than 25 times the minimum labour pension, art. 6), enter the amount of the minimum pension.|Чтобы рассчитать месячный максимум (не более 25-кратного минимума трудовой пенсии, ст. 6), укажите размер минимальной пенсии.
İş yerlərinizi və sertifikatlarınızı sənədlə təsdiqləyin. AI sənədi profilinizlə tutuşdurur, administrator yekun qərar verir. Təsdiqlənmiş məlumatlar işəgötürənə nişanla göstərilir. Sənədin özünü işəgötürən görmür.|Confirm your workplaces and certificates with a document. The AI compares the document with your profile and the administrator makes the final decision. Confirmed data is shown to the employer with a badge. The employer does not see the document itself.|Подтвердите места работы и сертификаты документом. ИИ сопоставляет документ с вашим профилем, окончательное решение принимает администратор. Подтверждённые данные показываются работодателю со значком. Сам документ работодатель не видит.
«Şirkət məlumatları»nda şirkətin adı, VÖEN, sahə, ünvan və loqonu doldurun; doğrulama sənədini yükləyin.|In “Company details” fill in the company name, VÖEN, industry, address and logo; upload the verification document.|В разделе «Данные компании» заполните название, VÖEN, сферу, адрес и логотип; загрузите документ верификации.
«Komanda və rollar» bölməsində həmkarlarınızı e-poçtla dəvət edin və rol verin (HR, direktor, rekruter, şöbə rəhbəri, auditor).|In “Team and roles” invite colleagues by e-mail and give them a role (HR, director, recruiter, department head, auditor).|В разделе «Команда и роли» пригласите коллег по e-mail и назначьте роль (HR, директор, рекрутер, руководитель отдела, аудитор).
Yuxarıdakı «İşə qəbul» / «Kadr (HR)» düymələri iki iş rejimi arasında keçid edir.|The “Recruitment” / “HR” buttons at the top switch between the two work modes.|Кнопки «Найм» / «Кадры (HR)» вверху переключают два режима работы.
Rol hər kəsin yalnız lazım olanı görməsini təmin edir; əlavə icazəni «İcazələr» düyməsi ilə, istəsəniz müddətli verə bilərsiniz.|A role ensures everyone sees only what they need; you can give extra permission with the “Permissions” button, time-limited if you wish.|Роль обеспечивает, что каждый видит только нужное; дополнительное право можно дать кнопкой «Права», при желании — на ограниченный срок.
«HR AI köməkçi»də vəzifəni və tələbləri təsvir edin; köməkçi sual verib elan mətnini hazırlayır.|In “HR AI assistant” describe the position and requirements; the assistant asks questions and prepares the listing text.|В «HR-ассистенте ИИ» опишите должность и требования; ассистент задаёт вопросы и готовит текст объявления.
«Vakansiyalarım» bölməsində elanı yoxlayın, dəyişin və yayımlayın; təsdiq qaydası varsa əvvəl təsdiqə gedir.|In “My vacancies” check, edit and publish the listing; if there is an approval procedure it goes for approval first.|В разделе «Мои вакансии» проверьте, измените и опубликуйте объявление; если есть порядок подтверждения, оно сначала идёт на подтверждение.
Ştat planı varsa, vakansiya yalnız planda yeri olan vəzifə üçün açıla bilər; əlavə yer üçün «Ehtiyac təklifi» lazımdır.|If there is a staff plan, a vacancy can be opened only for a position with a place in the plan; an extra place needs a “Hiring proposal”.|Если есть штатный план, вакансию можно открыть только на должность, у которой есть место в плане; для дополнительного места нужна «Заявка на найм».
«Namizədlər»də müraciətləri vakansiya üzrə görürsünüz; uyğunluq balı və AI qısa xülasəsi göstərilir.|In “Candidates” you see applications by vacancy; the match score and a short AI summary are shown.|В разделе «Кандидаты» вы видите заявки по вакансиям; показываются оценка соответствия и краткая сводка ИИ.
Statusu dəyişin: Baxışda, Müsahibə, Təklif edildi, İşə qəbul edildi və ya Uyğun deyil. Vakansiyaya xas mərhələlər də əlavə etmək olar.|Change the status: Under review, Interview, Offered, Hired or Not a match. Vacancy-specific stages can also be added.|Измените статус: На рассмотрении, Собеседование, Предложено, Принят на работу или Не подходит. Можно добавить и этапы, специфичные для вакансии.
Bir neçə namizədi seçib müqayisə cədvəlində yan-yana baxın, toplu status dəyişin.|Pick several candidates, compare them side by side in a table and change status in bulk.|Выберите нескольких кандидатов, сравните их рядом в таблице и меняйте статус массово.
Təkrar müraciət və digər vakansiyalara müraciət adın altında qeyd olunur.|Repeat applications and applications to other vacancies are marked under the name.|Повторные заявки и заявки на другие вакансии отмечаются под именем.
Namizədi «Müsahibəyə dəvət et» ilə çağırın: bir neçə vaxt təklif edin, mərhələni və iştirakçıları seçin.|Invite the candidate with “Invite to interview”: offer several times, choose the stage and participants.|Пригласите кандидата кнопкой «Пригласить на собеседование»: предложите несколько вариантов времени, выберите этап и участников.
Konflikt xəbərdarlığı eyni vaxtda iki müsahibənin üst-üstə düşməsinin qarşısını alır.|The conflict warning prevents two interviews from overlapping at the same time.|Предупреждение о конфликте не допускает наложения двух собеседований по времени.
Müsahibədən sonra «Rəy yaz»: kriteriyaları 1–5 qiymətləndirin; ümumi bal çəkili ortadan hesablanır. Kriteriyaları şirkət özü dəyişə bilər.|After the interview use “Write feedback”: rate the criteria 1–5; the overall score is a weighted average. The company can change the criteria itself.|После собеседования нажмите «Написать отзыв»: оцените критерии от 1 до 5; общий балл считается как средневзвешенный. Компания может сама менять критерии.
«Testlər» bölməsində test yaradın (Excel və ya AI ilə sual idxalı), namizədlərə göndərin, nəticəni müqayisə edin.|In “Tests” create a test (import questions with Excel or AI), send it to candidates and compare the results.|В разделе «Тесты» создайте тест (импорт вопросов из Excel или через ИИ), отправьте кандидатам и сравните результаты.
Namizəd kartından təklif məktubu hazırlayın (şablondan istifadə edin) və göndərin; namizəd cavabını platformadan verir.|Prepare an offer letter from the candidate card (use a template) and send it; the candidate replies through the platform.|Подготовьте письмо с предложением из карточки кандидата (используйте шаблон) и отправьте; кандидат отвечает через платформу.
Namizəd qəbul edəndə və status «İşə qəbul edildi» olanda işçi kartı yaranır və adaptasiya siyahısı başlayır.|When the candidate accepts and the status is “Hired”, an employee card is created and the onboarding list starts.|Когда кандидат принимает предложение и статус становится «Принят на работу», создаётся карточка сотрудника и начинается список адаптации.
«İstedad bazası»nda uyğun namizədləri axtarın, teqlərlə saxlayın, axtarışı yadda saxlayın.|In “Talent pool” search for matching candidates, keep them with tags and save the search.|В «Базе талантов» ищите подходящих кандидатов, сохраняйте их с метками и сохраняйте поиск.
Qıf müraciətdən işə qəbula qədər hər mərhələdə neçə nəfərin qaldığını göstərir.|The funnel shows how many people remain at each stage from application to hiring.|Воронка показывает, сколько человек остаётся на каждом этапе от заявки до найма.
İşə qəbul müddəti və hər mərhələdə keçən müddət prosesin darboğazını göstərir.|The time to hire and the time spent in each stage show the bottleneck of the process.|Срок найма и время на каждом этапе показывают узкое место процесса.
Mənbə hesabatı hansı mənbənin işə qəbul gətirdiyini, rədd səbəbləri isə niyə itirdiyinizi göstərir.|The source report shows which source brings hires, and rejection reasons show why you lose candidates.|Отчёт по источникам показывает, какой источник приводит к найму, а причины отказов — почему вы теряете кандидатов.
«Dayanmış namizədlər» cavab gözləyənlərdir: onlara baxın. Çərşənbə axşamı və cümə gününə xatırlatma bildirişi də gəlir.|“Stalled candidates” are those waiting for a reply: look at them. A reminder notification also arrives on Tuesday and Friday.|«Застрявшие кандидаты» — те, кто ждёт ответа: посмотрите на них. По вторникам и пятницам приходит и напоминание.
Bu bölməni yalnız hesab sahibi, direktor, HR və rekruter görür, çünki namizəd adları var.|Only the account owner, director, HR and recruiter see this section because it contains candidate names.|Этот раздел видят только владелец аккаунта, директор, HR и рекрутер, так как в нём есть имена кандидатов.
Qeydiyyatdan sonra profilinizi doldurun: uyğun vakansiyalar bu məlumata görə seçilir.|After registration fill in your profile: matching vacancies are chosen based on this data.|После регистрации заполните профиль: подходящие вакансии подбираются по этим данным.
«Mənim profilim» bölməsində ad, vəzifə, iş təcrübəsi, təhsil, bacarıq və dilləri yazın. İstəsəniz mövcud CV faylınızı yükləyin: məlumatlar oradan oxunub doldurulur.|In “My profile” enter your name, position, work experience, education, skills and languages. If you wish, upload your existing CV file: the data is read from it and filled in.|В разделе «Мой профиль» укажите имя, должность, опыт работы, образование, навыки и языки. При желании загрузите существующее резюме: данные считываются и заполняются из него.
«CV analizi» bölməsində CV-nizin güclü və zəif tərəflərinə AI rəyi alın.|In “CV analysis” get AI feedback on the strengths and weaknesses of your CV.|В разделе «Анализ резюме» получите отзыв ИИ о сильных и слабых сторонах резюме.
Profili yenilədikcə yeni versiya saxlanır; əvvəlki versiyaya qayıtmaq olar.|A new version is saved each time you update the profile; you can return to an earlier version.|При каждом обновлении профиля сохраняется новая версия; можно вернуться к предыдущей.
«Vakansiyalar» bölməsində axtarış və süzgəclərdən istifadə edin (şəhər, sahə, maaş və s.).|In “Vacancies” use search and filters (city, field, salary, etc.).|В разделе «Вакансии» используйте поиск и фильтры (город, сфера, зарплата и т. д.).
Hər vakansiyada profilinizə uyğunluq balı və niyə uyğun olduğunuz göstərilir.|Each vacancy shows your match score and why you are a match.|В каждой вакансии показываются оценка соответствия профилю и причина.
Bəyəndiyinizi yadda saxlayın, axtarışı saxlayın: yeni uyğun vakansiya çıxanda xəbər alırsınız.|Save the ones you like and save the search: you are notified when a new matching vacancy appears.|Сохраняйте понравившееся и поиск: вы получите уведомление, когда появится новая подходящая вакансия.
Vakansiyada «Müraciət et» düyməsini basın. Müraciətiniz qəbul olunan kimi bildiriş alırsınız.|Press “Apply” on a vacancy. You get a notification as soon as your application is received.|Нажмите «Откликнуться» в вакансии. Как только отклик принят, вы получите уведомление.
«Müraciətlərim» bölməsində status görünür: Göndərildi, Baxışda, Müsahibə, Təklif edildi, İşə qəbul edildi və ya Uyğun deyil.|In “My applications” the status is visible: Sent, Under review, Interview, Offered, Hired or Not a match.|В разделе «Мои отклики» виден статус: Отправлено, На рассмотрении, Собеседование, Предложено, Принят на работу или Не подходит.
Müsahibə dəvəti gələndə təklif olunan vaxtlardan birini seçin və ya imtina edin; təqvimə əlavə etmək üçün fayl yüklənir.|When an interview invitation arrives, pick one of the offered times or decline; a file is downloaded to add it to your calendar.|Когда приходит приглашение на собеседование, выберите одно из предложенных времён или откажитесь; для добавления в календарь скачивается файл.
Test göndərilibsə, «Müraciətlərim» və bildirişlərdən keçidlə həll edin.|If a test was sent, take it via the link in “My applications” and notifications.|Если отправлен тест, пройдите его по ссылке из «Моих откликов» и уведомлений.
İşəgötürən rədd səbəbini paylaşıbsa, burada görürsünüz. İstəsəniz müraciəti geri götürə bilərsiniz.|If the employer shared the reason for rejection, you see it here. You can withdraw the application if you wish.|Если работодатель поделился причиной отказа, вы видите её здесь. При желании можно отозвать отклик.
Müraciət statusu dəyişəndə bildiriş gəlir: hər dəfə yoxlamaq lazım deyil.|A notification arrives when the application status changes: no need to check every time.|При смене статуса отклика приходит уведомление: проверять каждый раз не нужно.
Süni intellekt CV-ni yaxşılaşdırmağa və karyera sualına cavab verməyə kömək edir.|Artificial intelligence helps improve the CV and answers career questions.|Искусственный интеллект помогает улучшить резюме и отвечает на карьерные вопросы.
«AI tövsiyələri» bölməsində profilinizə əsasən karyera və öyrənmə təklifləri alın.|In “AI recommendations” get career and learning suggestions based on your profile.|В разделе «Рекомендации ИИ» получайте карьерные и образовательные предложения на основе профиля.
«AI köməkçi» ilə söhbət edin: CV, müsahibə və vakansiya haqqında soruşun.|Chat with the “AI assistant”: ask about CVs, interviews and vacancies.|Общайтесь с «ИИ-помощником»: спрашивайте о резюме, собеседованиях и вакансиях.
Konkret vakansiya üçün CV-ni həmin elanın tələblərinə uyğunlaşdıra bilərsiniz.|You can tailor the CV to the requirements of a specific vacancy.|Резюме можно адаптировать под требования конкретной вакансии.
AI funksiyaları paketə və kredit sayına bağlı ola bilər: «Paketlər» bölməsində vəziyyətinizi görürsünüz.|AI features may depend on the plan and credit count: you see your status in “Plans”.|Функции ИИ могут зависеть от пакета и числа кредитов: свой статус вы видите в разделе «Пакеты».
«Kalkulyatorlar»da gross və net maaşı, məzuniyyət, xəstəlik müavinəti və digər hesablamaları edin (Əmək və Vergi Məcəlləsinə görə).|In “Calculators” calculate gross and net pay, vacation, sickness benefit and more (per the Labour and Tax Codes).|В «Калькуляторах» рассчитывайте gross и net, отпуск, пособие по болезни и другое (по Трудовому и Налоговому кодексам).
«İşçi əlavə et» ilə əl ilə və ya «Excel-dən əlavə et» ilə çoxlu işçi daxil edin (hər idxal üçün nümunə fayl var).|Add employees manually with “Add employee” or many at once with “Add from Excel” (there is a sample file for each import).|Добавляйте сотрудников вручную кнопкой «Добавить сотрудника» или массово через «Добавить из Excel» (для каждого импорта есть образец).
Süzgəc və KPI düymələri ilə ştatda yeri olmayanları, maaşı həddən kənar olanları, sınaq və müqaviləsi bitənləri tapın.|With the filter and KPI buttons find those without a staff place, those with salary outside the limit, and those whose probation or contract is ending.|Кнопками фильтра и KPI найдите сотрудников без места в штате, с зарплатой вне предела, с заканчивающимся испытательным сроком или договором.
«Ətraflı» ilə xronologiya, maaş müqayisəsi və əlavə sahələri görün; «Əlavə alətlər»də dublikat, kütləvi dəyişiklik, qəbul siyahısı və varislik var.|With “Details” see the timeline, salary comparison and extra fields; “Extra tools” has duplicates, bulk change, onboarding list and succession.|Через «Подробнее» смотрите хронологию, сравнение зарплат и дополнительные поля; в «Доп. инструментах» — дубликаты, массовое изменение, список адаптации и преемственность.
Qəbul, köçürmə, məzuniyyət, xitam və digər əmrləri bir yerdən hazırlayın.|Prepare hiring, transfer, vacation, termination and other orders in one place.|Готовьте приказы о приёме, переводе, отпуске, увольнении и другие в одном месте.
«Kadr hadisəsi» düyməsi ilə əmri hazırlayın; imzalayanları seçin (HR, rəhbər, direktor).|Prepare an order with the “HR event” button; choose the signers (HR, manager, director).|Подготовьте приказ кнопкой «Кадровое событие»; выберите подписантов (HR, руководитель, директор).
Əmr tam imzalananda işçi kartı özü yenilənir (vəzifə, maaş, status, tabel) və tarixçəyə yazılır; lazım olsa geri qaytarılır.|When the order is fully signed, the employee card updates itself (position, salary, status, timesheet) and is written to the history; it can be reverted if needed.|Когда приказ полностью подписан, карточка сотрудника обновляется сама (должность, зарплата, статус, табель) и записывается в историю; при необходимости можно отменить.
Reyestrdə gözləyən, geri qaytarılan və kartda tətbiq gözləyən əmrləri düymələrlə süzün; 3 gündən çox gözləyənlər qırmızıdır.|In the registry filter pending, returned and awaiting-application orders with the buttons; those waiting more than 3 days are red.|В реестре фильтруйте кнопками ожидающие, возвращённые и ожидающие применения приказы; ждущие более 3 дней выделены красным.
Cədvəl davamiyyətdən, maaşdan və vergi güzəştlərindən avtomatik hesablanır; mükafat, əlavə və tutulmaları əl ilə və ya Excel-lə daxil edin.|The table is calculated automatically from attendance, salary and tax reliefs; enter bonuses, additions and deductions manually or with Excel.|Таблица рассчитывается автоматически по посещаемости, зарплате и налоговым льготам; премии, надбавки и удержания вносите вручную или через Excel.
Təsdiqdən əvvəl «Təsdiqdən əvvəl yoxlama» xəta və fərqləri göstərir (maaş yoxdur, IBAN yoxdur, əvvəlki aya görə böyük dəyişiklik).|Before approval, “Pre-approval check” shows errors and differences (no salary, no IBAN, a big change versus the previous month).|Перед подтверждением «Проверка перед подтверждением» показывает ошибки и расхождения (нет зарплаты, нет IBAN, большое изменение к прошлому месяцу).
«Ayı təsdiqlə»: hesablama dondurulur, davamiyyət kilidlənir, işçilərə haqq-hesab vərəqəsi hazır olur.|“Approve the month”: the calculation is frozen, attendance is locked and payslips become ready for employees.|«Подтвердить месяц»: расчёт замораживается, посещаемость блокируется, расчётные листки становятся готовыми для сотрудников.
«Bank və ödəniş sənədləri» ilə bank faylı hazırlayın, ödənişləri qeyd edin və ya geri çəkin.|With “Bank and payment documents” prepare the bank file, record payments or withdraw them.|Через «Банковские и платёжные документы» готовьте банковский файл, отмечайте выплаты или отзывайте их.
Müavinət, filial bölgüsü, 1C jurnalı və illik yekun (Excel) ayrıca düymələrdədir.|Benefits, branch breakdown, 1C journal and the annual total (Excel) have separate buttons.|Пособия, распределение по филиалам, журнал 1C и годовой итог (Excel) вынесены на отдельные кнопки.
Hansı şöbəyə neçə nəfər lazımdır və maaş həddi nədir: işə qəbul bunun daxilində qalır.|How many people each section needs and what the salary limit is: hiring stays within this.|Сколько человек нужно каждому отделу и каков предел зарплаты: найм остаётся в этих рамках.
«Plan və fakt» bölməsində filial, departament, şöbə, vəzifə, say, ştat növbəsi və maaş həddini yazın (Excel ilə də olar).|In “Plan vs actual” enter the branch, department, section, position, number, staff type and salary limit (Excel is possible too).|В разделе «План и факт» укажите филиал, департамент, отдел, должность, число, тип штата и предел зарплаты (можно и через Excel).
Plan təsdiqə göndərilir; təsdiqdən sonra say və maaş həddindən artıq işçi götürmək olmur, istisna üçün təsdiq tələb olunur.|The plan is sent for approval; after approval you cannot hire above the number and salary limit, an exception needs approval.|План отправляется на подтверждение; после подтверждения нельзя нанимать сверх числа и предела зарплаты, для исключения нужно подтверждение.
Şöbə rəhbərləri «Ehtiyac təklifi» bölməsindən öz departamentləri üçün yeni yer təklif edir; təsdiqlənəndə plana yazılır və oradan vakansiya açmaq olar.|Department heads propose a new place for their department in “Hiring proposal”; when approved it is written into the plan and a vacancy can be opened from it.|Руководители отделов предлагают новое место для своего департамента в «Заявке на найм»; после подтверждения оно записывается в план, и оттуда можно открыть вакансию.
«Filiallar» bölməsində filial strukturunu, işçilərin bölgüsünü və satış bonusunu idarə edin.|In “Branches” manage the branch structure, the distribution of employees and the sales bonus.|В разделе «Филиалы» управляйте структурой филиалов, распределением сотрудников и бонусом за продажи.
«Kadr əməliyyatları»: məzuniyyət qrafiki, sənəd reyestri və müddətlər, işdən çıxma yoxlama siyahısı və əmlak qaytarma, təşkilat sxemi, ad günləri, əməyin mühafizəsi, qaydalar və razılıq.|“HR operations”: vacation schedule, document registry and deadlines, offboarding checklist and property return, org chart, birthdays, occupational safety, rules and consent.|«Кадровые операции»: график отпусков, реестр документов и сроки, чек-лист увольнения и возврат имущества, оргсхема, дни рождения, охрана труда, правила и согласие.
«Davamiyyət»: aylıq cədvəl, toplu qeyd (məzuniyyət, xəstəlik), Excel-dən yükləmə, istehsalat təqvimi.|“Attendance”: monthly table, bulk marking (vacation, sickness), Excel import, production calendar.|«Посещаемость»: месячная таблица, массовая отметка (отпуск, болезнь), загрузка из Excel, производственный календарь.
Ayı təsdiqlədikdən və ya kilidlədikdən sonra əl ilə dəyişiklik bağlanır; kilidi yalnız direktor və ya hesab sahibi səbəbi ilə açır.|After the month is approved or locked, manual changes are closed; only the director or account owner opens the lock, with a reason.|После подтверждения или блокировки месяца ручные изменения закрыты; блокировку снимает только директор или владелец аккаунта с указанием причины.
Bacarıq matrisi bacarıqları kataloqdan seçir; təlim planlayın və iştirakçıları əlavə edin.|The skills matrix picks skills from the catalogue; plan training and add participants.|Матрица навыков выбирает навыки из каталога; планируйте обучение и добавляйте участников.
Növbə qrafiki, ezamiyyət (rəsmi gündəlik normaları ilə), elan və sorğular (eNPS) burada idarə olunur.|Shift schedule, business trips (with official daily norms), announcements and surveys (eNPS) are managed here.|Здесь управляются график смен, командировки (с официальными суточными нормами), объявления и опросы (eNPS).
«Hesabatlar»da hər hesabatı süzgəc, müqayisə, qrafik və Excel ilə görün; böyük hesabatlar arxa planda hazırlanır; planlı e-poçt və Power BI açarı da var.|In “Reports” see every report with filters, comparison, charts and Excel; large reports are prepared in the background; scheduled e-mail and a Power BI key also exist.|В «Отчётах» смотрите каждый отчёт с фильтрами, сравнением, графиками и Excel; большие отчёты готовятся в фоне; есть также плановая отправка по e-mail и ключ Power BI.
«Təsdiqlər»də gözləyən sorğuya (ştat, maaş, vakansiya) baxın və qərar verin.|In “Approvals” review the pending request (staffing, salary, vacancy) and decide.|В «Подтверждениях» просмотрите ожидающий запрос (штат, зарплата, вакансия) и примите решение.
«Kalkulyatorlar»da əmək haqqı, məzuniyyət, xitam, son haqq-hesab və digərlərini hesablayın; işçi seçsəniz məlumat avtomatik dolur və maaş dəyişikliyi əmri hazırlaya bilərsiniz.|In “Calculators” calculate payroll, vacation, termination, final settlement and more; if you pick an employee the data fills in automatically and you can prepare a salary-change order.|В «Калькуляторах» считайте зарплату, отпуск, увольнение, окончательный расчёт и другое; если выбрать сотрудника, данные заполнятся автоматически, и можно подготовить приказ об изменении зарплаты.
İşçi siyahısını idarə edir; maaşı görmək üçün ayrıca maaş icazəsi lazımdır.|Manages the employee list; a separate salary permission is needed to see salaries.|Управляет списком сотрудников; для просмотра зарплаты нужно отдельное право.
Ştat sətirləri, struktur və tarixçə. Təsdiqlənmiş plan dəyişiklikləri direktora gedir.|Staff lines, structure and history. Changes to an approved plan go to the director.|Штатные строки, структура и история. Изменения утверждённого плана идут директору.
İşçilərin əmək haqqını, vergi və sığorta hesabını və təklif məbləğlərini görür və dəyişir.|Sees and changes employees' salaries, tax and insurance calculations and offer amounts.|Видит и меняет зарплаты сотрудников, расчёты налогов и страхования и суммы предложений.
Aylıq əmək haqqı cədvəlini hesablayır, avans verir, ödənişləri qeyd edir, haqq-hesab vərəqələrini və bank reyestrini hazırlayır.|Calculates the monthly payroll table, gives advances, records payments, prepares payslips and the bank registry.|Рассчитывает месячную ведомость, выдаёт авансы, отмечает выплаты, готовит расчётные листки и банковский реестр.
Şirkətdə işləyir və öz məlumatlarını, haqq-hesab vərəqəsini, məzuniyyətini izləyir.|Works at the company and follows their own data, payslip and vacation.|Работает в компании и отслеживает свои данные, расчётный листок и отпуск.
Şirkət sizə birdəfəlik kod verir: onunla işçi profiliniz hesabınıza bağlanır.|The company gives you a one-time code: with it your employee profile is linked to your account.|Компания даёт вам одноразовый код: с его помощью профиль сотрудника привязывается к вашему аккаунту.
«İş yerim (işçi profili)» bölməsində «İş yerini qoş» sahəsinə kodu yazın.|In “My workplace (employee profile)” enter the code in the “Link a workplace” field.|В разделе «Моё рабочее место (профиль сотрудника)» введите код в поле «Подключить место работы».
Qoşulandan sonra şirkət, vəzifə, departament, işə başlama tarixi, iş stajı və məzuniyyət qalığınız görünür.|After linking you see the company, position, department, start date, length of service and vacation balance.|После подключения видны компания, должность, департамент, дата начала работы, стаж и остаток отпуска.
Ay təsdiqlənəndən sonra haqq-hesab vərəqəniz hazır olur və bildiriş gəlir.|After the month is approved, your payslip is ready and a notification arrives.|После подтверждения месяца ваш расчётный листок готов, приходит уведомление.
Vərəqədə hesablanan məbləğ, vergi və sığorta tutulmaları, avans, ödənilənlər və qalıq göstərilir.|The slip shows the accrued amount, tax and insurance deductions, advance, payments and balance.|В листке указаны начисленная сумма, удержания налога и страхования, аванс, выплаты и остаток.
«Məzuniyyət təklif et» ilə istədiyiniz tarixləri bildirin; qrafikə düşür.|Tell us your preferred dates with “Propose a vacation”; they go into the schedule.|Укажите желаемые даты через «Предложить отпуск»; они попадают в график.
Digər ərizələr (məsələn arayış və ya icazə) «Yazışmalar reyestri»ndə qeyd olunur; HR cavabı və əmr nömrəsi orada görünür.|Other applications (e.g. a certificate or permission) are recorded in the “Correspondence registry”; the HR reply and order number appear there.|Другие заявления (например, справка или разрешение) фиксируются в «Реестре переписки»; ответ HR и номер приказа видны там.
Şəxsi məlumatınız dəyişibsə «Məlumatımın dəyişdirilməsi» ilə sorğu göndərin; HR təsdiq edəndən sonra kart yenilənir.|If your personal data changed, send a request with “Change my data”; the card updates after HR approves.|Если ваши личные данные изменились, отправьте запрос через «Изменение моих данных»; после подтверждения HR карточка обновится.
Növbəli işləyirsinizsə növbəni və kolleqa ilə dəyişdirmə sorğusunu burada idarə edirsiniz.|If you work in shifts, you manage your shift and the swap request with a colleague here.|Если вы работаете посменно, здесь вы управляете сменой и запросом на обмен с коллегой.
Elanları oxuyun, təlimat və tibbi baxışlarınıza baxın; ezamiyyət sorğusu göndərin.|Read announcements, see your briefings and medical examinations; send a business trip request.|Читайте объявления, смотрите инструктажи и медосмотры; отправляйте запрос на командировку.
Rəhbərsinizsə «Komandam» bölməsində komandanızın məzuniyyət və təsdiq gözləyən sorğularını görürsünüz.|If you are a manager, in “My team” you see your team's vacation and pending approval requests.|Если вы руководитель, в разделе «Моя команда» вы видите отпуска команды и запросы, ожидающие подтверждения.
Eyni şirkətdən eyni başlıqlı 4 elan|4 listings with the same title from the same company|4 объявления с одним названием от одной компании
Pedaqoji, elmi, tibbi, teatr və s. işçilərin müddətləri 118–121-ci maddələrlə ayrıca müəyyən edilir.|The durations for pedagogical, scientific, medical, theatre and other workers are set separately by articles 118–121.|Сроки для педагогических, научных, медицинских, театральных и других работников устанавливаются отдельно статьями 118–121.
Yalnız əmək haqqı anlayışına daxil olan ödənişlər (maaş, əlavə, mükafat) nəzərə alınır; əməyin ödənilməsi sisteminə daxil olmayan birdəfəlik ödənişlər nəzərə alınmır.|Only payments that count as salary (pay, supplements, bonuses) are taken into account; one-off payments outside the remuneration system are not.|Учитываются только выплаты, входящие в понятие заработной платы (оклад, надбавки, премии); разовые выплаты вне системы оплаты труда не учитываются.
Qismən ödənişli sosial məzuniyyətdə, işçinin təşəbbüsü olmayan ödənişsiz məzuniyyətdə olduğu və ya təqsiri olmadan boşdayanma səbəbindən tam işlənməyən aylar ən yaxın tam işlənən ayla əvəz edilir.|Months not fully worked because of partly paid social leave, unpaid leave not at the employee's initiative or downtime through no fault of the employee are replaced by the nearest fully worked month.|Месяцы, не отработанные полностью из-за частично оплачиваемого социального отпуска, неоплачиваемого отпуска не по инициативе работника или простоя без его вины, заменяются ближайшим полностью отработанным месяцем.
Məzuniyyət pulu qanunvericilikdə nəzərdə tutulmuş əmsallaşdırma qaydası ilə ödənilməlidir (140.7) — bu kalkulyatora daxil deyil.|Vacation pay must be paid under the coefficient procedure set by law (140.7) — this is not included in the calculator.|Отпускные должны выплачиваться по порядку приведения коэффициентов, установленному законом (140.7) — в калькулятор это не входит.
Məzuniyyət pulu məzuniyyətin başlanmasına ən geci 3 gün qalmış ödənilir.|Vacation pay is paid at the latest 3 days before the vacation starts.|Отпускные выплачиваются не позднее чем за 3 дня до начала отпуска.
Əmək müqaviləsinə xitam verilmə səbəbindən asılı olmayaraq istifadə edilməmiş əsas məzuniyyətə görə kompensasiya ödənilir.|Compensation for unused main vacation is paid regardless of the reason for terminating the employment contract.|Компенсация за неиспользованный основной отпуск выплачивается независимо от причины прекращения трудового договора.
Əlavə (115–117), təhsil, yaradıcılıq və sosial məzuniyyətlərə görə kompensasiya verilmir.|No compensation is paid for additional (115–117), study, creative and social leave.|Компенсация за дополнительные (115–117), учебные, творческие и социальные отпуска не выплачивается.
İş ili başa çatmamış hissə işlənmiş günlərə mütənasib sayılır — bu hesablama təxminidir.|The incomplete part of the working year is counted proportionally to days worked — this calculation is approximate.|Незавершённая часть рабочего года считается пропорционально отработанным дням — расчёт ориентировочный.
İşçi iş ili bitməmiş artıq məzuniyyət götürübsə, ödənilmiş məzuniyyət pulunun müvafiq hissəsi tutula bilər (144.4, 175.2ç).|If the employee took extra vacation before the working year ended, the corresponding part of the vacation pay paid may be deducted (144.4, 175.2ç).|Если работник взял лишний отпуск до окончания рабочего года, соответствующая часть выплаченных отпускных может быть удержана (144.4, 175.2ç).
Qismən ödənişli sosial məzuniyyətdə, işəgötürənin təşəbbüsü ilə ödənişsiz məzuniyyətdə və ya təqsirsiz boşdayanmada olan işçi üçün bir günlük məbləğ sonuncu bir günlük əmək haqqından az ola bilməz (177.3-1).|For an employee on partly paid social leave, unpaid leave at the employer's initiative or downtime through no fault of their own, the one-day amount cannot be below the last one-day salary (177.3-1).|Для работника в частично оплачиваемом социальном отпуске, неоплачиваемом отпуске по инициативе работодателя или в простое не по его вине однодневная сумма не может быть меньше последней однодневной зарплаты (177.3-1).
Xəbərdarlıq müddətində hər iş həftəsi azı bir iş günü orta əmək haqqı saxlanılmaqla iş axtarmaq üçün işdən azad edilir (77.2).|During the notice period the employee is released from work at least one working day every working week, keeping average pay, to look for a job (77.2).|В период уведомления работник освобождается от работы не менее одного рабочего дня в неделю с сохранением средней зарплаты для поиска работы (77.2).
İşdənçıxarma müavinəti ödənilir; kollektiv və ya əmək müqaviləsi daha yüksək məbləğ nəzərdə tuta bilər (77.6).|Severance pay is paid; a collective or employment contract may provide a higher amount (77.6).|Выплачивается выходное пособие; коллективный или трудовой договор может предусматривать большую сумму (77.6).
Müavinətdən məbləğlər tutulmur (175.4) və qanunla gəlir vergisindən azaddır (Vergi Məcəlləsi 102.1.4).|No amounts are deducted from the benefit (175.4) and by law it is exempt from income tax (Tax Code 102.1.4).|Из пособия удержания не производятся (175.4), и по закону оно освобождено от подоходного налога (НК 102.1.4).
Əmək müqaviləsinə xitam verilən gün işçi ilə tam hesablaşma aparılmalıdır.|Full settlement with the employee must be made on the day the employment contract is terminated.|В день прекращения трудового договора с работником должен быть произведён полный расчёт.
Aylıq gəlir 2500 AZN-ə qədərdirsə 200 AZN gəlir vergisindən azaddır (VM 102.1.6) — bu, yalnız əsas iş yerində tətbiq olunur və aylıq məcmu gəlirə görə hesablanır.|If monthly income is up to 2500 AZN, 200 AZN is exempt from income tax (TC 102.1.6) — this applies only at the main workplace and is based on total monthly income.|Если месячный доход не превышает 2500 AZN, 200 AZN освобождаются от подоходного налога (НК 102.1.6) — это применяется только по основному месту работы и исходя из совокупного месячного дохода.
Məbləğ təxminidir: bu ayın digər ödənişləri (mükafat, əlavə) ayrıca daxil edilməlidir.|The amount is approximate: other payments of this month (bonus, supplement) must be entered separately.|Сумма ориентировочная: другие выплаты этого месяца (премия, надбавка) нужно вводить отдельно.
Bayram günləri və istirahət günlərinə təsadüf edən bayramların keçirildiyi günlər iş günü sayılmır. Qısaldılmış (bayram qabağı) günlər iş günü sayılır.|Holidays and the days to which holidays falling on rest days are moved are not working days. Shortened (pre-holiday) days count as working days.|Праздничные дни и дни, на которые перенесены праздники, выпавшие на выходные, не считаются рабочими. Сокращённые (предпраздничные) дни считаются рабочими.
Doğuş gözlənilən gündən gec olarsa, doğuşdan əvvəlki hissə o qədər gün ödənişli uzadılır; doğuşdan sonrakı hissə qısalmır (125.3).|If the birth is later than the expected date, the pre-birth part is extended by that many paid days; the post-birth part is not shortened (125.3).|Если роды наступили позже ожидаемой даты, дородовая часть продлевается на столько же оплачиваемых дней; послеродовая часть не сокращается (125.3).
Uşağı doğulan kişiyə tibb müəssisəsinin arayışı ilə cəmi 14 təqvim günü ödənişli məzuniyyət verilir (125.4).|A man whose child is born is given 14 calendar days of paid leave in total on a medical institution's certificate (125.4).|Мужчине, у которого родился ребёнок, по справке медучреждения предоставляется всего 14 календарных дней оплачиваемого отпуска (125.4).
Əmək məzuniyyətinə görə staj bir işəgötürəndə faktiki işlənmiş dövrdən və əmək qabiliyyətinin müvəqqəti itirildiyi, orta əmək haqqı saxlanılan dövrlərdən ibarətdir. Pensiya stajı başqa qaydalarla hesablanır.|Service for vacation consists of the period actually worked with one employer and periods of temporary incapacity with average pay retained. Pension service is calculated under other rules.|Стаж для отпуска состоит из фактически отработанного у одного работодателя времени и периодов временной нетрудоспособности с сохранением средней зарплаты. Пенсионный стаж считается по другим правилам.
İş vaxtından artıq iş işəgötürənin əmri və işçinin razılığı ilə görülür (99.1).|Overtime is done on the employer's order and with the employee's consent (99.1).|Сверхурочная работа выполняется по приказу работодателя и с согласия работника (99.1).
Ardıcıl iki iş günü ərzində 4 saatdan, zərərli/ağır şəraitdə 2 saatdan çox artıq işə cəlb edilə bilməz (100.1).|One may not be made to work more than 4 hours of overtime over two consecutive working days, or 2 hours in harmful/heavy conditions (100.1).|Нельзя привлекать к сверхурочной работе более 4 часов в течение двух рабочих дней подряд, а во вредных/тяжёлых условиях — более 2 часов (100.1).
Hamilə, 14 yaşınadək uşağı olan qadınlar və 18 yaşınadək işçilər artıq işə cəlb edilmir (242, 254).|Pregnant women, women with a child under 14 and employees under 18 are not made to work overtime (242, 254).|Беременные, женщины с ребёнком до 14 лет и работники до 18 лет к сверхурочной работе не привлекаются (242, 254).
Aylıq maaş alan işçiyə iş aylıq iş vaxtı norması daxilində görülübsə, maaşdan əlavə bir günlük (saatlıq) məbləğ, normadan artıq görülübsə iki qat məbləğ ödənilir.|A monthly-salaried employee gets one extra day's (hour's) amount on top of salary if the work was within the monthly working-time norm, and double if above the norm.|Работнику с месячным окладом, если работа выполнена в пределах месячной нормы времени, к зарплате добавляется однодневная (часовая) сумма, а если сверх нормы — двойная.
Vaxtamuzd sistemdə ayrıca hesablanırsa, gündəlik (saatlıq) tarif maaşının iki mislindən az olmamalıdır.|If calculated separately under a time-based system, it must not be less than twice the daily (hourly) tariff pay.|При отдельном расчёте по повременной системе она не должна быть меньше двукратной дневной (часовой) тарифной ставки.
İşçinin arzusu ilə əmək haqqı əvəzinə başqa istirahət günü verilə bilər (164.2).|At the employee's request, another rest day may be given instead of pay (164.2).|По желанию работника вместо оплаты может быть предоставлен другой день отдыха (164.2).
Gecə işinə əlavənin faizi qanunda yazılmayıb: əmək və ya kollektiv müqavilə ilə, müvafiq orqanın müəyyən etdiyi həddən aşağı olmamaqla təyin edilir.|The percentage of the night-work supplement is not written in the law: it is set by the employment or collective contract, not below the limit set by the relevant authority.|Процент надбавки за ночную работу в законе не указан: он устанавливается трудовым или коллективным договором, не ниже предела, определённого соответствующим органом.
Bir saatın dəyəri aylıq maaşın aylıq norma saatına bölünməsi ilə götürülür — Məcəllə bölmə qaydasını yazmır, adi mühasibat təcrübəsidir. Norma saatını istehsalat təqvimindən götürün.|The value of one hour is taken by dividing the monthly salary by the monthly norm hours — the Code does not state the division rule, it is ordinary accounting practice. Take the norm hours from the production calendar.|Стоимость одного часа берётся делением месячной зарплаты на месячную норму часов — Кодекс не указывает правило деления, это обычная бухгалтерская практика. Норму часов берите из производственного календаря.
Zərər işçinin təqsiri ilə vurulubsa, tutulan məbləğ onun orta aylıq əmək haqqından çox ola bilməz (175.2c).|If the damage was caused through the employee's fault, the amount deducted cannot exceed their average monthly salary (175.2c).|Если ущерб причинён по вине работника, удерживаемая сумма не может превышать его среднюю месячную зарплату (175.2c).
ƏDV dərəcəsi 18%; sadələşdirilmiş vergi 2% (xüsusi hallarda 6–8%); vergi uçotunda olan fərdi sahibkarın gəlirindən 20%.|The VAT rate is 18%; simplified tax 2% (6–8% in special cases); 20% of the income of an individual entrepreneur registered with the tax authority.|Ставка НДС — 18%; упрощённый налог — 2% (в особых случаях 6–8%); 20% с дохода индивидуального предпринимателя, состоящего на налоговом учёте.
: ştat planını qurmaq (filial, departament, şöbə, vəzifə, say, maaş həddi); qrafikdəki plan xətti təsdiqlənmiş ştat planından gəlir.|: build the staff plan (branch, department, section, position, number, salary limit); the plan line in the chart comes from the approved staff plan.|: составить штатный план (филиал, департамент, отдел, должность, число, предел зарплаты); линия плана на графике берётся из утверждённого штатного плана.
: sertifikat, tədbir, hədiyyə, tibbi, geyim, işə qəbul və digər xərclər; yaz, təsdiqlə, ödə.|: certificate, event, gift, medical, clothing, hiring and other expenses; enter, approve, pay.|: сертификаты, мероприятия, подарки, медицина, одежда, найм и другие расходы; внести, подтвердить, оплатить.
Hesabatlar, İşçilər və Təlimlər bölmələri bu rəqəmləri yalnız göstərir və bura yönləndirir.|The Reports, Employees and Training sections only show these figures and redirect here.|Разделы «Отчёты», «Сотрудники» и «Обучение» лишь показывают эти цифры и ведут сюда.
fakt: real / sifarişdə / gözləyən|actual: real / on order / pending|факт: реальный / в заказе / ожидающий
son tarixə 4 gün qalıb|4 days until the deadline|до срока осталось 4 дня
Departamentinizə neçə nəfər, hansı vəzifəyə və nə vaxt lazım olduğunu yazın. Təklif direktorun təsdiqinə gedir; təsdiqlənəndə plana yazılır və yer işə qəbul üçün açılır. Səbəb məcburidir.|Write how many people your department needs, for which position and when. The proposal goes to the director for approval; once approved it is written into the plan and the place is opened for hiring. A reason is required.|Укажите, сколько человек нужно вашему департаменту, на какую должность и когда. Предложение идёт на подтверждение директору; после подтверждения оно записывается в план, и место открывается для найма. Причина обязательна.
Vəzifə artıq planda varsa, maaş yazmaq lazım deyil: mövcud sətrə yer əlavə olunur və onun maaş həddi qalır.|If the position is already in the plan, no salary is needed: a place is added to the existing line and its salary limit stays.|Если должность уже есть в плане, зарплату указывать не нужно: место добавляется к существующей строке, предел зарплаты сохраняется.
Göndərdiyim təkliflər (|Proposals I sent (|Отправленные мной предложения (
“əlavə” — rolda yoxdur, amma hesab sahibi bu icazəni konkret şəxsə verə bilər. “—” — yalnız rolla gəlir, ayrıca verilmir.|“extra” — not in the role, but the account owner can give this permission to a specific person. “—” — comes only with the role, not given separately.|«доп.» — в роли нет, но владелец аккаунта может дать это право конкретному человеку. «—» — входит только в роль, отдельно не выдаётся.
Kim kimə hansı rolu və ya icazəni nə vaxt verib, dəvət göndərib və ya komandadan çıxarıb.|Who gave which role or permission to whom and when, sent an invitation or removed someone from the team.|Кто кому и когда выдал роль или право, отправил приглашение или удалил из команды.
İşçi kartları, əmrlər, sənəd qovluğu, şəxsi məlumatlar və davamiyyət (maaşsız)|Employee cards, orders, document folder, personal data and attendance (without salaries)|Карточки сотрудников, приказы, папка документов, личные данные и посещаемость (без зарплат)
Şöbə rəhbəri + ştat cədvəli, departament və şöbələr (dəyişikliklər direktora gedir)|Department head + staff schedule, departments and sections (changes go to the director)|Руководитель отдела + штатное расписание, департаменты и отделы (изменения идут директору)
Şöbə rəhbəri + vakansiyanı təsdiqsiz yayımlayır, təklif və test göndərir|Department head + publishes a vacancy without approval, sends offers and tests|Руководитель отдела + публикует вакансию без подтверждения, отправляет предложения и тесты
Sənəd 23 Oct 2026 tarixində göndərilib, administrator yoxlayır.|The document was sent on 23 Oct 2026; the administrator is reviewing it.|Документ отправлен 23 окт 2026; администратор проверяет.
Loqo, Şirkət haqqında, Sahə, İşçi sayı, Vebsayt, Ofis ünvanı, Yarandığı il, Sosial şəbəkə və ya video, Şəkil qalereyası|Logo, About the company, Industry, Number of employees, Website, Office address, Year founded, Social network or video, Picture gallery|Логотип, О компании, Сфера, Число сотрудников, Сайт, Адрес офиса, Год основания, Соцсеть или видео, Галерея фото
Şəkil qalereyası (ofis, komanda; PNG/JPG/WEBP, hər biri 300 KB-a qədər, ən çoxu|Picture gallery (office, team; PNG/JPG/WEBP, up to 300 KB each, at most|Галерея фото (офис, команда; PNG/JPG/WEBP, до 300 КБ каждое, не более
FİN, SSN, VÖEN, vəsiqə nömrəsi, IBAN, hesab və kart nömrələri bazada şifrələnmiş saxlana bilər. Şifrələmə açarı serverdə gizli dəyər (DATA_KEY) kimi qoyulur; açar itirilərsə şifrələnmiş məlumat bərpa olunmur, ona görə açarın ehtiyat nüsxəsini ayrıca saxlayın.|FIN, SSN, VÖEN, ID number, IBAN, account and card numbers can be stored encrypted in the database. The encryption key is set on the server as a secret value (DATA_KEY); if the key is lost, encrypted data cannot be recovered, so keep a backup copy of the key separately.|FIN, SSN, VÖEN, номер удостоверения, IBAN, номера счетов и карт могут храниться в базе в зашифрованном виде. Ключ шифрования задаётся на сервере как секретное значение (DATA_KEY); при утере ключа зашифрованные данные не восстановить, поэтому храните резервную копию ключа отдельно.
· şifrələnmiş profil:|· encrypted profile:|· зашифрованный профиль:
· 239 ₼/ay (ƏDV daxil)|· 239 ₼/month (VAT included)|· 239 ₼/мес. (НДС включён)
. Ödənişli dəyişiklik hesab-faktura yaradır; ödəniş bank köçürməsi ilə aşağıdakı «Hesab-fakturalar»da qeyd olunur.|. A paid change creates an invoice; the payment is recorded by bank transfer in “Invoices” below.|. Платное изменение создаёт счёт-фактуру; оплата банковским переводом отмечается ниже в «Счетах-фактурах».
Pul, ştat və ya işçinin işini dəyişən qərarlar bir nəfərin qərarı ilə yox, təsdiq zənciri ilə keçir. Solda bölməni seçirsiniz, ortada siyahıya baxırsınız, sağda sorğunun təfərrüatı və qərar düymələri açılır.|Decisions that change money, staffing or an employee's job go through an approval chain, not one person's decision. You pick a section on the left, look at the list in the middle, and on the right the request details and decision buttons open.|Решения, меняющие деньги, штат или работу сотрудника, проходят цепочку подтверждения, а не решение одного человека. Слева вы выбираете раздел, посередине смотрите список, справа открываются детали запроса и кнопки решения.
Vakansiya: rekruter/şöbə rəhbəri yaradanda HR meneceri, sonra direktor təsdiqləyir; sonra yayımlanır.|Vacancy: when a recruiter/department head creates it, the HR manager approves, then the director; then it is published.|Вакансия: если её создаёт рекрутер/руководитель отдела, подтверждают HR-менеджер, затем директор; потом она публикуется.
İş təklifi, maaş dəyişikliyi, işdən çıxarma və ştat planı: direktor (və ya adla seçilmiş şəxslər, limitlə) təsdiqləyir.|Job offer, salary change, dismissal and staff plan: the director (or named persons, with a limit) approves.|Предложение о работе, изменение зарплаты, увольнение и штатный план: подтверждает директор (или назначенные лица в пределах лимита).
Sorğunu göndərən özünü təsdiqləyə bilməz. “Məlumat istə” sorğunu göndərənə qaytarır. 5 gündən çox gözləyən sorğu hesab sahibinə bildirilir.|The sender cannot approve their own request. “Ask for information” returns the request to the sender. A request waiting more than 5 days is reported to the account owner.|Отправитель не может подтвердить собственный запрос. «Запросить информацию» возвращает запрос отправителю. О запросе, ожидающем более 5 дней, уведомляется владелец аккаунта.
Təfərrüatdakı keçid sizi təsdiq etdiyiniz işçiyə, müraciətə, vakansiyaya və ya ştat sətrinə dəqiq aparır.|The link in the details takes you exactly to the employee, application, vacancy or staff line you are approving.|Ссылка в деталях ведёт точно к сотруднику, заявке, вакансии или штатной строке, которую вы подтверждаете.
Hesabatın adına basın: açılır, öz süzgəcləri (dövr, departament, vəziyyət və s.) ilə baxılır, Excel və ya çap kimi çıxarılır.|Click a report's name: it opens, is viewed with its own filters (period, department, status, etc.) and exported to Excel or printed.|Нажмите на название отчёта: он открывается, просматривается со своими фильтрами (период, департамент, состояние и т. д.), выгружается в Excel или печатается.
Vakansiyalar, müraciətlər, müsahibə, təklif və işə qəbul göstəriciləri; tarix və vakansiya üzrə süzgəc.|Vacancy, application, interview, offer and hiring indicators; filter by date and vacancy.|Показатели вакансий, заявок, собеседований, предложений и найма; фильтр по дате и вакансии.
Müraciətlər hər mərhələyə nə qədər çatır, mərhələlər arasında orta neçə gün keçir, təkliflərin neçə faizi qəbul olunub və bir işə qəbulun orta dəyəri (işə qəbul xərcləri).|How many applications reach each stage, the average days between stages, what percentage of offers are accepted, and the average cost of a hire (hiring costs).|Сколько заявок доходит до каждого этапа, сколько в среднем дней между этапами, какой процент предложений принят и средняя стоимость найма (расходы на найм).
Departament üzrə işçi, plan, büdcə ilə fond, məzuniyyət borcu və dövriyyə; il üzrə süzgəc.|Employees by department, plan, fund versus budget, vacation liability and turnover; filter by year.|Сотрудники по департаментам, план, фонд и бюджет, обязательства по отпускам и текучесть; фильтр по году.
Hər işçiyə nə qədər hesablanıb, nə qədər və nəyə görə ödənilib, hər tərəfin borcu; dövr üzrə süzgəc, aylar üzrə ətraflı jurnal.|How much was accrued to each employee, how much was paid and for what, each side's debt; filter by period, detailed log by month.|Сколько начислено каждому сотруднику, сколько и за что выплачено, долг каждой стороны; фильтр по периоду, подробный журнал по месяцам.
Seçilmiş ay üçün hər işçinin hesablanan, tutulan və ödəniləcək məbləği.|For the chosen month, each employee's accrued, deducted and payable amounts.|За выбранный месяц — начисленная, удержанная и подлежащая выплате сумма по каждому сотруднику.
Son 12 ayda işçi sayı, işə qəbul və çıxış qrafiki, 3 aylıq proqnoz, ştat cədvəli ilə faktiki işçi müqayisəsi və xəbərdarlıqlar.|Headcount over the last 12 months, hire and exit chart, 3-month forecast, staff schedule versus actual employees and warnings.|Численность за последние 12 месяцев, график найма и увольнений, прогноз на 3 месяца, сравнение штатного расписания с фактическими сотрудниками и предупреждения.
Bütün işçilərin siyahısı: vəzifə, departament, status, işə başlama, staj, sınaq və müqavilə sonu, əlaqə (maaş yalnız icazəsi olana görünür). Çox işçisi olan şirkət üçün arxa planda hazırlana bilər.|List of all employees: position, department, status, start date, service, probation and contract end, contact (salary is visible only to those with permission). For a company with many employees it can be prepared in the background.|Список всех сотрудников: должность, департамент, статус, начало работы, стаж, окончание испытательного срока и договора, контакты (зарплата видна только при наличии права). Для компании с большим числом сотрудников может готовиться в фоне.
İşdən çıxanlar: kim, hansı departamentdən, nə qədər işləyib, hansı səbəblə. İlk il dövriyyəsi və çıxış səbəbləri yuxarıda xülasə kimi yazılır.|Leavers: who, from which department, how long they worked, for what reason. First-year turnover and exit reasons are summarized above.|Ушедшие: кто, из какого департамента, сколько проработал, по какой причине. Текучесть первого года и причины ухода указаны сводкой выше.
Hər ayın gross, net və işəgötürən xərci, əvvəlki aya görə dəyişiklik və həmin ayda neçə işə qəbul, çıxış və maaş dəyişikliyi olub.|Each month's gross, net and employer cost, the change versus the previous month and how many hires, exits and salary changes there were that month.|Gross, net и расходы работодателя за каждый месяц, изменение к прошлому месяцу и сколько было приёмов, увольнений и изменений зарплаты в этом месяце.
Filial, departament, şöbə, vəzifə və pillə üzrə plan, faktiki işçi, boş yer, dövr, maaş həddi və aylıq xərc; boş yeri olanları və aktiv olmayan sətirləri ayırmaq olar.|Plan, actual employees, vacant places, period, salary limit and monthly cost by branch, department, section, position and grade; lines with vacancies and inactive lines can be separated.|План, фактические сотрудники, свободные места, период, предел зарплаты и месячные расходы по филиалам, департаментам, отделам, должностям и ступеням; можно выделить строки со свободными местами и неактивные.
Hər departamentin plan üzrə maksimum aylıq maaş fondu (maaş həddi × say), faktiki işçilərin gross maaşı və fərq; plan xərci işəgötürən payları ilə.|Each department's maximum monthly payroll fund by plan (salary limit × number), the actual employees' gross pay and the difference; plan cost with employer contributions.|Максимальный месячный фонд зарплаты каждого департамента по плану (предел зарплаты × число), gross фактических сотрудников и разница; плановые расходы со взносами работодателя.
Ştatda yeri olmayan işçilər və maaşı ştat həddindən kənar olanlar: düzəldilməsi lazım olan siyahı.|Employees without a staff place and those whose salary is outside the staff limit: a list to be fixed.|Сотрудники без места в штате и с зарплатой вне штатного предела: список для исправления.
Plandan kənar yer, departament təklifi, maaş həddi və işçi maaş artımı sorğuları: kim, nə vaxt, səbəb və qərar. İlkin plan ilə hazırkı planın fərqi də göstərilir.|Out-of-plan place, department proposal, salary limit and employee salary increase requests: who, when, reason and decision. The difference between the initial and current plan is also shown.|Запросы на внеплановое место, предложение департамента, предел зарплаты и повышение зарплаты сотрудника: кто, когда, причина и решение. Показывается и разница между первоначальным и текущим планом.
Çıxış tarixi təyin olunmuş və ya müddətli müqaviləsi bitən işçilər: bu yerlər üçün əvvəlcədən vakansiya açmaq olar.|Employees with a set exit date or an ending fixed-term contract: a vacancy can be opened for these places in advance.|Сотрудники с назначенной датой ухода или заканчивающимся срочным договором: на эти места можно заранее открыть вакансию.
Vakansiyanın açıldığı gündən işçi kartının yarandığı günə qədər keçən müddət (platforma üzərindən işə götürülənlər).|The time from the day a vacancy was opened to the day the employee card was created (for those hired through the platform).|Время от открытия вакансии до создания карточки сотрудника (для принятых через платформу).
Hər filialın planı, faktiki işçi sayı, boş yer, plan xərci və faktiki gross fond bir cədvəldə.|Each branch's plan, actual headcount, vacant places, plan cost and actual gross fund in one table.|План каждого филиала, фактическая численность, свободные места, плановые расходы и фактический gross-фонд в одной таблице.
Ay üzrə hər işçinin gecikdiyi və erkən çıxdığı günlərin sayı və cəmi dəqiqə (giriş-çıxış qeydinə görə).|For each employee by month, the number of days late or leaving early and total minutes (from clock-in/out records).|По каждому сотруднику за месяц — число дней опозданий и раннего ухода и суммарные минуты (по записям прихода/ухода).
Hər işçinin istifadə olunmamış məzuniyyət günləri və təxmini maliyyə öhdəliyi (qalıq gün × orta gündəlik maaş; təxmini hesablamadır).|Each employee's unused vacation days and estimated financial liability (remaining days × average daily pay; an approximate calculation).|Неиспользованные дни отпуска каждого сотрудника и ориентировочное финансовое обязательство (остаток дней × средняя дневная зарплата; ориентировочный расчёт).
Ay üzrə hər işçinin norma, işlənmiş gün və məzuniyyət, xəstəlik, yoxluq günləri.|For each employee by month: norm, days worked and vacation, sickness and absence days.|По каждому сотруднику за месяц: норма, отработанные дни и дни отпуска, болезни, отсутствия.
Ay üzrə işlənən saat, artıq iş, istirahət/bayram günü və gecə saatları.|Hours worked by month, overtime, rest/holiday day and night hours.|Отработанные часы за месяц, сверхурочные, часы в выходные/праздники и ночные часы.
Ezamiyyətlər, gündəlik, avans, xərc və hesablaşma; tarix və vəziyyət üzrə süzgəc.|Business trips, per diem, advance, expenses and settlement; filter by date and status.|Командировки, суточные, аванс, расходы и расчёты; фильтр по дате и состоянию.
İşçilərin ərizələri, vəziyyəti və cavab müddəti; tarix, növ və vəziyyət üzrə süzgəc.|Employees' applications, status and response time; filter by date, type and status.|Заявления сотрудников, их состояние и срок ответа; фильтр по дате, типу и состоянию.
Çıxan işçilər, siyahının icrası, qaytarılmamış əmlak və çıxış səbəbləri.|Leavers, checklist completion, unreturned property and exit reasons.|Уходящие сотрудники, выполнение чек-листа, невозвращённое имущество и причины ухода.
Əmlakın siyahısı, kimdə olduğu və dəyəri; vəziyyət və kateqoriya üzrə süzgəc.|List of property, who has it and its value; filter by status and category.|Список имущества, у кого оно и его стоимость; фильтр по состоянию и категории.
Müddəti bitən və ya bitməyə yaxın sənədlər (vəsiqə, tibbi arayış, sertifikat).|Documents that have expired or are about to (ID, medical certificate, certificate).|Документы с истёкшим или истекающим сроком (удостоверение, медсправка, сертификат).
Gözləyən, təsdiqlənən və rədd edilən sorğular, orta qərar müddəti və qərar verənlər üzrə bölgü.|Pending, approved and rejected requests, average decision time and breakdown by decision-makers.|Ожидающие, подтверждённые и отклонённые запросы, средний срок решения и распределение по принимающим решения.
Komanda üzvlərinin son əməliyyatları (maaş, ştat, təsdiq, sənəd, idxal): kim, nə vaxt, nəyi dəyişib.|Latest actions of team members (salary, staffing, approval, document, import): who, when, what they changed.|Последние действия участников команды (зарплата, штат, подтверждение, документ, импорт): кто, когда, что изменил.
Ştat planını CSV kimi canlı oxumaq üçün açar yaradın. Fayl şəxsi ad və maaş içərmir, yalnız ştat sətirləri, say, maaş həddi və xərc. Excel: Data → From Web; Power BI: Get data → Web, başlıq|Create a key to read the staff plan live as CSV. The file contains no personal names or salaries, only staff lines, numbers, salary limits and costs. Excel: Data → From Web; Power BI: Get data → Web, header|Создайте ключ, чтобы читать штатный план в реальном времени как CSV. Файл не содержит имён и зарплат, только штатные строки, числа, пределы зарплат и расходы. Excel: Data → From Web; Power BI: Get data → Web, заголовок
“Vakansiyalarım” bölməsində yeni vakansiya yaradın; sistem sizin təsvirinizə görə qaralama hazırlayır, yoxlayıb dərc edirsiniz.|In “My vacancies” create a new vacancy; the system prepares a draft from your description and you check and publish it.|В разделе «Мои вакансии» создайте новую вакансию; система подготовит черновик по вашему описанию, вы проверите и опубликуете.
“Komanda və rollar” bölməsində e-poçt, rol və ya hazır şablon seçin. İstifadəçi həmin e-poçtla şirkət hesabı kimi daxil olub dəvəti qəbul edir.|In “Team and roles” pick an e-mail, a role or a ready template. The user signs in with that e-mail as a company account and accepts the invitation.|В разделе «Команда и роли» выберите e-mail, роль или готовый шаблон. Пользователь входит с этим e-mail как аккаунт компании и принимает приглашение.
“Testlər” bölməsində test yaradın (və ya Word/Excel/PDF faylından yükləyin), sonra namizəd kartından və ya toplu seçimlə göndərin.|In “Tests” create a test (or import from a Word/Excel/PDF file), then send it from the candidate card or by bulk selection.|В разделе «Тесты» создайте тест (или загрузите из файла Word/Excel/PDF), затем отправьте из карточки кандидата или массовым выбором.
Müraciət vakansiyanın son seçim mərhələsinə çatdıqdan sonra. Təklif şablonlarını saxlaya bilərsiniz.|After an application reaches the vacancy's last selection stage. You can save offer templates.|После того как заявка достигла последнего этапа отбора по вакансии. Шаблоны предложений можно сохранять.
“Şirkət məlumatları” bölməsində VÖEN və qeydiyyat sənədini yükləyin; administrator yoxladıqdan sonra nişan görünəcək.|In “Company details” upload the VÖEN and registration document; the badge appears after the administrator checks it.|В разделе «Данные компании» загрузите VÖEN и регистрационный документ; значок появится после проверки администратором.
Vakansiyalar, müraciətlər, testlər, işçi sənədləri və şablonlar birdəfəlik silinir; maliyyə uçotu üçün hesab-fakturalar saxlanılır.|Vacancies, applications, tests, employee documents and templates are deleted permanently; invoices are kept for financial records.|Вакансии, заявки, тесты, документы сотрудников и шаблоны удаляются безвозвратно; счета-фактуры сохраняются для финансового учёта.
işçi ·|employees ·|сотрудников ·
İşçi siyahısı (|Employee list (|Список сотрудников (
, super-gross (işəgötürənin ümumi xərci)|, super-gross (the employer's total cost)|, super-gross (общие расходы работодателя)
Bütün əmrlər bir yerdə: kim hazırlayıb, kimdə növbədir, kim təsdiqləyib və ya geri göndərib. Gözləyən:|All orders in one place: who prepared them, whose turn it is, who approved or returned them. Pending:|Все приказы в одном месте: кто подготовил, у кого очередь, кто подтвердил или вернул. Ожидает:
Əlavə əmək məzuniyyəti haqqında əmr (staj, zərərli şərait, uşaqlı işçi)|Order on additional leave (service, harmful conditions, employee with children)|Приказ о дополнительном отпуске (стаж, вредные условия, работник с детьми)
). Əl ilə dəyişiklik və Excel yükləməsi bağlıdır; imzalanmış əmrlər cədvəli yenə də yeniləyir.|). Manual changes and Excel upload are closed; signed orders still update the table.|). Ручные изменения и загрузка Excel закрыты; подписанные приказы по-прежнему обновляют таблицу.
Qeyd olunmayan iş günü “işlənib” sayılır; uzaqdan iş, ezamiyyət və təlim də işlənmiş gün sayılır. Sarı|A working day with no mark counts as “worked”; remote work, business trips and training also count as worked days. Yellow|Неотмеченный рабочий день считается «отработанным»; удалённая работа, командировка и обучение также считаются отработанными днями. Жёлтый
sütunu bayram ərəfəsidir: qısaldılmış gündə 1 saat az işlənir, haqq isə 8 saat üçün tam ödənilir.|column is a holiday eve: 1 hour less is worked on a shortened day, but pay is in full for 8 hours.|столбец — канун праздника: в сокращённый день отрабатывается на 1 час меньше, а оплата полная за 8 часов.
— bayram və ya köçürülmüş istirahət günü, boz sütun — istirahət. Xanaya basıb həmin günü qeyd edin.|— a holiday or moved rest day, grey column — rest. Click a cell to mark that day.|— праздник или перенесённый выходной, серый столбец — выходной. Нажмите на ячейку, чтобы отметить день.
Uİ — Uzaqdan işləyir · EZ — Ezamiyyətdə · TS — Təlim və ya seminarda · ƏM — Əmək məzuniyyəti · ƏL — Əlavə əmək məzuniyyəti (staj, zərərli şərait) · YM — Yaradıcılıq məzuniyyəti · AN — Analıq (hamiləlik və doğuş) · UQ — Uşağa qulluq məzuniyyəti · AT — Atalıq məzuniyyəti · TM — Təhsil məzuniyyəti · ÖH — Öz hesabına (ödənişsiz) məzuniyyət · XS — Xəstəlik (xəstəlik vərəqəsi) · İQ — İş qəzası və ya peşə xəstəliyi · TX — Tibbi müayinə (arayışla) · QV — Qan vermə (donor günü) · AH — Ailə hadisəsi (toy, vəfat) ilə bağlı icazə · İC — İcazəli yoxluq (ərizə ilə) · ÇG — Məhkəməyə və ya dövlət orqanına çağırış · HT — Hərbi toplanış və ya hərbi çağırış · DY — İşin dayanması (işəgötürənin səbəbi ilə) · KN — İşdən kənarlaşdırılıb · GM — İşə gəlməyib (üzrsüz)|Uİ — Works remotely · EZ — On a business trip · TS — At training or seminar · ƏM — Annual leave · ƏL — Additional leave (service, harmful conditions) · YM — Creative leave · AN — Maternity (pregnancy and childbirth) · UQ — Childcare leave · AT — Paternity leave · TM — Study leave · ÖH — Unpaid leave (at own expense) · XS — Sickness (sick note) · İQ — Work accident or occupational disease · TX — Medical check-up (with certificate) · QV — Blood donation (donor day) · AH — Permission for a family event (wedding, death) · İC — Permitted absence (by application) · ÇG — Summons to court or a state body · HT — Military training or call-up · DY — Work stoppage (employer's reason) · KN — Suspended from work · GM — Absent (unexcused)|Uİ — Работает удалённо · EZ — В командировке · TS — На обучении или семинаре · ƏM — Трудовой отпуск · ƏL — Дополнительный отпуск (стаж, вредные условия) · YM — Творческий отпуск · AN — Декретный (беременность и роды) · UQ — Отпуск по уходу за ребёнком · AT — Отпуск отца · TM — Учебный отпуск · ÖH — Отпуск за свой счёт · XS — Болезнь (больничный лист) · İQ — Несчастный случай на работе или профзаболевание · TX — Медосмотр (по справке) · QV — Сдача крови (день донора) · AH — Разрешение в связи с семейным событием (свадьба, смерть) · İC — Разрешённое отсутствие (по заявлению) · ÇG — Вызов в суд или госорган · HT — Военные сборы или призыв · DY — Простой (по причине работодателя) · KN — Отстранён от работы · GM — Не явился (без уважительной причины)
Bayram günləri Əmək Məcəlləsinin 105-ci maddəsinə və Nazirlər Kabinetinin qərarına görə qoyulub. Bayram istirahət gününə və ya başqa bayrama təsadüf edəndə, ondan sonrakı iş günü istirahət sayılır. Kabinetin başqa köçürmələrini (məsələn, işlək şənbə) buradan əlavə edin.|Holidays are set under article 105 of the Labour Code and the decision of the Cabinet of Ministers. When a holiday falls on a rest day or another holiday, the next working day is treated as a rest day. Add the Cabinet's other transfers (for example a working Saturday) here.|Праздничные дни установлены по статье 105 Трудового кодекса и решению Кабинета министров. Если праздник выпадает на выходной или другой праздник, следующий рабочий день считается выходным. Другие переносы Кабинета (например, рабочую субботу) добавляйте здесь.
Orada «Filiallar» siyahısına adı yazın (və ya ştat sətrinin «Filial» sahəsinə): filial burada özü görünür. Hər filialın altında departamentlər, onların şöbələri və vəzifələri var («Struktur» sekməsi). Burada yalnız filialın kodu, şəhəri, aktivliyi və bonus qaydası yazılır.|Type the name in the “Branches” list there (or in the “Branch” field of the staff line): the branch appears here by itself. Under each branch are departments, their sections and positions (“Structure” tab). Only the branch code, city, activity and bonus rule are entered here.|Введите название в список «Филиалы» там (или в поле «Филиал» штатной строки): филиал появится здесь сам. Под каждым филиалом — департаменты, их отделы и должности (вкладка «Структура»). Здесь вводятся только код, город, активность и правило бонуса филиала.
İş təklifləri və avtomatik müraciət bu maaş aralığına uyğun vakansiyalarla məhdudlaşır. 0 — yuxarı hədd yoxdur.|Job offers and automatic applications are limited to vacancies matching this salary range. 0 — no upper limit.|Предложения о работе и автоотклики ограничиваются вакансиями в этом диапазоне зарплат. 0 — верхнего предела нет.
Şirkətə yazılı ərizənizi buradan göndərin: HR onu “İşçi ərizələri” siyahısında görür, əmr ərizəniz əsasında hazırlanır. Bütün ərizələriniz və cavablar aşağıdakı reyestrdə qalır.|Send your written application to the company from here: HR sees it in the “Employee applications” list and the order is prepared on the basis of your application. All your applications and replies stay in the registry below.|Отправляйте письменные заявления в компанию отсюда: HR видит их в списке «Заявления сотрудников», приказ готовится на основании вашего заявления. Все заявления и ответы остаются в реестре ниже.
Əmr məzuniyyətin başlanmasına azı 5 gün qalmış verilməlidir (138-ci maddə).|The order must be issued at least 5 days before the vacation starts (article 138).|Приказ должен быть издан не позднее чем за 5 дней до начала отпуска (статья 138).
: işçinin gross maaşı və üstünə işəgötürənin öz hesabına ödədiyi üç sığorta payı. Bu paylar işçinin maaşından tutulmur, ayrıca ödənilir.|: the employee's gross pay plus three insurance contributions the employer pays at its own expense. These contributions are not deducted from the employee's pay; they are paid separately.|: gross-зарплата сотрудника плюс три страховых взноса, которые работодатель платит за свой счёт. Эти взносы не удерживаются из зарплаты сотрудника, а платятся отдельно.
Qeyri-dövlət sektoru: 200 AZN-dək 22%, 200–8 000 AZN arası 15%, 8 000-dən yuxarı 11%.|Non-state sector: 22% up to 200 AZN, 15% for 200–8,000 AZN, 11% above 8,000.|Негосударственный сектор: 22% до 200 AZN, 15% на 200–8 000 AZN, 11% свыше 8 000.
Təxmini hesablamadır (Vergilər Nazirliyinin 2026-cı il dərəcələri). Əsas iş yerində aylıq gəlir 2 500 AZN-dək olduqda 200 AZN vergidən azaddır (Vergi Məcəlləsi 102.1.6). Özəl qeyri-neft sektorunda gəlir vergisi 2 500 AZN-dək 3%, 8 000 AZN-dək 75 AZN + 10%, yuxarısı 625 AZN + 14%. Dövlət və neft-qaz sektorunda gəlir vergisi 2 500 AZN-dək 14% və yuxarı 350 AZN + 25%, DSMF işçi 3% və işəgötürən 22%. Güzəştlər və əlavə ödənişlər nəzərə alınmır; rəsmi hesablama üçün mühasib və ya Dövlət Vergi Xidməti ilə yoxlayın.|This is an approximate calculation (2026 rates of the Ministry of Taxes). When monthly income at the main workplace is up to 2,500 AZN, 200 AZN is exempt from tax (Tax Code 102.1.6). In the private non-oil sector income tax is 3% up to 2,500 AZN, 75 AZN + 10% up to 8,000 AZN, 625 AZN + 14% above. In the state and oil-gas sector income tax is 14% up to 2,500 AZN and 350 AZN + 25% above, DSMF employee 3% and employer 22%. Reliefs and extra payments are not taken into account; for an official calculation check with an accountant or the State Tax Service.|Расчёт ориентировочный (ставки Министерства налогов на 2026 год). При месячном доходе по основному месту работы до 2 500 AZN 200 AZN освобождаются от налога (НК 102.1.6). В частном ненефтяном секторе подоходный налог: 3% до 2 500 AZN, до 8 000 AZN — 75 AZN + 10%, выше — 625 AZN + 14%. В государственном и нефтегазовом секторе подоходный налог 14% до 2 500 AZN и выше 350 AZN + 25%, ГФСЗ: работник 3%, работодатель 22%. Льготы и дополнительные выплаты не учитываются; для официального расчёта проверьте у бухгалтера или в Государственной налоговой службе.
Təsvir çox qısadır|The description is too short|Описание слишком короткое
Təsdiqlənməmiş şirkət 11 vakansiya yaradıb|An unverified company created 11 vacancies|Неподтверждённая компания создала 11 вакансий
Təsvir çox qısadır · Eyni şirkətdən eyni başlıqlı 4 elan|The description is too short · 4 listings with the same title from the same company|Описание слишком короткое · 4 объявления с одним названием от одной компании
Bacarıq, sertifikat, vəzifə və təhsil siyahılarına yeni qeyd əlavə edin və ya şirkətlərin göndərdiyi sorğuları təsdiq edin.|Add new entries to the skill, certificate, position and education lists or approve requests sent by companies.|Добавляйте новые записи в списки навыков, сертификатов, должностей и образования или подтверждайте запросы компаний.
«İstifadəçilər»də hesabları idarə edin; «Müraciət axını»nda platformadakı müraciətləri izləyin.|Manage accounts in “Users”; follow applications on the platform in “Application flow”.|Управляйте аккаунтами в «Пользователях»; отслеживайте заявки на платформе в «Потоке заявок».
«Ödənişlər və borclar» və «İşəgötürən AI paketləri»ndə şirkətlərin paketlərini və hesab-fakturalarını idarə edin.|In “Payments and debts” and “Employer AI packages” manage companies' plans and invoices.|В «Платежах и долгах» и «ИИ-пакетах работодателя» управляйте пакетами и счетами-фактурами компаний.
«Uyğunluq balı»nda uyğunluq hesablanması qaydalarını izləyin və tənzimləyin.|In “Match score” follow and adjust the match calculation rules.|В «Оценке соответствия» отслеживайте и настраивайте правила расчёта соответствия.
«İstehsalat təqvimi»nə dini bayram günlərini dövlət qərarı çıxandan sonra daxil edin: əmək haqqı və məzuniyyət hesabları bundan asılıdır.|Enter religious holidays in the “Production calendar” after the state decision is issued: payroll and vacation calculations depend on it.|Вносите религиозные праздники в «Производственный календарь» после выхода государственного решения: от этого зависят расчёты зарплаты и отпусков.
Davamiyyət qeydləri yoxdur. Tabeldə gün işarələndikcə burada görünəcək.|No attendance records. They will appear here as days are marked in the timesheet.|Записей о посещаемости нет. Они появятся здесь по мере отметки дней в табеле.
Seçim mərhələləri tamamlanmayıb: heç bir namizəd son mərhələyə çatmayıb.|Selection stages are incomplete: no candidate has reached the last stage.|Этапы отбора не завершены: ни один кандидат не дошёл до последнего этапа.
Rənglər vakansiyaları göstərir. Qırıq haşiyə iştirakçıların təsdiqini gözləyən görüşdür. Eyni vakansiya üzrə görüşlər üst-üstə düşə bilməz.|Colours show vacancies. A dashed border is a meeting awaiting participants' confirmation. Meetings for the same vacancy cannot overlap.|Цвета обозначают вакансии. Пунктирная рамка — встреча, ожидающая подтверждения участников. Встречи по одной вакансии не могут пересекаться.
Word/PDF/TXT: “1. Sual? (2 bal)”, sonra “A) …  B) …” və “Cavab: B” (bir neçə cavab: “A, C”; cavabsız sual açıq sual sayılır). Excel/CSV: başlıq sətri “Sual, Variant A, Variant B…, Düzgün cavab, Bal”.|Word/PDF/TXT: “1. Question? (2 points)”, then “A) …  B) …” and “Answer: B” (several answers: “A, C”; a question without an answer counts as open). Excel/CSV: header row “Question, Option A, Option B…, Correct answer, Points”.|Word/PDF/TXT: «1. Вопрос? (2 балла)», затем «A) …  B) …» и «Ответ: B» (несколько ответов: «A, C»; вопрос без ответа считается открытым). Excel/CSV: строка заголовка «Вопрос, Вариант A, Вариант B…, Правильный ответ, Баллы».
«Müsahibə», «Təklif» və «İşə qəbul» keçmiş statuslardan hesablanır: işə qəbul edilən namizəd aralıq mərhələlərdən də keçmiş sayılır.|“Interview”, “Offer” and “Hired” are calculated from past statuses: a hired candidate is counted as having passed the intermediate stages too.|«Собеседование», «Предложение» и «Принят» считаются по прошлым статусам: принятый кандидат считается прошедшим и промежуточные этапы.
Namizədlərə «Namizədlər» bölməsindən baxın və statusu yeniləyin. Namizədlərə cavab verməmək işə qəbul brendinə zərər verir.|Look at the candidates in “Candidates” and update the status. Not replying to candidates harms the employer brand.|Просмотрите кандидатов в разделе «Кандидаты» и обновите статус. Отсутствие ответа кандидатам вредит бренду работодателя.
İşçinin yazılı ərizəsini burada qeyd edin, sonra “Əmr yarat” düyməsi ilə əmr ərizə əsasında hazırlanır: işçi, növ, tarixlər və əsas (ərizənin tarixi və səbəbi) avtomatik dolur. Əmr silinərsə ərizə yenidən gözləyənlərə qayıdır.|Record the employee's written application here, then the “Create an order” button prepares the order from the application: the employee, type, dates and basis (application date and reason) fill in automatically. If the order is deleted the application returns to pending.|Зарегистрируйте здесь письменное заявление сотрудника, затем кнопка «Создать приказ» готовит приказ на основании заявления: сотрудник, тип, даты и основание (дата и причина заявления) заполняются автоматически. Если приказ удалён, заявление возвращается в ожидающие.
Ərizədə 5 məzuniyyət günü var, qalıq isə 0 gündür (qazanılmış günlərə görə). Qalıqdan artıq məzuniyyət əvvəlcədən verilmiş sayılır: razılıq lazımdır.|The application has 5 vacation days but the balance is 0 days (by accrued days). Vacation above the balance counts as granted in advance: consent is needed.|В заявлении 5 дней отпуска, а остаток — 0 дней (по заработанным дням). Отпуск сверх остатка считается предоставленным авансом: нужно согласие.
Sənəd tapılmadı. Sənədlər işçi kartındakı “Sənəd qovluğu”ndan və “Müqavilə və arayış”dan əlavə olunur.|No document found. Documents are added from the “Document folder” and “Contract and certificate” on the employee card.|Документов не найдено. Документы добавляются из «Папки документов» и «Договора и справки» в карточке сотрудника.
Çıxış prosesi yoxdur. İşçi “İşdən çıxıb” statusu alanda siyahı özü yaranır.|No offboarding process. The checklist is created automatically when an employee gets the “Left” status.|Процесса увольнения нет. Чек-лист создаётся автоматически, когда сотрудник получает статус «Уволен».
İşçilər “İş yerim → Tövsiyə proqramı”ndan namizəd tövsiyə edir. Namizəd işə qəbul olunanda tövsiyə bonusu hesablanır və “Ödə” ilə işçiyə “digər ödəniş” kimi qeyd olunur.|Employees recommend candidates from “My workplace → Referral program”. When the candidate is hired a referral bonus is calculated and recorded with “Pay” for the employee as an “other payment”.|Сотрудники рекомендуют кандидатов через «Моё рабочее место → Реферальная программа». Когда кандидат принят, начисляется реферальный бонус и отмечается кнопкой «Оплатить» сотруднику как «прочая выплата».
Namizədin göstərdiyi rəy verənlərlə (əvvəlki rəhbər, həmkar) əlaqə saxlayın, cavabları qeyd edin: proqram orta qiyməti və qısa nəticəni göstərir.|Contact the referees named by the candidate (a former manager, a colleague) and record the answers: the program shows the average score and a short result.|Свяжитесь с рекомендателями кандидата (бывший руководитель, коллега) и запишите ответы: программа покажет среднюю оценку и краткий итог.
Növbəti 30 gündə işçilərin ad günləri və il dönümləri (doğum tarixi və işə başlama tarixi işçi kartından götürülür).|Employees' birthdays and anniversaries in the next 30 days (the birth date and start date are taken from the employee card).|Дни рождения и годовщины сотрудников в ближайшие 30 дней (дата рождения и дата начала работы берутся из карточки сотрудника).
Açıq olanda kolleqalar “İş yerim → İşçi təcrübəsi”ndə yalnız ad və gün/ayı (doğum ili yox) görür; ad günü və il dönümü sahibinə həmin gün bildiriş gedir. Bağlı olanda yalnız HR görür.|When open, colleagues see only the name and day/month (not the birth year) in “My workplace → Employee experience”; the owner gets a notification on their birthday or anniversary. When closed only HR sees it.|Когда включено, коллеги видят в «Моё рабочее место → Опыт сотрудника» только имя и день/месяц (без года рождения); владельцу в этот день приходит уведомление. Когда выключено, видит только HR.
Növbəti 30 gündə ad günü və ya il dönümü yoxdur (doğum tarixi işçinin şəxsi məlumatlarında yazılmalıdır).|No birthday or anniversary in the next 30 days (the birth date must be entered in the employee's personal data).|В ближайшие 30 дней нет дней рождения или годовщин (дата рождения должна быть указана в личных данных сотрудника).
Əməyin mühafizəsi üzrə təlimat jurnalı, tibbi baxış qrafiki və qəza qeydləri. Növbəti təlimat və baxış tarixləri keçəndə burada qırmızı görünür.|Occupational safety briefing log, medical examination schedule and accident records. Overdue next briefing and examination dates appear in red here.|Журнал инструктажей по охране труда, график медосмотров и записи о несчастных случаях. Просроченные даты следующих инструктажей и осмотров отображаются здесь красным.
Siyahıdakı|In the list|В списке
nəfəri seç|select people|выбрать человек
Ad, vəzifə və ya şöbə üzrə axtar (16 nəfər)|Search by name, position or section (16 people)|Поиск по имени, должности или отделу (16 человек)
Daxili əmək qaydaları, siyasətlər və şəxsi məlumatların işlənməsinə razılıq. Mətn dəyişəndə yeni versiya yaranır, köhnələri qalır; işçilər “İş yerim → Qaydalar” bölməsində təsdiq edir (təsdiq mətnin hash-i ilə saxlanır). Razılığı işçi özü geri götürə bilər.|Internal labour rules, policies and consent to personal data processing. When the text changes a new version is created and old ones remain; employees confirm in “My workplace → Rules” (the confirmation is stored with the hash of the text). The employee can withdraw consent themselves.|Правила внутреннего распорядка, политики и согласие на обработку персональных данных. При изменении текста создаётся новая версия, старые сохраняются; сотрудники подтверждают в «Моё рабочее место → Правила» (подтверждение хранится с хэшем текста). Согласие сотрудник может отозвать сам.
Nümunə mətnlər layihədir: istifadə etməzdən əvvəl hüquqşünasla yoxlayın.|Sample texts are drafts: check with a lawyer before using them.|Образцы текстов — проекты: перед использованием проверьте у юриста.
Hər sənəd qrupunun nə qədər saxlanacağı. İlkin illər orientirdir: şirkət özü hüquqşünas və arxiv qaydaları ilə yoxlayıb dəyişməlidir. Sistem heç nəyi öz-özünə silmir: müddəti bitmiş işçi işləri yalnız siyahıda göstərilir.|How long each document group is kept. The initial years are guidelines: the company must check and change them with a lawyer and archive rules. The system deletes nothing by itself: employee files past their term are only shown in the list.|Как долго хранится каждая группа документов. Начальные сроки — ориентиры: компания должна сама проверить и изменить их с юристом и по правилам архива. Система ничего не удаляет сама: личные дела с истёкшим сроком только показываются в списке.
Şəxsi işlərin saxlama müddəti bitənlər (|Personal files past their retention period (|Личные дела с истёкшим сроком хранения (
nəfər. İşdən çıxmış işçilər cəmi:|people. Total leavers:|чел. Всего уволенных:
Şəxsi işlər və əmək müqavilələri: il|Personal files and employment contracts: years|Личные дела и трудовые договоры: лет
Kadr əmrləri (qəbul, köçürmə, xitam): il|HR orders (hiring, transfer, termination): years|Кадровые приказы (приём, перевод, увольнение): лет
Məzuniyyət və icazə əmrləri: il|Vacation and leave orders: years|Приказы об отпусках и отгулах: лет
Tabel və davamiyyət: il|Timesheet and attendance: years|Табель и посещаемость: лет
Əmək haqqı sənədləri: il|Payroll documents: years|Документы по зарплате: лет
Əməyin mühafizəsi jurnalları və qəza aktları: il|Occupational safety logs and accident reports: years|Журналы охраны труда и акты о несчастных случаях: лет
İşə qəbul olmayan namizədlərin sənədləri: il|Documents of candidates not hired: years|Документы кандидатов, не принятых на работу: лет
Şirkət üçün vacib bacarıqları əlavə edin, hər işçinin səviyyəsini (0–4) və vəzifənin tələb etdiyi hədəfi yazın. Hədəfdən aşağı xanalar qırmızı görünür: təlim planının əsasıdır. Rəhbər öz komandası üçün də yaza bilər, işçi öz səviyyəsini «İş yerim → Performans»da görür.|Add skills important to the company, enter each employee's level (0–4) and the target the position requires. Cells below the target are red: they are the basis of the training plan. A manager can also enter for their own team; employees see their level in “My workplace → Performance”.|Добавьте важные для компании навыки, укажите уровень каждого сотрудника (0–4) и цель, которую требует должность. Ячейки ниже цели красные: это основа плана обучения. Руководитель может вносить данные и для своей команды; сотрудник видит свой уровень в «Моё рабочее место → Оценка».
Əvvəl bu vəzifələr üçün vacib bacarıqları kataloqdan seçin və ya Excel faylı yükləyin.|First pick the skills important for these positions from the catalogue or upload an Excel file.|Сначала выберите важные для этих должностей навыки из каталога или загрузите файл Excel.
Təlimləri planlayın, büdcəni izləyin, iştirakçıları seçin. Sertifikatın müddəti və vəzifə üzrə məcburi təlimlər izlənir, müddət bitəndə xəbərdarlıq gəlir.|Plan training, follow the budget, choose participants. Certificate expiry and mandatory training by position are tracked and a warning arrives when the term ends.|Планируйте обучение, следите за бюджетом, выбирайте участников. Отслеживаются срок сертификата и обязательное обучение по должности; по окончании срока приходит предупреждение.
Növbə ilə işləyən işçilər üçün kimin hansı gün hansı saatda işlədiyini planlayın. Qrafik məzuniyyət, istirahət və minimum işçi sayı qaydalarına görə yoxlanılır; saatlar əmək haqqına keçir.|For shift workers plan who works which day at which hour. The schedule is checked against vacation, rest and minimum staffing rules; hours go into payroll.|Для сменных сотрудников планируйте, кто в какой день и час работает. График проверяется по правилам отпусков, отдыха и минимальной численности; часы переходят в зарплату.
Növbə cədvəlinə yalnız|Only|В график смен попадают только
işçi kartında «Növbəli rejimdə işləyir» seçilən|employees for whom “Works in shifts” is selected on the employee card|сотрудники, у которых в карточке выбрано «Работает посменно»
işçilər düşür (mağaza, zavod, kafe, mühafizə, klinika). Kartda həm də işçinin standart növbəsi və ritmi (məs. 2 gün iş / 2 gün istirahət) yazılır. Sonra «Standart rejimlə doldur» iki həftəni özü qurur, istənilən günü əl ilə və ya Excel ilə dəyişə bilərsiniz. Plan hazır olanda «Saat uçotuna köçür» saatları yazır və əmək haqqında gecə və artıq iş saatı özü hesablanır. Adi 9–18 iş rejimində olan işçilər üçün növbə lazım deyil.|are included (shop, factory, café, security, clinic). The card also holds the employee's standard shift and rhythm (e.g. 2 days on / 2 days off). Then “Fill with the standard pattern” builds two weeks by itself and you can change any day manually or with Excel. When the plan is ready, “Move to hours” writes the hours and night and overtime hours are calculated in payroll automatically. Employees on the usual 9–18 work mode do not need a shift.|(магазин, завод, кафе, охрана, клиника). В карточке указываются также стандартная смена и ритм сотрудника (например, 2 дня работы / 2 дня отдыха). Затем «Заполнить по стандартному режиму» сама строит две недели, любой день можно изменить вручную или через Excel. Когда план готов, «Перенести в учёт часов» записывает часы, а ночные и сверхурочные часы считаются в зарплате автоматически. Сотрудникам с обычным режимом 9–18 смена не нужна.
, gecə 2|, night 2|, ночь 2
, gecə 8|, night 8|, ночь 8
Hələ heç bir işçi növbəli rejimdə deyil. İşçi kartında «Növbəli rejimdə işləyir» seçin və ya|No employee is on a shift mode yet. Select “Works in shifts” on the employee card or|Пока ни один сотрудник не на посменном режиме. Выберите «Работает посменно» в карточке сотрудника или
buradan bir neçə işçini birdən növbəli rejimə keçirin|move several employees to shift mode at once from here|переведите нескольких сотрудников на посменный режим отсюда
(və ya Excel ilə yükləyin).|(or import with Excel).|(или загрузите через Excel).
Ezamiyyət sorğusu → təsdiq → xərc hesabatı → hesablaşma. Hesablaşmada işçiyə çatan məbləğ əmək haqqındakı “digər ödəniş” kimi qeyd olunur.|Business trip request → approval → expense report → settlement. The amount due to the employee in settlement is recorded as an “other payment” in payroll.|Запрос на командировку → подтверждение → авансовый отчёт → расчёт. Сумма к выплате сотруднику при расчёте отмечается в зарплате как «прочая выплата».
Şirkət elanları (oxu təsdiqi ilə) və anonim sorğular (eNPS və öz sualları, təkrarlanan ola bilər). İşçilər onları «İş yerim»də görür.|Company announcements (with read confirmation) and anonymous surveys (eNPS and your own questions, can be recurring). Employees see them in “My workplace”.|Объявления компании (с подтверждением прочтения) и анонимные опросы (eNPS и собственные вопросы, могут повторяться). Сотрудники видят их в «Моём рабочем месте».
-ci ilin istehsalat təqvimi|production calendar of the year|производственный календарь года
. İş saatı həftədə 40 saatla (gündə|. Working hours are calculated at 40 hours a week (per day|. Рабочие часы рассчитаны исходя из 40 часов в неделю (в день
saat) hesablanıb; qısaldılmış gündə 1 saat az işlənir (faktiki saat), amma tam gün üçün ödənilir (ödənilən saat). Günə basıb şirkətiniz üçün qeyri-iş günü və ya işlək gün (məsələn, Kabinetin elan etdiyi işlək şənbə) təyin edin.|hours); on a shortened day 1 hour less is worked (actual hours) but the full day is paid (paid hours). Click a day to set a non-working day or a working day for your company (for example a working Saturday announced by the Cabinet).|часов); в сокращённый день отрабатывается на 1 час меньше (фактические часы), но оплачивается полный день (оплачиваемые часы). Нажмите на день, чтобы назначить для вашей компании нерабочий или рабочий день (например, рабочую субботу, объявленную Кабинетом).
-ci ilin bayram və qeyri-iş günləri|holidays and non-working days of the year|праздничные и нерабочие дни года
Əmək Məcəlləsinin 105-ci maddəsinə və Nazirlər Kabinetinin qərarına əsasən. Bayram istirahət gününə və ya başqa bayrama təsadüf edəndə ondan sonrakı iş günü istirahət olur.|Under article 105 of the Labour Code and the decision of the Cabinet of Ministers. When a holiday falls on a rest day or another holiday, the next working day becomes a rest day.|На основании статьи 105 Трудового кодекса и решения Кабинета министров. Если праздник выпадает на выходной или другой праздник, следующий рабочий день становится выходным.
Saat yalnız burada yazılır; əmək haqqı hesablaması onu buradan götürür. İki yol var:|Hours are entered only here; payroll takes them from here. There are two ways:|Часы вводятся только здесь; расчёт зарплаты берёт их отсюда. Есть два способа:
(giriş-çıxış və ya gün üzrə saat) və|(clock-in/out or hours by day) and|(приход/уход или часы по дням) и
(işçi üçün ayda bir rəqəm). Eyni ay üçün gündəlik qeyd varsa yalnız o sayılır, ikisi toplanmır. İş günündə gündəlik normadan (həftəlik saat ÷ 5, bayram qabağı 1 saat az) artıq saat artıq iş, istirahət və bayram günündə bütün saat istirahət günü işi sayılır; gecə saatı ayrıca göstərilir. Gecə əlavəsinin faizi işçi kartındadır. «Ayarlar»da artıq iş təsdiqi açıqdırsa, artıq saatlar imzalanmış əmr (artıq işə cəlb / istirahət günü işə cəlb) və ya təsdiq olmadan əmək haqqına düşmür.|(one number per month for an employee). If there is a daily record for the same month only it counts, the two are not added. On a working day, hours above the daily norm (weekly hours ÷ 5, 1 hour less before a holiday) count as overtime; on rest and holiday days all hours count as rest-day work; night hours are shown separately. The night supplement percentage is on the employee card. If overtime approval is on in “Settings”, extra hours do not go into payroll without a signed order (overtime / rest-day work order) or approval.|(одно число в месяц на сотрудника). Если за тот же месяц есть ежедневная запись, учитывается только она, они не складываются. В рабочий день часы сверх дневной нормы (недельные часы ÷ 5, перед праздником на 1 час меньше) считаются сверхурочными; в выходные и праздничные дни все часы считаются работой в выходной; ночные часы показываются отдельно. Процент ночной надбавки указан в карточке сотрудника. Если в «Настройках» включено подтверждение сверхурочных, лишние часы не попадают в зарплату без подписанного приказа (о привлечении к сверхурочной работе / работе в выходной) или подтверждения.
Bu rəqəmlər hər il dəyişə bilər. Mühasib cari ilin qanununa uyğunluğunu yoxlayıb təsdiq etməlidir; rəqəm fərqlidirsə təsdiq etməyin və bizə bildirin.|These figures may change every year. An accountant must check them against the current year's law and confirm; if a figure differs, do not confirm and tell us.|Эти цифры могут меняться каждый год. Бухгалтер должен проверить их по закону текущего года и подтвердить; если цифра отличается, не подтверждайте и сообщите нам.
Hesablama: aylıq maaş × (ödənilən gün / norma günü); ödənişli məzuniyyət, donor, tibbi müayinə və çağırış günləri tam, boşdayanma 2/3 ödənilir (169); analıq, uşağa qulluq, atalıq və xəstəlik günləri Sosial Sığorta müavinəti ilə ödənilir (cədvələ daxil deyil); ödənişsiz məzuniyyət və üzrsüz yoxluq ödənilmir. Gəlir vergisi və sığorta paylarının dərəcələri 2026-cı il üçündür; vergi güzəşti işçi kartındakı məlumata görə tətbiq olunur. Məzuniyyət haqqının dəqiq məbləği (Əmək M. 140) əvvəlki 12 ayın orta əmək haqqından hesablanır — burada aylıq maaşın gün payı götürülür.|Calculation: monthly salary × (paid days / norm days); paid vacation, donor, medical check-up and summons days are paid in full, downtime 2/3 (169); maternity, childcare, paternity and sickness days are paid by Social Insurance benefit (not included in the table); unpaid leave and unexcused absence are not paid. Income tax and insurance contribution rates are for 2026; tax relief is applied according to the employee card. The exact vacation pay (Labour Code 140) is calculated from the average salary of the previous 12 months — here the day share of the monthly salary is taken.|Расчёт: месячная зарплата × (оплачиваемые дни / нормо-дни); оплачиваемый отпуск, дни донора, медосмотра и вызова оплачиваются полностью, простой — 2/3 (169); дни по беременности и родам, уходу за ребёнком, отцовства и болезни оплачиваются пособием соцстраха (в таблицу не входят); неоплачиваемый отпуск и неуважительное отсутствие не оплачиваются. Ставки подоходного налога и страховых взносов — на 2026 год; налоговая льгота применяется по данным карточки сотрудника. Точная сумма отпускных (ТК 140) считается от средней зарплаты за предыдущие 12 месяцев — здесь берётся дневная доля месячной зарплаты.
Hər sətir: harada (filial), hansı departament və şöbədə, hansı vəzifədə, ştatın növü, neçə nəfər və maaş həddi. Əlavə etdiyiniz sətir dərhal|Each line: where (branch), in which department and section, which position, staff type, how many people and salary limit. A line you add immediately|Каждая строка: где (филиал), в каком департаменте и отделе, на какой должности, тип штата, сколько человек и предел зарплаты. Добавленная строка сразу
Sətir yazıldıqdan sonra həmin say və maaş həddindən artıq işçi götürmək olmur|After a line is entered you cannot hire above its number and salary limit|После ввода строки нельзя нанимать сверх её числа и предела зарплаты
: əl ilə işçi əlavəsi, iş təklifi, işə qəbul və Excel idxalı bu yoxlamadan keçir. Daha çox işçi lazımdırsa, əvvəl burada sətri «Düzəlt» ilə say artırılır (eyni filial, departament, şöbə və vəzifə yenidən yazılsa, yeni sətir yaranmır, mövcud sətir yenilənir). Plana yazılmamış vəzifəyə işçi götürmək olmur.|: manual employee addition, job offer, hiring and Excel import go through this check. If more employees are needed, first raise the number here with “Fix” (if the same branch, department, section and position are entered again, no new line is created, the existing line is updated). You cannot hire into a position not in the plan.|: ручное добавление сотрудника, предложение о работе, приём и импорт Excel проходят эту проверку. Если нужно больше сотрудников, сначала увеличьте число здесь кнопкой «Исправить» (если снова ввести тот же филиал, департамент, отдел и должность, новая строка не создаётся, обновляется существующая). Нельзя нанимать на должность, которой нет в плане.
planı kilidlidir: yeni sətir direktorun təsdiqinə göndəriləcək.|plan is locked: a new line will be sent for the director's approval.|план заблокирован: новая строка будет отправлена на подтверждение директору.
Eyni vəzifəyə müxtəlif pillələr üçün ayrı sətir yazılır (məs. Mühasib: Junior 800–1200, Böyük 1800–2600). İşçi maaşına uyğun pilləyə düşür.|A separate line is entered for different grades of the same position (e.g. Accountant: Junior 800–1200, Senior 1800–2600). An employee falls into the grade matching their salary.|Для разных ступеней одной должности вводится отдельная строка (напр. Бухгалтер: Junior 800–1200, Senior 1800–2600). Сотрудник попадает в ступень, соответствующую его зарплате.
Boş = planın əvvəlindən. Gələcək ay yazılsa, yer o ayadək işə qəbul üçün açıq olmur və plan xəttində o aydan görünür.|Empty = from the start of the plan. If a future month is entered, the place is not open for hiring until that month and appears on the plan line from that month.|Пусто = с начала плана. Если указан будущий месяц, место не открыто для найма до этого месяца и отображается на линии плана с этого месяца.
Boş = müddətsiz. Layihə yeri üçün son ayı yazın: müddət bitəndən sonra yer yeni işçiyə açıq olmur.|Empty = no end. For a project place enter the last month: after the term the place is not open to a new employee.|Пусто = бессрочно. Для проектного места укажите последний месяц: после окончания срока место для нового сотрудника закрыто.
Plandakı sətirlər (|Lines in the plan (|Строки плана (
) · cəmi|) · total|) · итого
nəfər,|people,|чел.,
, aylıq həddi 43,400 AZN|, monthly limit 43,400 AZN|, месячный предел 43 400 AZN
*Aylıq xərc = maaş həddi + işəgötürənin sosial, işsizlik və tibbi payları (bu ay açıq yerlər üzrə). Plan:|*Monthly cost = salary limit + the employer's social, unemployment and medical contributions (for places open this month). Plan:|*Месячные расходы = предел зарплаты + социальные, по безработице и медицинские взносы работодателя (по местам, открытым в этом месяце). План:
· faktiki işçilər üzrə:|· by actual employees:|· по фактическим сотрудникам:
(planın 12,424 AZN altında)|(12,424 AZN below the plan)|(на 12 424 AZN ниже плана)
Son 12 ayda işçi sayı, işə qəbul və çıxış; növbəti 3 ay üçün proqnoz son 6 ayın orta işə qəbul və çıxışına əsaslanır (sadə tendensiya, vəd deyil). Aşağıda ştat cədvəli ilə faktiki işçi sayı müqayisə olunur.|Headcount, hires and exits over the last 12 months; the forecast for the next 3 months is based on the average hires and exits of the last 6 months (a simple trend, not a promise). Below, the staff schedule is compared with actual headcount.|Численность, найм и увольнения за последние 12 месяцев; прогноз на следующие 3 месяца основан на среднем найме и увольнениях за последние 6 месяцев (простой тренд, не обещание). Ниже штатное расписание сравнивается с фактической численностью.
gün (vakansiya açılandan işçi kartı yaranana qədər). Yeni yer üçün işə qəbul tarixini buna görə planlayın.|days (from the vacancy opening until the employee card is created). Plan the hire date for a new place accordingly.|дней (от открытия вакансии до создания карточки сотрудника). Планируйте дату приёма на новое место с учётом этого.
Yaşıl: işə qəbul · Qırmızı: çıxış · Qırıq xətt: proqnoz · Narıncı nöqtəli xətt: plan (təsdiqlənmiş ştat cəmi)|Green: hires · Red: exits · Dashed line: forecast · Orange dotted line: plan (approved staff total)|Зелёный: найм · Красный: уход · Пунктир: прогноз · Оранжевая точечная линия: план (сумма утверждённого штата)
Qrafikdə narıncı xətt təsdiqlənmiş planın ştat cəmidir (25 nəfər). Say dəyişəndə plan yenidən təsdiqlənməlidir.|The orange line on the chart is the staff total of the approved plan (25 people). When the number changes the plan must be approved again.|Оранжевая линия на графике — сумма штата утверждённого плана (25 человек). При изменении числа план нужно утвердить заново.
Ştat: 30|Staff: 30|Штат: 30
Ştat: 4|Staff: 4|Штат: 4
Ştat: 0|Staff: 0|Штат: 0
 planı| plan| план
Departament → şöbə → vəzifə üzrə ştat yerləri, ştat dərəcəsi və maaş həddi. Departament göstəriciləri sətirlərin cəmidir.|Staff places by department → section → position, staff grade and salary limit. Department indicators are the sum of the lines.|Штатные места по департаменту → отделу → должности, штатная ступень и предел зарплаты. Показатели департамента — сумма строк.
plan həddi 43,400 AZN|plan limit 43,400 AZN|предел плана 43 400 AZN
Plan təsdiqlənib. Direktor və hesab sahibi dəyişiklikləri birbaşa edə bilər; digərlərinin dəyişikliyi onların təsdiqinə düşür.|The plan is approved. The director and account owner can make changes directly; others' changes go to them for approval.|План утверждён. Директор и владелец аккаунта могут вносить изменения напрямую; изменения других идут им на подтверждение.
Ştatda yeri olmayan işçilər (|Employees without a staff place (|Сотрудники без места в штате (
Bu işçilərin departament və vəzifəsinə uyğun ştat sətri yoxdur; ona görə sətirlərdə sayılmırlar. Sətir əlavə edin və ya işçinin vəzifəsini düzəldin.|These employees have no staff line matching their department and position, so they are not counted in the lines. Add a line or fix the employee's position.|Для этих сотрудников нет штатной строки, соответствующей их департаменту и должности, поэтому в строках они не учитываются. Добавьте строку или исправьте должность сотрудника.
Maaş həddi artımı: Bazar maaşı artdı|Salary limit increase: Market salary rose|Повышение предела зарплаты: рыночная зарплата выросла
Plandan kənar +2: Sınaq üçün əlavə yerlər|Out of plan +2: Extra places for a pilot|Вне плана +2: дополнительные места для пилота
Hər işçi yalnız bir sətirdə sayılır: departament, şöbə və vəzifəsinə ən uyğun sətirdə. “İşləyir” məzuniyyətdəkiləri də sayır. İşçiyə ştat sətrindəki maaş həddindən yuxarı və ya aşağı əmək haqqı təyin etmək olmaz. Bütün dəyişikliklər tarixçədə saxlanılır.|Each employee is counted in only one line: the one that best matches their department, section and position. “Working” also counts those on vacation. An employee cannot be given a salary above or below the staff line's salary limit. All changes are kept in the history.|Каждый сотрудник учитывается только в одной строке: наиболее подходящей его департаменту, отделу и должности. «Работает» учитывает и находящихся в отпуске. Нельзя назначить сотруднику зарплату выше или ниже предела штатной строки. Все изменения сохраняются в истории.
Plan və maaş həddi qaydaları pozulmur: istisna lazımdırsa, burada|The plan and salary limit rules are not broken: if an exception is needed, it is entered here|Правила плана и предела зарплаты не нарушаются: если нужно исключение, оно указывается здесь
Planda olmayan və ya planı aşan işçi götürmək lazımdır (layihə, təcili ehtiyac). Yer plana əlavə olunur.|You need to hire someone not in the plan or above the plan (a project, an urgent need). The place is added to the plan.|Нужно нанять сотрудника сверх плана или вне плана (проект, срочная потребность). Место добавляется в план.
Gəncə filialı / Maliyyə / Mühasib|Ganja branch / Finance / Accountant|Филиал в Гяндже / Финансы / Бухгалтер
Aylıq və illik əlavə xərc burada görünəcək (maaş həddinin yuxarı sərhədi + işəgötürən payları).|The monthly and annual extra cost will appear here (upper salary limit + employer contributions).|Ежемесячные и годовые дополнительные расходы появятся здесь (верхний предел зарплаты + взносы работодателя).
Plandan kənar sorğular (|Out-of-plan requests (|Внеплановые запросы (
Plandan kənar +2 yer: Maliyyə / Müasibtliq / Tarix A (Sınaq üçün əlavə yerlər)|Out of plan +2 places: Finance / Accounting / Tarix A (Extra places for a pilot)|Вне плана +2 места: Финансы / Бухгалтерия / Tarix A (дополнительные места для пилота)
-ci il büdcəsi: plan və fakt (əmək haqqı, təlim və HR xərcləri)|budget of the year: plan vs actual (payroll, training and HR costs)|бюджет года: план и факт (зарплата, обучение и расходы HR)
Hər növ üçün aylıq büdcəni departament üzrə yazın (departamentə bölmək istəmirsinizsə «Bölünməmiş» sətrinə). Aşağıdakı cədvəllər bütün növləri müqayisə edir; büdcəni aşan ay qırmızı göstərilir.|For each type enter the monthly budget by department (on the “Unallocated” line if you do not want to split by department). The tables below compare all types; a month that exceeds the budget is shown in red.|Для каждого вида внесите месячный бюджет по департаментам (в строку «Нераспределённое», если не хотите делить по департаментам). Таблицы ниже сравнивают все виды; месяц, превышающий бюджет, показывается красным.
Fakt: təsdiqlənmiş ayların hesablaması. Təsdiqlənməyən ay (bu aya qədər) indiki əmək haqqı fondu ilə təxmini göstərilir.|Actual: calculation of approved months. A month not yet approved (up to this month) is shown approximately with the current payroll fund.|Факт: расчёт по подтверждённым месяцам. Неподтверждённый месяц (до текущего) показывается ориентировочно по текущему фонду зарплаты.
büdcəsini sil|delete the budget|удалить бюджет
Plan təsdiqlənib: dəyişmək üçün yuxarıda «Redaktə üçün aç» düyməsi (direktor).|The plan is approved: to change it use the “Open for editing” button above (director).|План утверждён: чтобы изменить, используйте кнопку «Открыть для редактирования» выше (директор).
Real xərc: ödənilmiş (xarici sistemdə ödənilib və ya əl ilə qeyd olunub), təsdiqlənmiş əmək haqqı və bitmiş təlim. Sifarişdə: xarici sistemə sifariş kimi göndərilib, hələ ödənilməyib. Gözləyən: təsdiqlənib amma sifariş verilməyib, həm də təxmini əmək haqqı və başa çatmayan təlim. Gələcək aylar üçün fakt göstərilmir.|Actual cost: paid (paid in an external system or recorded manually), approved payroll and finished training. On order: sent to the external system as an order, not yet paid. Pending: approved but no order placed, plus estimated payroll and unfinished training. No actual is shown for future months.|Фактические расходы: оплаченные (оплачены во внешней системе или отмечены вручную), подтверждённая зарплата и завершённое обучение. В заказе: отправлены во внешнюю систему как заказ, ещё не оплачены. Ожидающие: подтверждены, но заказ не размещён, а также ориентировочная зарплата и незавершённое обучение. За будущие месяцы факт не показывается.
məs. 240000|e.g. 240000|напр. 240000
HR xərcləri (|HR expenses (|Расходы HR (
Əmək haqqı və təlimdən başqa kadr xərcləri burada yazılır: planlaşdırılır, direktor təsdiqləyir, təsdiqlənən xərc sifariş kimi xarici proqrama (1C, SAP, ERP) düşür, orada ödənəndən sonra «ödənildi» qeyd olunur və yalnız onda real xərc sayılır. Xarici proqram qoşulmayıbsa, ödəniş əl ilə qeyd olunur (tarix, üsul, hesab/kassa, sənəd nömrəsi). Hər növün büdcəsi «Büdcə» sekməsində yazılır; büdcəsiz və ya büdcədən artıq xərc yazılmır. Təlim xərci «İnkişaf və kommunikasiya → Təlimlər»də, əmək haqqı «Əmək haqqı»nda aparılır.|HR costs other than payroll and training are entered here: planned, approved by the director, the approved cost goes to the external program (1C, SAP, ERP) as an order, “paid” is marked there after payment, and only then does it count as actual cost. If no external program is connected, payment is recorded manually (date, method, account/cash desk, document number). The budget of each type is entered in the “Budget” tab; costs without a budget or above the budget cannot be entered. Training cost is kept in “Development and communication → Training”, payroll in “Payroll”.|Расходы HR, кроме зарплаты и обучения, вносятся здесь: планируются, подтверждаются директором, подтверждённый расход попадает во внешнюю программу (1C, SAP, ERP) как заказ, после оплаты там отмечается «оплачено», и только тогда он считается фактическим расходом. Если внешняя программа не подключена, оплата отмечается вручную (дата, способ, счёт/касса, номер документа). Бюджет каждого вида вносится на вкладке «Бюджет»; расходы без бюджета или сверх бюджета не вносятся. Расходы на обучение ведутся в «Развитие и коммуникация → Обучение», зарплата — в «Зарплате».
Bu növ üçün|For this type|По этому виду
-ci ildə xərc yoxdur.|there is no expense in the year.|расходов в этом году нет.
Platforma xərcləri xarici proqrama|The platform gives expenses to the external program|Платформа передаёт расходы во внешнюю программу
sifariş|as an order|как заказ
kimi verir, proqram ödənişi bildirəndən sonra xərc|and after the program reports payment the expense|, после уведомления программой об оплате расход
ödənilib|is paid|оплачен
sayılır və real xərcə keçir. Proqram həm də öz xərclərini platformaya yaza və büdcəni oxuya bilər. Mübadilə şirkətin öz açarı ilə, təhlükəsiz HTTPS sorğuları ilə gedir.|is counted and becomes an actual cost. The program can also write its own expenses to the platform and read the budget. The exchange uses the company's own key with secure HTTPS requests.|считается и становится фактическим расходом. Программа также может записывать свои расходы в платформу и читать бюджет. Обмен идёт с собственным ключом компании по защищённым HTTPS-запросам.
Təsdiqlənən xərc avtomatik sifariş kimi xarici proqrama düşsün|Let an approved expense go to the external program automatically as an order|Подтверждённый расход автоматически передаётся во внешнюю программу как заказ
Ünvan yazılıbsa, hər sifariş dəyişəndə (yaradıldı, ödənildi, geri çəkildi, ləğv edildi) ora JSON göndərilir; imza şifrəsi varsa|If an address is entered, JSON is sent there whenever an order changes (created, paid, withdrawn, cancelled); if there is a signature secret|Если адрес указан, при каждом изменении заказа (создан, оплачен, отозван, отменён) туда отправляется JSON; если есть ключ подписи
başlığı ilə (HMAC-SHA256). Ünvan yazılmasa da proqram sifarişləri açarla özü oxuya bilər.|with the header (HMAC-SHA256). Even if no address is entered the program can read orders itself with the key.|с заголовком (HMAC-SHA256). Даже если адрес не указан, программа может сама читать заказы по ключу.
Hər sorğuda|Every request carries|В каждом запросе
başlığı olur. Əsas ünvan:|a header. Base address:|есть заголовок. Основной адрес:
Hər filialın altında onun departamentləri, onların şöbələri, sonra vəzifələr. Sayı: planlaşdırılan ştat / filiala bağlı işçi.|Under each branch are its departments, their sections, then positions. Count: planned staff / employees linked to the branch.|Под каждым филиалом — его департаменты, их отделы, затем должности. Число: плановый штат / сотрудники, привязанные к филиалу.
· 0 işçi|· 0 employees|· 0 сотрудников
Hər sətir bir işçinin bir filialdakı işidir: filial, onun departamenti, şöbəsi və vəzifəsi (hamısı ştat cədvəlindən seçilir). Eyni işçini bir neçə filiala bağlaya bilərsiniz. Pay % boşdursa maaş «Maaş bölgüsü» rejiminə görə bölünür; yazılıbsa həmin faizlə. Bağlantını işçi kartından da edə bilərsiniz.|Each line is one employee's work in one branch: the branch, its department, section and position (all chosen from the staff schedule). You can link the same employee to several branches. If Share % is empty, salary is split by the “Salary breakdown” mode; if entered, by that percentage. You can also make the link from the employee card.|Каждая строка — работа одного сотрудника в одном филиале: филиал, его департамент, отдел и должность (всё выбирается из штатного расписания). Одного сотрудника можно привязать к нескольким филиалам. Если «Доля %» пуста, зарплата делится по режиму «Распределение зарплаты»; если указана — по этому проценту. Привязку можно сделать и из карточки сотрудника.
— Satış meneceri|— Sales manager|— Менеджер по продажам
Bonus qaydası filiala görədir (aylara görə dəyişmir): sabit məbləğ hər işçiyə verilir; «Maaşın faizi» isə filiala düşən maaşa tətbiq olunur (100 = həmin maaşın özü qədər). Bonus əmək haqqına mükafat kimi əlavə olunur, gəlir vergisi və sığorta ilə.|The bonus rule is per branch (it does not change by month): a fixed amount is given to each employee; “Percent of salary” applies to the salary falling on the branch (100 = as much as that salary). The bonus is added to payroll as a reward, with income tax and insurance.|Правило бонуса задаётся по филиалу (не меняется по месяцам): фиксированная сумма выдаётся каждому сотруднику; «Процент от зарплаты» применяется к зарплате, приходящейся на филиал (100 = столько же, сколько эта зарплата). Бонус добавляется к зарплате как премия, с подоходным налогом и страховыми взносами.
Bir neçə filialda işləyən işçinin maaşı və işəgötürən xərci seçilmiş rejimə görə filiallara bölünür; işçi kartında pay faizi əl ilə yazılıbsa, o üstün tutulur. Satış limitinə çatan filialın bonusu işçinin əmək haqqına avtomatik əlavə olunur (vergi və sığorta ilə).|The salary and employer cost of an employee working in several branches are split among the branches by the chosen mode; if a share percentage is entered manually on the employee card, it takes priority. The bonus of a branch that reaches its sales limit is added to the employee's payroll automatically (with tax and insurance).|Зарплата и расходы работодателя на сотрудника, работающего в нескольких филиалах, делятся между филиалами по выбранному режиму; если в карточке сотрудника вручную указан процент доли, он приоритетен. Бонус филиала, достигшего лимита продаж, автоматически добавляется к зарплате сотрудника (с налогом и взносами).
Filiala bağlı olmayan işçilər (|Employees not linked to a branch (|Сотрудники, не привязанные к филиалу (
Bunların maaşı filiallara bölünmür. Bağlamaq üçün «İşçilər» sekməsinə baxın.|Their salary is not split among branches. See the “Employees” tab to link them.|Их зарплата не делится между филиалами. Чтобы привязать, откройте вкладку «Сотрудники».
Gündəlik maliyyə əməliyyatlarını düzgün və vaxtında icra etmək|Carry out daily financial operations correctly and on time|Правильно и вовремя выполнять ежедневные финансовые операции
Aylıq hesabatları hazırlamaq və məlumatların dəqiqliyini yoxlamaq|Prepare monthly reports and verify data accuracy|Готовить месячные отчёты и проверять точность данных
Sənədləri sistemləşdirmək və aidiyyəti tərəflərlə uzlaşdırmaq|Systematise documents and reconcile them with the relevant parties|Систематизировать документы и согласовывать их с заинтересованными сторонами
Maliyyə, mühasibatlıq və ya uyğun sahə üzrə təhsil|Education in finance, accounting or a related field|Образование в области финансов, бухгалтерии или смежной сфере
Excel və maliyyə hesabatları ilə işləmək bacarığı|Ability to work with Excel and financial reports|Умение работать с Excel и финансовой отчётностью
Dəqiqlik, analitik düşüncə və məsuliyyət|Accuracy, analytical thinking and responsibility|Точность, аналитическое мышление и ответственность
Mühasib köməkçisi təfərrüatı|Accounting assistant details|Детали: помощник бухгалтера
Əsas çəki gördüyünüz işə və nəticələrə (40%) və iş təcrübəsində göstərilən bacarıq və sertifikatlara (35%) verilir. Profilin doldurulması (15%) və mətnin oxunaqlılığı (10%) yalnız yoxlama siyahısıdır. Bu işə qəbul ehtimalı deyil.|The main weight goes to the work and results you have done (40%) and the skills and certificates shown in work experience (35%). Profile completeness (15%) and text readability (10%) are only a checklist. This is not the probability of being hired.|Основной вес приходится на выполненную работу и результаты (40%) и навыки и сертификаты, указанные в опыте работы (35%). Полнота профиля (15%) и читаемость текста (10%) — лишь контрольный список. Это не вероятность приёма на работу.
Bacarıqların çoxu iş təcrübəsində göstərilməyib: hər bacarığı işlədiyiniz konkret vəzifə və nəticə ilə əlaqələndirin.|Most skills are not shown in work experience: link each skill to the specific position and result where you used it.|Большинство навыков не указано в опыте работы: связывайте каждый навык с конкретной должностью и результатом, где вы его применяли.
Aylıq uçot, vergi bəyannamələri, bank əməliyyatları və balans hazırlığı.|Monthly bookkeeping, tax returns, bank operations and balance sheet preparation.|Ежемесячный учёт, налоговые декларации, банковские операции и подготовка баланса.
Təcrübə 1 sil|Delete experience 1|Удалить опыт 1
· 0/2 (0%) — keçmədiniz|· 0/2 (0%) — you did not pass|· 0/2 (0%) — вы не прошли
Səbəb: Tələb olunan təcrübə çatmır — 2 il çatmır|Reason: The required experience is missing — 2 years are lacking|Причина: не хватает требуемого опыта — не хватает 2 лет
(qazanılıb|(earned|(заработано
, istifadə|, used|, использовано
-ci il üçün məzuniyyət planlaşdırılmayıb.|no vacation has been planned for the year.|отпуск на год не запланирован.
Şirkətin daxili əmək qaydaları, siyasətləri və razılıq sənədləri. Mətn dəyişəndə yeni versiya yaranır və yenidən təsdiq istənilir. Razılığı istənilən vaxt geri götürə bilərsiniz.|The company's internal labour rules, policies and consent documents. When the text changes a new version is created and confirmation is asked again. You can withdraw consent at any time.|Правила внутреннего распорядка, политики и документы согласия компании. При изменении текста создаётся новая версия, и снова запрашивается подтверждение. Согласие можно отозвать в любой момент.
Təxminən 3 800 token bir tam CV analizidir. Yaddaşdan gələn (dəyişməyən CV) nəticə token çəkmir.|About 3,800 tokens make one full CV analysis. A result served from memory (an unchanged CV) uses no tokens.|Около 3 800 токенов — один полный анализ резюме. Результат из памяти (неизменённое резюме) токены не расходует.
“Mənim profilim” bölməsində CV faylını (PDF, DOCX, TXT) yükləyin; məlumatlar avtomatik oxunur. Sonra təcrübə, təhsil və bacarıqları yoxlayıb yadda saxlayın.|In “My profile” upload the CV file (PDF, DOCX, TXT); the data is read automatically. Then check and save your experience, education and skills.|В разделе «Мой профиль» загрузите файл резюме (PDF, DOCX, TXT); данные считываются автоматически. Затем проверьте и сохраните опыт, образование и навыки.
Vakansiyanı açın və “Müraciət et” düyməsini basın. Müraciət statusunu “Müraciətlərim” bölməsində izləyin.|Open the vacancy and press “Apply”. Follow the application status in “My applications”.|Откройте вакансию и нажмите «Откликнуться». Следите за статусом отклика в разделе «Мои отклики».
“Vakansiyalar” bölməsində axtarış sözü və ya filtr seçib “Bu axtarış üçün xəbərdarlıq yarat” düyməsini basın. Yeni uyğun vakansiya çıxanda bildiriş (və e-poçt qurulubsa məktub) alacaqsınız.|In “Vacancies” enter a search word or choose a filter and press “Create an alert for this search”. You will get a notification (and an e-mail if e-mail is set up) when a new matching vacancy appears.|В разделе «Вакансии» введите поисковое слово или выберите фильтр и нажмите «Создать оповещение для этого поиска». Когда появится новая подходящая вакансия, вы получите уведомление (и письмо, если настроен e-mail).
Giriş pəncərəsində “Şifrəni unutmusunuz?” seçin və e-poçtunuzu yazın; yeniləmə linki göndəriləcək.|In the sign-in window choose “Forgot your password?” and enter your e-mail; a reset link will be sent.|В окне входа выберите «Забыли пароль?» и введите e-mail; будет отправлена ссылка для сброса.
Profilinizdə “İş təkliflərinə açığam” seçilməyibsə, yalnız müraciət etdiyiniz şirkət görür. Əlaqə məlumatlarınız yalnız müraciət etdiyiniz işəgötürənlə paylaşılır.|If “Open to job offers” is not selected in your profile, only the company you applied to sees it. Your contact details are shared only with the employer you applied to.|Если в профиле не выбрано «Открыт к предложениям о работе», его видит только компания, в которую вы откликнулись. Ваши контакты передаются только работодателю, которому вы откликнулись.
Hesab → Təhlükəsizlik bölməsində “Məlumatlarımı yüklə” faylı və “Hesabı sil” seçimi var.|In Account → Security there is a “Download my data” file and a “Delete account” option.|В разделе «Аккаунт → Безопасность» есть файл «Скачать мои данные» и пункт «Удалить аккаунт».
Cavablarınız hər 20 saniyədən bir saxlanılır. Vaxt serverdə hesablanır; yenidən daxil olub davam edə bilərsiniz.|Your answers are saved every 20 seconds. The time is counted on the server; you can sign in again and continue.|Ваши ответы сохраняются каждые 20 секунд. Время считается на сервере; можно снова войти и продолжить.
Bu hesab bütün istifadəçilərin məlumatlarına çatır. Yuxarıdakı hesab menyusundan “Hesab parametrləri”ni açıb autentifikator tətbiqi ilə iki mərhələli girişi aktiv edin.|This account reaches all users' data. Open “Account settings” from the account menu above and enable two-step sign-in with an authenticator app.|Этот аккаунт имеет доступ к данным всех пользователей. Откройте «Настройки аккаунта» в меню аккаунта выше и включите двухэтапный вход с приложением-аутентификатором.
CSV nümunəsi|CSV sample|Образец CSV
Tərcümə yoxlaması, təkrarların birləşdirilməsi, CSV idxal və ehtiyat nüsxə|Translation check, merging duplicates, CSV import and backup|Проверка переводов, объединение дубликатов, импорт CSV и резервная копия
(növ: universitet və ya ixtisas). Artıq olanlar atlanır və hesabatda göstərilir. Bacarıqlar üçün idxal “Bacarıqlar kataloqu” bölməsindədir.|(type: university or major). Existing ones are skipped and shown in the report. The import for skills is in the “Skills catalogue” section.|(тип: университет или специальность). Уже существующие пропускаются и показываются в отчёте. Импорт навыков находится в разделе «Каталог навыков».
Yalnız admin və istifadəçilərin əlavə etdiyi qeydlər yoxlanılır; ilkin kataloq koddadır.|Only entries added by admins and users are checked; the initial catalogue is in the code.|Проверяются только записи, добавленные администраторами и пользователями; исходный каталог находится в коде.
Saytı bərpa etmək üçün lazım olan məlumatın (hesab adları, profillər, vakansiyalar, müraciətlər, şirkət profilləri, kataloqlar, ayarlar) əl ilə JSON nüsxəsi. Parollar, sessiyalar və kart məlumatı daxil deyil. Fayl şəxsi məlumat saxlayır: təhlükəsiz yerdə saxlayın. Hər yükləmə audit jurnalına yazılır. Cloudflare D1 Time Travel əlavə olaraq son 30 günə qayıtmağa imkan verir.|A manual JSON copy of the data needed to restore the site (account names, profiles, vacancies, applications, company profiles, catalogues, settings). Passwords, sessions and card data are not included. The file holds personal data: store it in a safe place. Every download is written to the audit log. Cloudflare D1 Time Travel additionally lets you go back up to the last 30 days.|Ручная JSON-копия данных, нужных для восстановления сайта (имена аккаунтов, профили, вакансии, заявки, профили компаний, каталоги, настройки). Пароли, сессии и данные карт не включены. Файл содержит личные данные: храните его в безопасном месте. Каждая выгрузка записывается в журнал аудита. Cloudflare D1 Time Travel дополнительно позволяет вернуться на последние 30 дней.
“Qaydalar” pulsuzdur və ani işləyir. “AI” hər namizəd–vakansiya cütü üçün bir dəfə analiz edir, nəticə saxlanılır və yalnız CV və ya vakansiya dəyişəndə yenidən hesablanır. Hər iki bal həmişə mövcuddur; burada yalnız hansının əsas götürüləcəyi seçilir.|“Rules” is free and instant. “AI” analyses each candidate–vacancy pair once, the result is stored and recalculated only when the CV or vacancy changes. Both scores always exist; here you only choose which one is the main one.|«Правила» бесплатны и работают мгновенно. «ИИ» анализирует каждую пару «кандидат–вакансия» один раз, результат сохраняется и пересчитывается только при изменении резюме или вакансии. Обе оценки всегда есть; здесь выбирается лишь, какая будет основной.
Burada etdiyiniz dəyişiklik bütün şirkətlərin təqvimində, davamiyyətdə, tabeldə və əmək haqqı hesablamasında dərhal nəzərə alınır. Ramazan və Qurban bayramı günləri hər il Nazirlər Kabinetinin qərarı ilə müəyyən edilir: qərar çıxanda yeni ilin bayram günlərini bura əlavə edin.|A change made here is immediately taken into account in all companies' calendars, attendance, timesheets and payroll. The days of Ramadan and Eid al-Adha are set each year by a decision of the Cabinet of Ministers: when the decision is issued, add the new year's holidays here.|Изменение, сделанное здесь, сразу учитывается в календарях, посещаемости, табелях и расчёте зарплаты всех компаний. Дни Рамазан и Курбан-байрама ежегодно определяются решением Кабинета министров: когда решение выйдет, добавьте сюда праздники нового года.
üçün admin dəyişiklikləri|admin changes for|изменения администратора за
Bu il üçün əlavə dəyişiklik yoxdur: yalnız qanunla müəyyən edilmiş standart təqvim işləyir.|There are no extra changes for this year: only the standard calendar set by law applies.|На этот год дополнительных изменений нет: действует только стандартный календарь, установленный законом.
Hər paket aylıq tam CV analizi və ucuz AI sıralaması verir. Tavanlar OpenAI qiyməti ilə (ən pis hal) hesablanıb: kvota tam işlənsə belə net qazanc hədəfdən aşağı düşmür (ƏDV, ödəniş komissiyası və xərclər çıxıldıqdan sonra).|Each package gives a monthly full CV analysis and a cheap AI ranking. The caps are calculated at the OpenAI price (worst case): even if the quota is fully used, net profit does not fall below the target (after VAT, payment commission and costs).|Каждый пакет даёт месячный полный анализ резюме и дешёвое ИИ-ранжирование. Потолки рассчитаны по цене OpenAI (худший случай): даже при полном использовании квоты чистая прибыль не падает ниже цели (после НДС, комиссии за оплату и расходов).
Şirkətlər (|Companies (|Компании (
(ən köhnəsi 609 saat)|(the oldest 609 hours)|(самый старый — 609 часов)
. Limit dolanda AI cavab vermir və sistem qaydalarla hesablanmış nəticə göstərir; 80%-də admin xəbərdarlıq görür. Xərc simvol sayından təxmin edilir, provayderin real hesabı ilə yoxlayın.|. When the limit is reached the AI does not answer and the system shows the result calculated by rules; at 80% the admin sees a warning. The cost is estimated from the number of characters, check it against the provider's real bill.|. Когда лимит исчерпан, ИИ не отвечает, и система показывает результат, рассчитанный по правилам; при 80% администратор видит предупреждение. Расход оценивается по числу символов, сверяйте с реальным счётом провайдера.
CV oxuma, analiz, yenidən yazma, vakansiya uyğunluğu, karyera məsləhəti, AI köməkçi.|CV reading, analysis, rewriting, vacancy match, career advice, AI assistant.|Чтение резюме, анализ, переписывание, соответствие вакансии, карьерные советы, ИИ-помощник.
Vakansiya layihəsi, namizəd sıralaması, test və sənəd oxuma, vəzifə adı uyğunlaşdırma.|Vacancy draft, candidate ranking, test and document reading, position name matching.|Черновик вакансии, ранжирование кандидатов, чтение тестов и документов, подбор названия должности.
Hər tərəfin öz limiti, öz xərci var: biri dolsa digəri işləməyə davam edir. Hər tərəf üçün ayrıca model də seçmək olur: Cloudflare-də|Each side has its own limit and cost: if one is exhausted the other keeps working. A separate model can also be chosen for each side: in Cloudflare|У каждой стороны свой лимит и расход: если один исчерпан, другой продолжает работать. Для каждой стороны можно выбрать и отдельную модель: в Cloudflare
və|and|и
dəyişənləri (boşdursa ümumi|variables (if empty, the general|переменные (если пусто — общая
işləyir).|is used).|используется).
Yaddaşdan verilib (AI-yə getməyib, xərc yoxdur):|Served from memory (did not go to the AI, no cost):|Выдано из памяти (к ИИ не обращались, расходов нет):
sorğu, bütün sorğuların|requests, of all requests|запросов, от всех запросов
Xərc simvol sayından (təxminən 4 simvol = 1 token) və \`lib/ai-cost.ts\`-dəki qiymətlərdən hesablanır; provayderin real hesabı ilə yoxlayın. Sorğu mətnləri saxlanılmır, yalnız say və ölçü.|The cost is calculated from the number of characters (about 4 characters = 1 token) and the prices in \`lib/ai-cost.ts\`; check it against the provider's real bill. Request texts are not stored, only count and size.|Расход считается по числу символов (примерно 4 символа = 1 токен) и ценам из \`lib/ai-cost.ts\`; сверяйте с реальным счётом провайдера. Тексты запросов не хранятся, только число и размер.
Nəticələr 30-dan çox rəydən sonra etibarlı olur. İndi|Results become reliable after more than 30 reviews. Now there are|Результаты становятся надёжными после более чем 30 отзывов. Сейчас
rəy var.|reviews.|отзывов.
Verilənlər bazası Cloudflare D1-dədir. D1 “Time Travel” ilə son 30 günün istənilən anına bərpa mümkündür (Cloudflare panelində: Workers & Pages → D1 → joblink-career-db → Time Travel). Bu saytdan avtomatik nüsxə çıxarılmır.|The database is in Cloudflare D1. With D1 “Time Travel” restoring to any moment in the last 30 days is possible (in the Cloudflare dashboard: Workers & Pages → D1 → joblink-career-db → Time Travel). No automatic copy is made from this site.|База данных находится в Cloudflare D1. С D1 «Time Travel» можно восстановить состояние на любой момент за последние 30 дней (в панели Cloudflare: Workers & Pages → D1 → joblink-career-db → Time Travel). С этого сайта автоматические копии не создаются.
· 25 gün gözləyir|· waiting 25 days|· ждёт 25 дней
Menyuda:|In the menu:|В меню:
Çap et / PDF|Print / PDF|Печать / PDF
HR meneceri|HR manager|HR-менеджер
Admin panel|Admin panel|Админ-панель
Ay yekunu|Month total|Итог месяца
Excel: ixrac|Excel: export|Excel: экспорт
Excel: ay yekunu|Excel: month total|Excel: итог месяца
ay yekunu|month total|итог месяца
Adaptasiya:|Onboarding:|Адаптация:
Müsahibəni quran:|Interview set by:|Интервью назначил:
Bütün vakansiyalar|All vacancies|Все вакансии
Aktiv vakansiyalar|Active vacancies|Активные вакансии
Vakansiya yaratmaq|Create a vacancy|Создать вакансию
Vakansiya tapmaq|Find a vacancy|Найти вакансию
Vakansiya aç|Open a vacancy|Открыть вакансию
Vakansiya meneceri|Vacancy manager|Менеджер вакансий
Son tarixi uzat…|Extend deadline…|Продлить срок…
Son tarixi uzat|Extend deadline|Продлить срок
Vergi güzəşti — aylıq gəlirin azalması (AZN)|Tax relief — monthly income reduction (AZN)|Налоговая льгота — уменьшение месячного дохода (AZN)
Güzəşt yoxdur|No relief|Нет льготы
50 — himayəsində azı 3 nəfər (102.5)|50 — at least 3 dependants (102.5)|50 — не менее 3 иждивенцев (102.5)
100 — 102.4 (məcburi köçkün, daimi qulluq edən I dərəcə və s.)|100 — 102.4 (forcibly displaced person, permanent carer of grade I, etc.)|100 — 102.4 (вынужденный переселенец, постоянный опекун I степени и т.д.)
200 — 102.3 (əlillik 61–100%, əlilliyi olan uşaq, daimi qulluq edən)|200 — 102.3 (disability 61–100%, child with disability, permanent carer)|200 — 102.3 (инвалидность 61–100%, ребёнок-инвалид, постоянный опекун)
250 — 200 + himayəsində 3 nəfər|250 — 200 + 3 dependants|250 — 200 + 3 иждивенца
400 — 102.2 (qəhrəman, müharibə veteranı, müharibə əlili I–II və s.)|400 — 102.2 (hero, war veteran, war invalid of group I–II, etc.)|400 — 102.2 (герой, ветеран войны, инвалид войны I–II гр. и т.д.)
450 — 400 + himayəsində 3 nəfər|450 — 400 + 3 dependants|450 — 400 + 3 иждивенца
800 — şəhid ailəsi (102.1-1)|800 — martyr's family (102.1-1)|800 — семья шехида (102.1-1)
850 — 800 + himayəsində 3 nəfər|850 — 800 + 3 dependants|850 — 800 + 3 иждивенца
Platforma administratoru|Platform administrator|Администратор платформы
Performans dövrü açın: məqsədlər, özünü və rəhbər qiymətləndirməsi; nəticədən maaş artımı təklifi ola bilər.|Open a performance period: goals, self and manager reviews; the result can lead to a pay-rise proposal.|Откройте период оценки: цели, самооценка и оценка руководителя; по итогам возможно предложение о повышении зарплаты.
Qiymətləndirmə dövrü üzrə məqsədlər, özünüqiymət, rəhbər qiyməti və dərəcə.|Goals, self-rating, manager rating and grade for the review period.|Цели, самооценка, оценка руководителя и уровень за период оценки.
Özünüqiymətləndirmə və rəhbər qiymətləndirməsi performans dövründə burada doldurulur.|Self and manager reviews are filled in here during the performance period.|Самооценка и оценка руководителя заполняются здесь в период оценки.
Hesabat axtar|Search reports|Поиск отчётов
Saat uçotu|Time tracking|Учёт часов
Yeni il|New Year|Новый год
Link kopyala|Copy link|Копировать ссылку
Hüquq yaranan gün|Day the right arises|День возникновения права
Son gün|Last day|Последний день
21 gün (ümumi)|21 days (general)|21 день (общий)
30 gün (rəhbər, mütəxəssis, həkim və s.)|30 days (managers, specialists, doctors, etc.)|30 дней (руководители, специалисты, врачи и др.)
18 yaşınadək əlilliyi olan işçi (Əmək Məcəlləsi 119.2: 42 gün)|Employee with disability under 18 (Labour Code 119.2: 42 days)|Работник с инвалидностью до 18 лет (ТК 119.2: 42 дня)
14 yaşınadək uşaq sayı|Number of children under 14|Количество детей до 14 лет
3 ay (6 aya qədər müqavilədə 2 həftə)|3 months (2 weeks for contracts up to 6 months)|3 месяца (2 недели для договоров до 6 месяцев)
22:00-dan 06:00-dək gecə vaxtı sayılır (97.1).|22:00 to 06:00 counts as night time (97.1).|С 22:00 до 06:00 считается ночным временем (97.1).
Tutulma növü|Deduction type|Тип удержания
Ümumi hal (20%)|General case (20%)|Общий случай (20%)
Qaydalar (pulsuz)|Rules (free)|Правила (бесплатно)
Qeyd:|Note:|Примечание:
Sizin rolunuz:|Your role:|Ваша роль:
Açar:|Key:|Ключ:
Açar yoxdur.|No key.|Ключа нет.
Aktiv paket:|Active package:|Активный пакет:
Cari paket:|Current package:|Текущий пакет:
Aktiv paket|Active package|Активный пакет
AI limitiniz|Your AI limit|Ваш лимит ИИ
5 saatlıq balans:|5-hour balance:|Баланс на 5 часов:
5 saatlıq AI balansı|5-hour AI balance|5-часовой баланс ИИ
AI CV analizi|AI CV analysis|ИИ-анализ резюме
CV oxuma|CV reading|Чтение резюме
Tam analiz|Full analysis|Полный анализ
Yeni vakansiyalar: HR meneceri → direktor|New vacancies: HR manager → director|Новые вакансии: HR-менеджер → директор
Direktor (Ad Soyad)|Director (full name)|Директор (ФИО)
(xarici)|(external)|(внешний)
Arxiv (0)|Archive (0)|Архив (0)
Profilinizi doldurun|Complete your profile|Заполните свой профиль
50% tamamlanıb|50% complete|Заполнено на 50%
3 ilə qədər|Up to 3 years|До 3 лет
5 ilə qədər|Up to 5 years|До 5 лет
5 ildən çox|More than 5 years|Более 5 лет
1 ilə qədər|Up to 1 year|До 1 года
40% və yuxarı|40% and above|40% и выше
60% və yuxarı|60% and above|60% и выше
80% və yuxarı|80% and above|80% и выше
son 30 gün|last 30 days|последние 30 дней
son 12 ay|last 12 months|последние 12 месяцев
Son 90 gün:|Last 90 days:|Последние 90 дней:
Tez keçid|Quick links|Быстрый переход
Kim yoxdur|Who is absent|Кого нет
Qeyd et|Mark|Отметить
Bonus:|Bonus:|Бонус:
Bonus növü|Bonus type|Тип бонуса
Dolu:|Filled:|Занято:
saat · boş:|hours · free:|часов · свободно:
Dayanmış namizədlər (|Stalled candidates (|Застрявшие кандидаты (
+ gün hərəkətsiz|+ days inactive|+ дней без движения
+ gün hərəkətsiz = dayanıb|+ days inactive = stalled|+ дней без движения = застрял
% müraciətlərdən|% of applications|% от откликов
1-ci həftəni 2-ciyə köçür|Move week 1 to week 2|Перенести 1-ю неделю на 2-ю
Saat uçotuna köçür|Move to time tracking|Перенести в учёт часов
+ Elan|+ Posting|+ Объявление
Bank reyestri (XLSX)|Bank register (XLSX)|Банковский реестр (XLSX)
Qeydli gün|Recorded day|Отмеченный день
1 × tam ştat = 1 tam ştat vahidi.|1 × full-time = 1 full-time unit.|1 × полная ставка = 1 штатная единица.
3 aya proqnoz|3-month forecast|Прогноз на 3 месяца
ilkin plan|initial plan|первоначальный план
Dövr yoxdur|No period|Периода нет
+ Yeni dövr|+ New period|+ Новый период
Kilidi aç|Unlock|Разблокировать
Bayram günü|Public holiday|Праздничный день
Riskli deyil|Not risky|Без риска
AI düz deyib|AI was right|ИИ был прав
Mühasib üzrə rəhbər|Head of accounting|Руководитель бухгалтерии
Kassir-mühasib üzrə rəhbər|Head of cashier-accountant|Руководитель кассира-бухгалтера
Universitetlər (|Universities (|Университеты (
İxtisaslar (|Specialties (|Специальности (
qeyd ·|note ·|заметка ·
Aylıq uçot, vergi bəyannamələri, bank əməliyyatları və balans hazırlığı.|Monthly bookkeeping, tax returns, bank operations and balance sheet preparation.|Ежемесячный учёт, налоговые декларации, банковские операции и подготовка баланса.
İşçi və ya HR ezamiyyət sorğusu yaradır, rəhbər və HR təsdiqləyir, işçi xərc hesabatı verir, hesablaşma əmək haqqında «digər ödəniş» kimi qeyd olunur.|An employee or HR creates a business-trip request, the manager and HR approve it, the employee submits an expense report, and settlement is recorded as “other payment” in payroll.|Сотрудник или HR создаёт заявку на командировку, руководитель и HR утверждают, сотрудник сдаёт авансовый отчёт, расчёт отражается в зарплате как «прочая выплата».
Ad, vəzifə və ya şöbə üzrə axtar (16 nəfər)|Search by name, position or department (16 people)|Поиск по имени, должности или отделу (16 человек)
Departament|Department|Департамент
Departamentsiz|No department|Без департамента
departamentsiz|no department|без департамента
Rol|Role|Роль
Performans|Performance|Эффективность
Hesablama|Calculation|Расчёт
Bank|Bank|Банк
Filial|Branch|Филиал
Struktur|Structure|Структура
Sektor|Sector|Сектор
Ay|Month|Месяц
Gün|Day|День
Norma|Norm|Норма
Ayarlar|Settings|Настройки
Kod|Code|Код
Axtar|Search|Поиск
Elanlar|Announcements|Объявления
Elan yoxdur.|No announcements.|Объявлений нет.
Say|Count|Количество
aktiv|active|активно
Kompensasiya|Compensation|Компенсация
Paket|Package|Пакет
Server|Server|Сервер
Kollektiv|Team|Коллектив
Hesabat|Report|Отчёт
Versiya|Version|Версия
Saat|Hour|Час
Çap|Print|Печать
Qaydalar|Rules|Правила
Gündüz|Day|День
Yoxlama|Check|Проверка
Dolu|Filled|Занято
Kartda|On the card|В карточке
Qrafik|Schedule|График
Kiçilt|Zoom out|Уменьшить
Böyüt|Zoom in|Увеличить
Rekruter|Recruiter|Рекрутер
Yeni|New|Новое
Direktor|Director|Директор
Son|Last|Последний
Avans|Advance|Аванс
avans|advance|аванс
Kim|Who|Кто
Aç|Open|Открыть
Ad Soyad|Full name|ФИО
Ad|Name|Имя
Vaxt|Time|Время
Pay|Share|Доля
Qayda|Rule|Правило
Limit|Limit|Лимит
Komanda|Team|Команда
Referans|Reference|Рекомендация
Vebsayt|Website|Сайт
Onlayn|Online|Онлайн
Problem|Problem|Проблема
Funksiya|Function|Функция
Provayder|Provider|Провайдер
Yer|Place|Место
Sonuncu|Latest|Последний
Bloklar|Blocks|Блоки
İddia|Claim|Заявление
Kataloqlar|Catalogs|Каталоги
Sığorta və daşınmaz əmlak|Insurance and real estate|Страхование и недвижимость
Marketinq və satış|Marketing and sales|Маркетинг и продажи
Kibertəhlükəsizlik, İT audit və məxfilik|Cybersecurity, IT audit and privacy|Кибербезопасность, ИТ-аудит и конфиденциальность
Hüquq və uyğunluq|Law and compliance|Право и комплаенс
Dil sertifikatları|Language certificates|Языковые сертификаты
Qida, otel və turizm|Food, hotels and tourism|Питание, отели и туризм
Aviasiya, dənizçilik və nəqliyyat|Aviation, maritime and transport|Авиация, морское дело и транспорт
Bank, risk və AML|Banking, risk and AML|Банки, риски и AML
Biznes|Business|Бизнес
Dizayn|Design|Дизайн
İT|IT|ИТ
Kənd təsərrüfatı|Agriculture|Сельское хозяйство
Məlumat|Data|Данные
Neft və enerji|Oil and energy|Нефть и энергетика
Nəqliyyat və logistika|Transport and logistics|Транспорт и логистика
Proqramlar|Software|Программы
Şəxsi bacarıqlar|Personal skills|Личные навыки
Təhlükəsizlik|Safety|Безопасность
Tikinti|Construction|Строительство
Xidmət|Service|Услуги
Biznes təhlili və idarəetmə|Business analysis and management|Бизнес-анализ и управление
Məlumat və süni intellekt|Data and artificial intelligence|Данные и искусственный интеллект
Əməyin mühafizəsi və neft-qaz təhlükəsizliyi|Occupational safety and oil-and-gas safety|Охрана труда и безопасность в нефтегазовой отрасли
Təhsil və tədris|Education and teaching|Образование и обучение
Ofis və rəqəmsal savadlılıq|Office and digital literacy|Офисная и цифровая грамотность
Satınalma, logistika və anbar|Procurement, logistics and warehouse|Закупки, логистика и склад
Mühəndislik, tikinti və istehsal|Engineering, construction and manufacturing|Инженерия, строительство и производство
İT və məlumat|IT and data|ИТ и данные
Marketinq, media və dizayn|Marketing, media and design|Маркетинг, медиа и дизайн
Təhsil və təlim|Education and training|Образование и обучение
Otel, restoran və turizm|Hotels, restaurants and tourism|Отели, рестораны и туризм
Səhiyyə və əczaçılıq|Healthcare and pharmaceuticals|Здравоохранение и фармацевтика
Təhlükəsizlik və əməyin mühafizəsi|Security and occupational safety|Безопасность и охрана труда
İnzibati və idarəetmə|Administration and management|Административная работа и управление
Neft-qaz, energetika və mədənçıxarma|Oil and gas, energy and mining|Нефтегаз, энергетика и добыча
Kənd təsərrüfatı və qida istehsalı|Agriculture and food production|Сельское хозяйство и пищевое производство
Peşə və istehsal işçiləri|Trades and production workers|Рабочие профессии и производство
Nəqliyyat və aviasiya|Transport and aviation|Транспорт и авиация
Elm, tədqiqat və laboratoriya|Science, research and laboratory|Наука, исследования и лаборатории
Sosial xidmət və qeyri-kommersiya|Social services and non-profit|Социальные услуги и некоммерческий сектор
Gözəllik, idman və şəxsi xidmət|Beauty, sport and personal services|Красота, спорт и персональные услуги
Dövlət və bələdiyyə xidməti|Public and municipal service|Государственная и муниципальная служба
Maliyyə və mühasibatlıq|Finance and accounting|Финансы и бухгалтерия
Keyfiyyət və ISO|Quality and ISO|Качество и ISO
Satınalma və logistika|Procurement and logistics|Закупки и логистика
Dizayn və media|Design and media|Дизайн и медиа
Səhiyyə|Healthcare|Здравоохранение
İnsan resursları və kouçinq|Human resources and coaching|Управление персоналом и коучинг
İT, şəbəkə və proqramlaşdırma|IT, networking and programming|ИТ, сети и программирование
Layihə idarəetməsi və Agile|Project management and Agile|Управление проектами и Agile
Mühəndislik, inspeksiya və enerji|Engineering, inspection and energy|Инженерия, инспекция и энергетика
Yan|Jan|Янв
Fev|Feb|Фев
Mar|Mar|Мар
Apr|Apr|Апр
May|May|Май
İyn|Jun|Июн
Avq|Aug|Авг
Sen|Sep|Сен
Okt|Oct|Окт
Noy|Nov|Ноя
Dek|Dec|Дек
yan|jan|янв
mar|mar|мар
may|may|май
iyl|jul|июл
sen|sep|сен
noy|nov|ноя
Yanvar|January|Январь
Fevral|February|Февраль
Mart|March|Март
Aprel|April|Апрель
İyun|June|Июнь
İyul|July|Июль
Avqust|August|Август
Sentyabr|September|Сентябрь
Oktyabr|October|Октябрь
Noyabr|November|Ноябрь
Dekabr|December|Декабрь
Bayram günü|Public holiday|Праздничный день
Zəfər günü (iş günü köçürülüb)|Victory Day (working day moved)|День Победы (рабочий день перенесён)
Ramazan bayramı (iş günü köçürülüb)|Ramadan Bayram (working day moved)|Рамазан байрамы (рабочий день перенесён)
Novruz bayramı (iş günü köçürülüb)|Novruz holiday (working day moved)|Праздник Новруз (рабочий день перенесён)
Ümumxalq hüzn günü|National day of mourning|День общенационального траура
Böyük hesabatları «Arxa planda hazırla» ilə sifariş edib səhifədən ayrıla bilərsiniz: hazır olanda bildiriş gəlir. Nəticə 7 gün saxlanır.|You can order large reports with “Prepare in background” and leave the page: a notification arrives when it is ready. The result is kept for 7 days.|Большие отчёты можно заказать через «Подготовить в фоне» и закрыть страницу: когда отчёт будет готов, придёт уведомление. Результат хранится 7 дней.
Dövr açın, hər işçiyə məqsəd yazın. İşçi icranı və özünüqiyməti doldurur, rəhbər və kolleqalar rəy verir, sonda işçi nəticə ilə tanış olub təsdiq edir. Rəhbər öz komandasını «İş yerim → Komandam»dan qiymətləndirə bilər.|Open a period and write a goal for each employee. The employee fills in progress and self-rating, the manager and colleagues give feedback, and finally the employee reviews the result and confirms. A manager can rate their team from “My workplace → My team”.|Откройте период и запишите цель для каждого сотрудника. Сотрудник заполняет выполнение и самооценку, руководитель и коллеги дают отзывы, в конце сотрудник знакомится с результатом и подтверждает. Руководитель может оценить свою команду в «Моё рабочее место → Моя команда».
Başqa vəzifəyə, departamentə, şöbəyə və ya filiala keçirmə (maaş dəyişikliyi ilə birgə də ola bilər)|Transfer to another position, department, section or branch (may come with a salary change)|Перевод на другую должность, в другой департамент, отдел или филиал (может сопровождаться изменением зарплаты)
Başqa vəzifəyə, departamentə, şöbəyə və ya filiala keçirmə haqqında əmr (maaş dəyişikliyi ilə birgə də ola bilər)|Order on transfer to another position, department, section or branch (may come with a salary change)|Приказ о переводе на другую должность, в другой департамент, отдел или филиал (может сопровождаться изменением зарплаты)
Hər sətirdə bir dövr: 2020-01-01 – 2022-06-30|One period per line: 2020-01-01 – 2022-06-30|Один период на строку: 2020-01-01 – 2022-06-30
Təsvir çox qısadır|The description is too short|Описание слишком короткое
Çox illik təcrübəsi olan mühasib: uçot, hesabatlar, vergi bəyannamələri.|Accountant with years of experience: bookkeeping, reports, tax returns.|Бухгалтер с многолетним опытом: учёт, отчёты, налоговые декларации.
Paketi seç|Choose package|Выбрать пакет
Bank ödənişi hələ qoşulmayıb: sorğu göndərilir, paket komanda tərəfindən aktivləşdirilir.|Bank payment is not connected yet: a request is sent and the team activates the package.|Банковская оплата ещё не подключена: отправляется заявка, пакет активирует команда.
Sorğunuz göndərildi. Komanda paketi aktivləşdirəcək, cavab «Dəstək» bölməsində görünəcək.|Your request was sent. The team will activate the package; the answer will appear in “Support”.|Заявка отправлена. Команда активирует пакет, ответ появится в разделе «Поддержка».
İstifadəçi paket seçib.|The user has chosen a package.|Пользователь выбрал пакет.
Paketi 30 gün aktivləşdir|Activate the package for 30 days|Активировать пакет на 30 дней
Paket 30 gün üçün aktivləşdirildi.|The package was activated for 30 days.|Пакет активирован на 30 дней.
E-poçt təsdiq kodu (|E-mail verification code (|Код подтверждения e-mail (
E-poçtunuzu təsdiqləyin|Confirm your e-mail|Подтвердите ваш e-mail
Təsdiq kodu e-poçt ünvanınıza göndərildi. 6 rəqəmli kodu yazın.|A verification code was sent to your e-mail address. Enter the 6-digit code.|Код подтверждения отправлен на ваш e-mail. Введите 6-значный код.
Təsdiq et|Confirm|Подтвердить
Kodu yenidən göndər|Send the code again|Отправить код ещё раз
Yeni kod göndərildi. Qutunuzu (və spam qovluğunu) yoxlayın.|A new code was sent. Check your inbox (and the spam folder).|Новый код отправлен. Проверьте почту (и папку «Спам»).
Kod yanlışdır və ya vaxtı bitib. Yeni kod istəyə bilərsiniz.|The code is wrong or has expired. You can ask for a new code.|Код неверный или срок его действия истёк. Вы можете запросить новый код.
Çox yanlış cəhd. Yeni kod istəyin və bir az sonra yenidən cəhd edin.|Too many wrong attempts. Ask for a new code and try again a little later.|Слишком много неверных попыток. Запросите новый код и повторите чуть позже.
E-poçtunuz hələ təsdiqlənməyib. Ünvanınıza yeni kod göndərildi.|Your e-mail is not confirmed yet. A new code was sent to your address.|Ваш e-mail ещё не подтверждён. На ваш адрес отправлен новый код.
Xəbərdarlıq yaratmaq üçün əvvəl axtarış sözü yazın və ya filtr (şəhər, kateqoriya, maaş və s.) seçin, sonra bu düyməni basın.|To create an alert, first type a search word or choose a filter (city, category, salary, etc.), then press this button.|Чтобы создать оповещение, сначала введите поисковое слово или выберите фильтр (город, категория, зарплата и т. д.), затем нажмите эту кнопку.
Əvvəl axtarış sözü yazın və ya filtr seçin.|First type a search word or choose a filter.|Сначала введите поисковое слово или выберите фильтр.`;
const EN: Record<string, string> = {};
const RU: Record<string, string> = {};
for (const line of LINES.split("\n")) {
  const [az, en, ru] = line.split("|");
  if (az && en) EN[az] = en;
  if (az && ru) RU[az] = ru;
}
export const EN_PAGES = EN;
export const RU_PAGES = RU;

// Sentences with numbers or names inside: (pattern, English, Russian). $1.. are the captured parts; a captured part is translated by `part` when it is a known phrase.
type Rule = [RegExp, string, string];
const RULES: Rule[] = [
  [/^(.+): təfərrüatlara bax$/, "$1: see details", "$1: смотреть детали"],
  [/^(.+): (\d+) işçi$/, "$1: $2 employees", "$1: $2 сотр."],
  [/^(.+): (\d+) boş yer$/, "$1: $2 vacant places", "$1: $2 свободных мест"],
  [/^(.+): (\d+) \((\d+)%\)$/, "$1: $2 ($3%)", "$1: $2 ($3%)"],
  [/^(.+): (\d+) ştatdan (\d+) yer boşdur \((\d+)%\)\.$/, "$1: $3 of $2 staff places are vacant ($4%).", "$1: свободно $3 из $2 штатных мест ($4%)."],
  [/^: (\d+) işçi ştat cədvəlində yerə uyğun gəlmir\.$/, ": $1 employees do not fit a place in the staff schedule.", ": $1 сотр. не соответствуют месту в штатном расписании."],
  [/^· (\d+) müraciət$/, "· $1 applications", "· $1 откликов"],
  [/^son tarixə (\d+) gün qalıb$/, "$1 days until the deadline", "до срока осталось $1 дн."],
  [/^son tarix (\d+) gün əvvəl bitib$/, "the deadline ended $1 days ago", "срок истёк $1 дн. назад"],
  [/^orta (\d+) gün, (\d+) nəfər$/, "average $1 days, $2 people", "в среднем $1 дн., $2 чел."],
  [/^Ad, vəzifə və ya şöbə üzrə axtar \((\d+) nəfər\)$/, "Search by name, position or section ($1 people)", "Поиск по имени, должности или отделу ($1 чел.)"],
  [/^(.+) axtarışını sil$/, "Delete the search “$1”", "Удалить поиск «$1»"],
  [/^(.+) seç$/, "Select $1", "Выбрать $1"],
  [/^(.+) sil$/, "Delete $1", "Удалить $1"],
  [/^(.+) nömrəli əmri seç$/, "Select order no. $1", "Выбрать приказ № $1"],
  [/^· vakansiya: (.+)$/, "· vacancy: $1", "· вакансия: $1"],
  [/^(.+) · (\d+) il təcrübə$/, "$1 · $2 years of experience", "$1 · опыт $2 лет"],
  [/^Departament təklifi \+(\d+) yer: (.+)$/, "Department proposal +$1 place: $2", "Предложение департамента +$1 место: $2"],
  [/^Plandan kənar \+(\d+) yer: (.+)$/, "Out of plan +$1 place: $2", "Вне плана +$1 место: $2"],
  [/^Gross maaş \(işçiyə hesablanan\): (.+)$/, "Gross salary (accrued to the employee): $1", "Gross-зарплата (начисленная сотруднику): $1"],
  [/^DSMF \(dövlət sosial sığorta\), işəgötürən payı: (.+)$/, "DSMF (state social insurance), employer share: $1", "ГФСЗ (госсоцстрах), доля работодателя: $1"],
  [/^İşsizlikdən sığorta, işəgötürən payı: (.+)$/, "Unemployment insurance, employer share: $1", "Страхование по безработице, доля работодателя: $1"],
  [/^İcbari tibbi sığorta, işəgötürən payı: (.+)$/, "Compulsory medical insurance, employer share: $1", "Обязательное медицинское страхование, доля работодателя: $1"],
  [/^Təsdiqlənməmiş şirkət (\d+) vakansiya yaradıb$/, "An unverified company created $1 vacancies", "Неподтверждённая компания создала $1 вакансий"],
  [/^Eyni şirkətdən eyni başlıqlı (\d+) elan$/, "$1 listings with the same title from the same company", "$1 объявления с одним названием от одной компании"],
  [/^(.+) · Eyni şirkətdən eyni başlıqlı (\d+) elan$/, "$1 · $2 listings with the same title from the same company", "$1 · $2 объявления с одним названием от одной компании"],
  [/^Sənəd (.+) tarixində göndərilib, administrator yoxlayır\.$/, "The document was sent on $1; the administrator is reviewing it.", "Документ отправлен $1; администратор проверяет."],
  [/^Son fəaliyyət: (.+)$/, "Last activity: $1", "Последняя активность: $1"],
  [/^(\d+) dəqiqə · göndərilib$/, "$1 min · sent", "$1 мин · отправлено"],
  [/^(.+) · (.+) · (\d+) gün gözləyir$/, "$1 · $2 · waiting $3 days", "$1 · $2 · ждёт $3 дн."],
  [/^· (\d+) gün gözləyir$/, "· waiting $1 days", "· ждёт $1 дн."],
  [/^(\d{4}-\d{2}): plan (\d+), faktiki (\d+) — plandan (\d+) nəfər azdır \(işə qəbul lazım ola bilər\)\.$/, "$1: plan $2, actual $3 — $4 fewer people than planned (hiring may be needed).", "$1: план $2, факт $3 — на $4 чел. меньше плана (возможно, нужен найм)."],
  [/^(\d{4}-\d{2}): plan (\d+)$/, "$1: plan $2", "$1: план $2"],
  [/^(\d{4}-\d{2}): (\d+) işçi, (\d+) qəbul, (\d+) çıxış$/, "$1: $2 employees, $3 hired, $4 left", "$1: $2 сотр., $3 принято, $4 уволено"],
  [/^(\d{4}-\d{2}): (\d+) nəfər işə qəbul$/, "$1: $2 people hired", "$1: принято $2 чел."],
  [/^(\d{4}-\d{2}): (\d+) nəfər çıxıb$/, "$1: $2 people left", "$1: уволилось $2 чел."],
  [/^(\d{4}-\d{2}): təxminən ([\d.]+) işçi \(proqnoz\)$/, "$1: about $2 employees (forecast)", "$1: примерно $2 сотр. (прогноз)"],
  [/^(\d{4}-\d{2}-\d{2}) — Bayram ərəfəsi: qısaldılmış iş günü \(1 saat az, haqq tam\)$/, "$1 — Holiday eve: shortened working day (1 hour less, full pay)", "$1 — Предпраздничный день: сокращённый рабочий день (на 1 час меньше, оплата полная)"],
  [/^(.+) (\d{4}-\d{2}) büdcəsi$/, "$1 $2 budget", "Бюджет $1 $2"],
  [/^Bölünməmiş \(ümumi\)$/, "Unallocated (general)", "Нераспределённый (общий)"],
  [/^(\d+) nəfər$/, "$1 people", "$1 чел."],
  [/^(\d+) işçi$/, "$1 employees", "$1 сотр."],
  [/^(\d+) namizəd$/, "$1 candidates", "$1 кандидатов"],
  [/^(\d+) müraciət$/, "$1 applications", "$1 откликов"],
  [/^(\d+) gecikib$/, "$1 late", "$1 просрочено"],
  [/^· (\d+) gecikib$/, "· $1 late", "· $1 просрочено"],
  [/^(\d+)\+ gündür gözləyir$/, "waiting for $1+ days", "ждёт $1+ дней"],
  [/^(\d+) il təcrübəniz və (.+) bacarıqlarınız bu istiqamətlə əlaqəlidir\.$/, "Your $1 years of experience and $2 skills are related to this direction.", "Ваш опыт $1 лет и навыки $2 связаны с этим направлением."],
  [/^([\d.]+) illik təcrübəniz və (.+) bacarıqlarınız bu istiqamətlə əlaqəlidir\.$/, "Your $1 years of experience and $2 skills are related to this direction.", "Ваш опыт $1 лет и навыки $2 связаны с этим направлением."],
  [/^Aylıq limit \(dollar, 0 = yoxdur\)$/, "Monthly limit (dollars, 0 = none)", "Месячный лимит (доллары, 0 = нет)"],
];
export function translatePattern(text: string, language: "en" | "ru", part: (phrase: string) => string = (x) => x): string | undefined {
  const t = text.trim();
  for (const [re, en, ru] of RULES) {
    const m = t.match(re);
    if (!m) continue;
    const template = language === "ru" ? ru : en;
    return text.replace(t, template.replace(/\$(\d)/g, (_, i) => { const g = m[Number(i)] ?? ""; return /^[\d.,%]+$/.test(g) ? g : part(g); }));
  }
  return undefined;
}
