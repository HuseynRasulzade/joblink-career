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
Sənədin etibarlılıq müddəti bitib.|The document has expired.|Срок действия документа истёк.`;
const EN: Record<string, string> = {};
const RU: Record<string, string> = {};
for (const line of LINES.split("\n")) {
  const [az, en, ru] = line.split("|");
  if (az && en) EN[az] = en;
  if (az && ru) RU[az] = ru;
}
export const EN_PAGES = EN;
export const RU_PAGES = RU;
