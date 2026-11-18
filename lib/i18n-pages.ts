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
Namizəd niyə rədd edilib|Why the candidate was rejected|Почему кандидат отклонён`;
const EN: Record<string, string> = {};
const RU: Record<string, string> = {};
for (const line of LINES.split("\n")) {
  const [az, en, ru] = line.split("|");
  if (az && en) EN[az] = en;
  if (az && ru) RU[az] = ru;
}
export const EN_PAGES = EN;
export const RU_PAGES = RU;
