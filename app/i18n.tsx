"use client";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { localizedSkillLabel } from "@/lib/skill-catalog";
import { RU_UI } from "@/lib/i18n-ru";
import { EN_EXTRA, RU_EXTRA } from "@/lib/i18n-extra";
import { EN_MORE, RU_MORE } from "@/lib/i18n-more";

export type SiteLanguage = "az" | "en" | "ru";
let activeLanguage: SiteLanguage = "az";
export function setSiteLanguage(language: SiteLanguage) {
  activeLanguage = language;
}
export function siteLanguage() {
  return activeLanguage;
}

const pairs = `KARYERA VƏ İŞƏ QƏBUL PLATFORMASI|CAREER AND RECRUITMENT PLATFORM
Doğru insanı doğru imkanla birləşdiririk.|Connecting the right people with the right opportunities.
İş axtaran kimi CV-nizi inkişaf etdirin və uyğun vakansiyaları tapın. Şirkət kimi vakansiyalar yaradın və uyğun namizədləri idarə edin.|Build a stronger CV and find relevant jobs as a candidate. Create vacancies and manage suitable applicants as a company.
Hər hesab yalnız qeydiyyatda seçilən panelə giriş əldə edir.|Each account can access only the role selected during registration.
Salam,|Hello,
Tamamla ↗|Complete ↗
AZN / ay|AZN / month
Ümumi baxış|Overview
Hesab|Account
Hesab növü|Account type
İş axtaran|Job seeker
CV yaradın və vakansiyalara müraciət edin|Create your CV and apply for jobs
Şirkət|Company
Şirkətin adı|Company name
Vakansiya yaradın və namizədləri idarə edin|Create vacancies and manage candidates
İstifadəçi|User
Şirkət hesabı|Company account
AI reytinqi hesabla|Calculate AI ranking
AI reytinqi aktivdir · ilk 30 vakansiya|AI ranking active · first 30 jobs
AI rəyi:|AI assessment:
CV mətnimi vakansiyalara uyğunluq üçün|I consent to sharing my CV text with
ilə paylaşmağa razıyam.|to assess job fit.
CV-yə əsaslanan AI karyera yolları|AI career paths based on your CV
AI təcrübə müddətinizi və CV-dəki faktiki bacarıqları nəzərə alır. Yeni peşəyə keçid üçün çatışmayan bilikləri ayrıca göstərir.|AI considers your experience and documented CV skills. It identifies gaps for a move into a new profession.
CV üzrə tövsiyə yarat|Generate CV-based advice
CV mətnimin karyera tövsiyəsi üçün|I consent to sharing my CV text with
ilə paylaşılmasına razıyam.|for career advice.
Növbəti addım:|Next step:
Məcburi bacarıqlar (vergüllə ayırın)|Required skills (comma-separated)
Məsələn: Excel, 1C|For example: Excel, 1C
CV yükləyin|Upload CV
CV yükləyin və AI analizi ilə nəticəni görün.|Upload a CV and run AI analysis to see your result.
Bal yalnız CV yüklənib AI analizi aparıldıqdan sonra göstərilir.|A score appears only after a CV is uploaded and analyzed with AI.
İŞƏ QƏBUL|HIRING
İŞ MƏKANIM|MY WORKSPACE
İŞƏ QƏBUL MƏKANI|HIRING WORKSPACE
KARYERANIZ ÜÇÜN AI|AI FOR YOUR CAREER
ƏN YÜKSƏK UYĞUNLUQ|TOP MATCH
Yeni hesab yarat|Create account
Profilinizi tamamlayın, doğru fürsətlər sizi tapsın.|Complete your profile so the right opportunities can find you.
Tələblərinizi yazın, uyğun namizədləri kəşf edin.|Describe your requirements and find matching candidates.
Potensialınızı kəşf edin|Discover your potential
Növbəti komanda üzvünüz|Your next team member
60%+ uyğunluq|60%+ match
Baxışda|In view
baxışda|in view
Nümunə|Demo
Nümunə məlumatlar|Demo data
Əlaqə|Contact
Nailiyyət|Achievement
Ən azı|At least
il təcrübə|years experience
il təcrübə ·|years experience ·
bacarıq ·|skills ·
il minimum təcrübə|years minimum experience
ilə paylaşmağa razıyam.|for detailed analysis.
CV-nin peşəkar məzmununu ətraflı analiz üçün|I consent to sharing the professional content of my CV with
Generativ AI bağlantısı aktiv deyil. Hazırda CV məzmunundan hesablanan ilkin analiz göstərilir.|Generative AI is unavailable. An initial profile check is shown.
CV üzrə struktur və uyğunluq analizi yeniləndi.|CV structure and match check refreshed.
CV analizi tamamlandı.|CV analysis complete.
Dərin CV analizi üçün profilinizə CV yükləyin və yadda saxlayın.|Upload and save a CV in your profile for detailed analysis.
AI analizi üçün razılıq xanasını işarələyin.|Select the consent box to run AI analysis.
Profiliniz yadda saxlanıldı. Uyğunluq nəticələri yeniləndi.|Profile saved. Match results updated.
Vakansiya yadda saxlanıldı.|Job saved.
Vakansiya yadda saxlanmışlardan çıxarıldı.|Job removed from saved items.
Hesabınızdan çıxdınız.|You signed out.
Server cavabı oxunmadı. Yenidən cəhd edin.|Could not read the server response. Try again.
Sorğu tamamlanmadı.|Request failed.
Əlaqə nömrənizi əlavə edin ki, işəgötürən sizinlə əlaqə saxlaya bilsin.|Add a phone number so employers can contact you.
Nailiyyətlərinizi rəqəmlərlə göstərin: iş həcmini, vaxta qənaəti və ya nəticəni qeyd edin. Yalnız faktiki nəticələrdən istifadə edin.|Use real numbers to describe work volume, time saved or results.
Ən azı 5 real peşə bacarığı əlavə edin və onları iş təcrübəsində nümunələrlə əsaslandırın.|Add at least five genuine professional skills and support them with work examples.
İş təcrübəsi və ya layihələrinizi tarixlərlə əlavə edin.|Add dated work experience or projects.
Peşəkar xülasəyə ixtisasınızı, təcrübənizi və hədəflədiyiniz rolu əlavə edin.|Add your profession, experience and target role to your summary.
Təhsil məlumatlarını tamamlayın.|Complete your education details.
Nailiyyətlərinizi konkret nümunələrlə CV-də göstərin və müsahibəyə hazırlaşın.|Show specific achievements in your CV and prepare for interviews.
Növbəti addım: seçdiyiniz vakansiyanın tələblərinə uyğun faktiki nümunələri vurğulayın.|Next: highlight real examples that match your target job.
Tamlıq 35%, nailiyyətlər 30%, bacarıqlar 20%, mətnin strukturu 15%. AI nəticəsində hər sahə CV-dəki dəlilə əsaslanır. Bu işə qəbul ehtimalı deyil.|Completeness 35%, achievements 30%, skills 20%, structure 15%. AI findings cite CV evidence. This is not a hiring probability.
Bal peşəkar CV məzmununun dörd bölməsi üzrə hesablanır; işə qəbul ehtimalı deyil.|This score covers four CV quality areas; it is not a hiring probability.
Təcrübə kömək edir; yeni istiqamətdə uyğun bilik və praktika da lazımdır.|Experience helps, but a new direction also requires relevant skills and practice.
İxtisasınızı, iş təcrübənizi və bacarıqlarınızı profilə əlavə edin.|Add your profession, experience and skills to your profile.
CV-də 2–3 real nailiyyəti ölçülə bilən nəticələrlə yazın.|Write 2–3 real achievements with measurable results in your CV.
Hədəf peşəniz üzrə əsas bacarıqları müəyyənləşdirin.|Identify the key skills for your target profession.
Seçdiyiniz istiqamətdə praktik layihə hazırlayın, CV və portfolioya əlavə edin.|Complete a practical project in your chosen field and add it to your CV or portfolio.
Aşağıdakı məlumatları yoxlayın. Tətbiq etdikdən sonra bütün sahələri redaktə edə bilərsiniz. Profil avtomatik yadda saxlanmır.|Review the details below. You can edit every field after applying. Your profile is not saved automatically.
Boş və ya qeyri-dəqiq tarixləri profil bölməsində tamamlayın. Mövcud sahələr CV-də tapılan məlumatlarla əvəzlənəcək.|Complete missing or uncertain dates in your profile. Fields found in the CV will replace existing values.
Məlumatlar dolduruldu. Yoxlayın və dəyişiklikləri yadda saxlayın.|Fields filled. Review them and save your changes.
CV cihazınızda oxundu. Mətni yoxlayın və profili yadda saxlayın.|CV read on your device. Review the text and save your profile.
CV mətn və vizual quruluş birlikdə analiz edildi. Məlumatları yoxlayın və profili yadda saxlayın.|The CV text and visual layout were analyzed together. Review the details and save your profile.
CV oxundu. Məlumatları yoxlayın və profili yadda saxlayın.|CV read. Review the details and save your profile.
İlkin doldurma ad, əlaqə və aydın başlıqlı məlumatları cihazınızda tapır. İş təcrübəsi və təhsil üçün AI ilə doldurma istifadə edin; nəticələri yoxlayın.|Basic autofill finds names, contact details and labeled sections on your device. Use AI for experience and education; review the result.
CV mətnini, o cümlədən şəxsi əlaqə məlumatlarını, profil sahələrini çıxarmaq üçün|I consent to sharing CV text, including personal contact details, with
CV mətnini və skan/şəkil səhifələrini, o cümlədən şəxsi əlaqə məlumatlarını, profil|I consent to sharing CV text and scanned/image pages, including personal contact details, with
CV mətnini və skan/şəkil səhifələrini, o cümlədən şəxsi əlaqə məlumatlarını, profil sahələrini avtomatik doldurmaq üçün|I consent to sharing CV text and scanned/image pages, including personal contact details, with
ilə paylaşmağa razıyam. Defolt olaraq aktivdir — istəsəniz söndürüb yalnız cihazınızda doldurmağa keçə bilərsiniz.|for automatic profile completion. This is enabled by default; turn it off to use on-device autofill only.
ilə tam doldur|for full autofill
DeepSeek ilə doldur|Fill with DeepSeek
OpenAI ilə doldur|Fill with OpenAI
Fayl yükləyəndə və ya "DeepSeek ilə doldur" düyməsini basanda boş qalan sahələr (ixtisas, xülasə, bacarıqlar və s.) avtomatik doldurulur. Doldurulan sahələr "AI" nişanı ilə göstərilir — tətbiq etməzdən əvvəl yoxlayın.|When you upload a file or select “Fill with DeepSeek”, empty fields such as profession, summary and skills are completed automatically. AI-filled fields are marked with an “AI” badge; review them before applying.
Fayl yükləyəndə və ya "OpenAI ilə doldur" düyməsini basanda boş qalan sahələr (ixtisas, xülasə, bacarıqlar və s.) avtomatik doldurulur. Doldurulan sahələr "AI" nişanı ilə göstərilir — tətbiq etməzdən əvvəl yoxlayın.|When you upload a file or select “Fill with OpenAI”, empty fields such as profession, summary and skills are completed automatically. AI-filled fields are marked with an “AI” badge; review them before applying.
Ad, əlaqə və aydın başlıqlı məlumatlar cihazınızda tapılır. Qalanını əl ilə doldurun və ya yuxarıdakı razılıq xanasını aktivləşdirib AI-dan istifadə edin.|Names, contact details and clearly labeled information are found on your device. Complete the rest manually or enable the consent option above to use AI.
Vəzifələri sadalamaqla yanaşı, hansı nəticəni əldə etdiyinizi göstərin. Rəqəmlər, layihələr və real nümunələr profilinizi gücləndirir.|Show what you achieved, not only your job titles. Numbers, projects and real examples strengthen your profile.
Peşəkar profilim HR axtarışında görünsün. Əlaqə məlumatlarım yalnız müraciət etdiyim işəgötürənlə paylaşılır.|Show my professional profile in employer search. Contact details are shared only with employers I apply to.
Passkey şifrələrinizlə birlikdə cihazınızın təhlükəsiz hesabında saxlanır. Giriş üçün eyni passkey və ya onu sinxronlaşdıran hesabınız lazımdır.|Your passkey is stored in your device's secure account. You will need the same passkey or a synced account to sign in.
Cihazınızdakı passkey ilə giriş edin. Təsdiq üçün Touch ID, Face ID, PIN və ya təhlükəsizlik açarından istifadə edə bilərsiniz.|Sign in with your device passkey. Confirm with Touch ID, Face ID, a PIN or a security key.
Bu brauzer passkey dəstəkləmir. Saytı Safari, Chrome və ya Edge-də açın.|This browser does not support passkeys. Open the site in Safari, Chrome or Edge.
Passkey seçimi tamamlanmadı. Yenidən cəhd edin.|Passkey selection was not completed. Try again.
Təsdiq gözlənilir...|Waiting for confirmation...
Nümunə müraciət saxlanıldı. Real şirkətə göndərilmədi.|Demo application saved. It was not sent to a real company.
Müraciətiniz göndərildi.|Your application was submitted.
Uyğunluğun səbəblərinə bax|See why it matches
% uyğun|% match
% və yuxarı|% and above
il və daha az tələb edən|years or less required
“Hesabatlar hazırladım” əvəzinə neçə hesabat və hansı nəticəni əldə etdiyinizi yazın.|Instead of “I prepared reports,” state how many and what results you achieved.
· Nümunə müraciət|· Demo application
Uyğun vakansiyanı seçin, profilinizi yoxlayın və müraciətinizi göndərin.|Choose a matching job, review your profile and apply.
İnsan və imkan arasında doğru bağlantı.|Connecting people with opportunities.
Bildirişi bağla|Dismiss notification
Joblink hesabınıza daxil olun|Sign in to Joblink
Hesabınıza daxil oldunuz.|You signed in.
Profilinizi saxlamaq, müraciət göndərmək və vakansiya yayımlamaq üçün daxil olun.|Sign in to save your profile, apply for jobs and publish vacancies.
ChatGPT ilə daxil ol|Sign in with ChatGPT
Bu şəxsi versiyada giriş ChatGPT hesabı ilə qorunur.|This private version uses your ChatGPT account for sign in.
% profil uyğunluğu|% profile match
Uyğun bacarıqlar:|Matching skills:
Hələ uyğun bacarıq göstərilməyib|No matching skills yet
İnkişaf sahələri:|Skills to develop:
Əsas bacarıqlarınız tələblərlə üst-üstə düşür|Your main skills match the requirements
Təcrübə:|Experience:
il / tələb olunan|years / required
Bacarıqlar 70%, təcrübə 20%, şəhər və iş formatı 10%. İşə qəbul ehtimalı deyil.|Skills 70%, experience 20%, city and work arrangement 10%. Not a hiring probability.
Bu elan nümayiş üçündür. Müraciət real şirkətə göndərilmir.|This job is a demo. Applications are not sent to a real company.
Profilinizi göndərməyə hazırsınız?|Ready to submit your profile?
CV, əlaqə məlumatlarınız və təcrübəniz|Your CV, contact details and experience
nümunə müraciətdə saxlanılacaq|will be saved in a demo application
ilə paylaşılacaq|will be shared with
Əvvəlcə öz profilinizi yaradın və yadda saxlayın.|Create and save your profile first.
CV oxunmadı|Could not read the CV
iş təcrübəsi ·|work entries ·
təhsil qeydi|education entries
Nümunə məlumatlarını öz məlumatlarınızla əvəz edin.|Replace demo details with your own.
Təcrübəniz, güclü tərəfləriniz və növbəti karyera hədəfiniz...|Your experience, strengths and next career goal...
Vəzifələr və ölçülə bilən nailiyyətlər|Roles and measurable achievements
Azərbaycan — ana dili; İngilis — B2|Azerbaijani — native; English — B2
Sertifikatın adı, təşkilat, il və yoxlama linki|Certificate, organization, year and verification link
PDF, DOCX, RTF və ya TXT · Maksimum 20 MB, 40 səhifə|PDF, DOCX, RTF or TXT · Up to 20 MB and 40 pages
PDF, DOCX, RTF, TXT, PNG, JPG və ya WEBP · Maksimum 20 MB, 40 səhifə|PDF, DOCX, RTF, TXT, PNG, JPG or WEBP · Up to 20 MB and 40 pages
Vəzifə *|Role *
Şirkət *|Company *
Şirkətinizin adı|Your company name
Hazırkı mətn peşə üzrə şablondan hazırlanıb.|The current text uses a profession template.
Vakansiya yayımlandı. Namizədlər artıq müraciət edə bilər.|Vacancy published. Candidates can now apply.
Vəzifəni təsvir edin, elanı birlikdə hazırlayaq.|Describe the role and draft the vacancy together.
Peşə bacarıqlarına əsaslanan, aydın işə qəbul prosesi.|A clear hiring process based on professional skills.
Nümunə HR məlumatları ilə tanış olursunuz.|You are viewing demo employer data.
Şirkətinizin vakansiyaları və real müraciətlər.|Your company's jobs and real applications.
HR köməkçisi ilə elanı hazırlayın və təsdiqdən sonra yayımlayın.|Draft a job with the HR assistant and publish it after review.
Müraciətlərə bax|View applications
Bir cümlədən yeni fürsətə.|From one sentence to a new opportunity.
Hansı vəzifə üçün namizəd axtarırsınız?|Which role are you hiring for?
Mühasibatlıq üzrə vakansiya məlumatlarını ver|Give me accounting vacancy details
Mühasibatlıq üzrə vakansiya hazırla|Draft an accounting vacancy
HR mütəxəssisi üzrə vakansiya hazırla|Draft an HR specialist vacancy
HR mütəxəssisi axtarıram|I am hiring an HR specialist
HR köməkçisinə mesaj|Message the HR assistant
Məsələn: 2–3 il təcrübəli mühasib axtarıram...|Example: I need an accountant with 2–3 years of experience...
Mesajı|Message
ilə təkmilləşdir|Improve with
Hazırda peşə şablonları aktivdir. Generativ AI bağlantısı qurulduqda sərbəst sorğular dəstəklənəcək.|Profession templates are available. AI can improve supported drafts.
Bütün şərtləri yoxlayın və şirkət məlumatlarını tamamlayın.|Review the terms and complete company details.
Layihəniz burada görünəcək|Your draft will appear here
Köməkçiyə vəzifəni yazın. Heç bir elan sizin təsdiqiniz olmadan yayımlanmır.|Describe the role to the assistant. No job is published without your confirmation.
Uyğunluq tələb olunan bacarıq və təcrübə əsasında hesablanır.|Matching is based on required skills and experience.
il və yuxarı|years and above
Ad, ixtisas və ya bacarıq axtar|Search name, profession or skill
Profilə bax ↗|View profile ↗
Uyğunluq həddini azaldın və ya başqa vakansiya seçin.|Lower the match threshold or choose another job.
Status yeniləndi.|Status updated.
Namizədlər vakansiyanıza müraciət etdikdə burada görünəcəklər.|Applicants will appear here after applying to your vacancy.
Yalnız iş təkliflərinə açıq profillər göstərilir. Uyğunluq qərar verməyə kömək edir; yekun seçim işəgötürənə aiddir.|Only profiles open to offers appear. Matching supports your review; the employer makes the final decision.
İş təcrübəsi ·|Work experience ·
şirkəti üçün “|for company “
” vakansiyası,|” vacancy,
AZN maaş,|AZN salary,
. Təsdiqdən sonra saytdakı namizədlər elanı görə və müraciət edə biləcəklər.|. After confirmation, candidates can view and apply to the job.
Vakansiyalar|Jobs
CV analizi|CV analysis
AI tövsiyələri|AI recommendations
Mənim profilim|My profile
Müraciətlərim|My applications
Vakansiyalarım|My vacancies
Namizədlər|Candidates
HR AI köməkçi|HR AI assistant
Yeni imkanları kəşf edin|Discover new opportunities
CV-niz daha güclü ola bilər.|Your CV can be stronger.
Növbəti addımınız, sizə uyğun.|Your next step, tailored to you.
Peşəkar profilim|My professional profile
Müraciətləriniz bir yerdə|Your applications in one place
Bacarıqlarınıza, təcrübənizə və gözləntilərinizə uyğun işlər.|Jobs matched to your skills, experience and goals.
CV-nizdə nəyin yaxşı işlədiyini və nəyin dəyişməli olduğunu görün.|See what works in your CV and what to improve.
Təcrübənizdən yeni karyera imkanlarına gedən yol.|Turn your experience into new career opportunities.
Təcrübənizi, bacarıqlarınızı və karyera hekayənizi birləşdirin.|Bring your experience, skills and career story together.
Hər müraciətin statusunu və növbəti addımını izləyin.|Track the status and next step of every application.
Daxil ol|Sign in
Çıxış|Sign out
Hesabınız|Your account
İşəgötürən|Employer
İş məkanım|My workspace
İşəgötürən paneli|Employer dashboard
Namizəd paneli|Candidate dashboard
Komandanızı böyüdün|Grow your team
Karyeranızın növbəti addımı|Your next career move
Əsas naviqasiya|Main navigation
Profilə keç|Go to profile
Namizəd panelinə keç|Switch to candidate view
HR panelinə keç|Switch to employer view
Nümunə hesab|Demo account
Yenidən cəhd et|Try again
SİZİN ÜÇÜN SEÇİLİB|PICKED FOR YOU
KARYERANIZIN NÖVBƏTİ ADDIMI|YOUR NEXT CAREER MOVE
xoş gəlmisiniz|welcome
Karyeranızda yeni bir səhifə açmağa hazırsınız?|Ready for the next chapter in your career?
Vakansiyaları kəşf et|Explore jobs
CV-ni yenilə|Update CV
Nümunə profil|Demo profile
Öz CV-nizlə başlayın|Start with your own CV
Uyğun vakansiyalar|Matching jobs
Profil tamamlanması|Profile completion
Təcrübəniz dəyərlidir.|Your experience matters.
Doğru yerdə parlasın.|Make it count in the right place.
Bacarıqlarınıza uyğun imkanları kəşf edin və|Discover opportunities matched to your skills and
növbəti addımınızı əminliklə atın.|take your next step with confidence.
Tövsiyələrimə bax|See my recommendations
Profiliniz əsasında|Based on your profile
Sizə uyğun vakansiyalar|Jobs for you
Profiliniz və bacarıqlarınız əsasında seçilib|Selected based on your profile and skills
Hamısına bax|See all
Növbəti addımınız|Your next step
Nailiyyətlərinizi rəqəmlərlə göstərin|Show measurable achievements
CV-mi təkmilləşdir|Improve my CV
Vəzifə, şirkət və ya bacarıq axtar...|Search roles, companies or skills...
Axtarışı təmizlə|Clear search
Filtrləri sıfırla|Reset filters
Minimum AI uyğunluğu|Minimum match score
AI uyğunluğu|AI match
İş formatı|Work arrangement
Ofisdə|On site
Uzaqdan|Remote
Hibrid|Hybrid
Maaş aralığı|Salary range
Bütün filtrlər|All filters
Sıralama|Sort by
Ən uyğun əvvəlcə|Best match first
Maaş: çoxdan aza|Salary: high to low
Ən yeni əvvəlcə|Newest first
Şəhər|City
Bütün şəhərlər|All cities
Sahə|Category
Bütün sahələr|All categories
Təcrübə tələbi|Experience required
Hamısı|All
Məşğulluq|Employment
Tam ştat|Full time
Yarımştat|Part time
Müqavilə|Contract
Yadda saxlananlar|Saved jobs
Bu filtrlərə uyğun vakansiya yoxdur|No jobs match these filters
Axtarış sözünü və ya filtrləri dəyişərək yenidən sınayın.|Change your search or filters and try again.
CV-niz nə qədər güclüdür?|How strong is your CV?
CV ANALİZ|CV ANALYSIS
Güclü profil|Strong profile
Yaxşı başlanğıc|Good start
İnkişaf fürsəti|Room to improve
Analiz gözləyir|Analysis pending
İlkin profil yoxlaması|Initial profile check
AI analizi · CV mətninə əsaslanır|AI assessment · based on CV text
CV-ni analiz edin və dəlillərə əsaslanan nəticəni görün.|Analyze your CV to see evidence based results.
Tam nəticə üçün analiz səhifəsində AI razılığını verin.|Give AI consent on the analysis page for full results.
Yalnız profil forması əsasında ilkin qiymətləndirmədir.|Preliminary score based only on profile fields.
Kiçik dəyişikliklər, böyük fərqlər.|Small changes make a big difference.
Struktur və tamlıq|Structure and completeness
Təcrübə və nailiyyətlər|Experience and achievements
Bacarıqların dolğunluğu|Skills coverage
Tam analizə bax|View full analysis
Qiymət necə hesablanır?|How is the score calculated?
CV-nizin inkişaf xəritəsi|Your CV improvement roadmap
TÖVSİYƏ|RECOMMENDATIONS
Profil forması əsasında analiz|Analysis based on profile fields
Əlaqə məlumatları|Contact information
Nəticə və təsir|Results and impact
Peşə bacarıqları|Professional skills
Təhsil|Education
Profilimdə düzəlt|Edit in my profile
CV qeydi|CV finding
Əsas CV bölmələri tamamdır|Key CV sections complete
CV yüklənib. Dəlillərə əsaslanan bal üçün razılıq verib “Analizi yenilə” düyməsini seçin.|CV uploaded. Give consent and select “Analyze CV” for an evidence based score.
Analizi yenilə|Refresh analysis
CV-ni analiz et|Analyze CV
Analiz edilir…|Analyzing…
Son analiz:|Last analyzed:
AI analizi|AI analysis
Təcrübənizdən başlayaq.|Start with your experience.
İxtisas əlavə edilməyib|No profession added
PROFİLİNİZƏ ƏSASƏN|BASED ON YOUR PROFILE
İNKİŞAF İSTİQAMƏTİ|GROWTH OPPORTUNITY
MÖVCUD GÜCLÜ TƏRƏF|EXISTING STRENGTH
Sizə üstünlük verən bacarıqlar|Skills that set you apart
Növbəti real addım|Your next practical step
Uyğun işlər|Matching jobs
Tövsiyə üçün daha çox məlumat lazımdır|More profile details needed
Bacarıqlarınızı növbəti səviyyəyə aparın|Build on your skills
Bu həftə|This week
Növbəti 30 gün|Next 30 days
Növbəti 90 gün|Next 90 days
CV üzrə ətraflı analiz|Detailed CV analysis
İlk müraciətinizə bir addım qalıb|Your first application is one step away
Şəxsi məlumatlar|Personal details
Ad və soyad|Full name
Ad və soyad *|Full name *
İxtisas|Profession
Peşə / ixtisas *|Profession or title *
E-poçt|Email
E-poçt *|Email *
Telefon|Phone
Haqqımda|About me
Dillər|Languages
Tapılmadı|Not found
Bacarıqlar:|Skills:
CV-dən profilə köçür|Fill profile from CV
Profilə tətbiq et|Apply to profile
KARYERA PROFİLİ|CAREER PROFILE
Hekayənizi bacarıqlarınız danışsın.|Let your skills tell your story.
İxtisasınızı əlavə edin|Add your profession
CV önizləmə|CV preview
Boş profillə başla|Start with a blank profile
CV bölmələri|CV sections
Təcrübə və təhsil|Experience and education
Məşğulluq növü|Employment type
Göstərilməyib|Not specified
Tam ştat|Full-time
Yarımştat|Part-time
Özünüməşğul|Self-employed
Sərbəst|Freelance
Müqavilə|Contract
Təcrübəçi|Internship
Şagirdlik|Apprenticeship
Mövsümi|Seasonal
Müvəqqəti|Temporary
Könüllü|Volunteer
Bacarıqlar|Skills
Tam CV məlumatları|Full CV data
CV faylı|CV file
Gözlənilən minimum maaş (AZN)|Expected minimum salary (AZN)
İş təkliflərinə açığam|Open to job offers
AI mənim əvəzimdən avtomatik müraciət etsin|Let AI apply on my behalf
Profiliniz saxlanılan hər dəfə və hər yeni vakansiya yayımlandıqda AI uyğunluq balını hesablayır və aşağıdaki həddi keçən vakansiyalara sizin əvəzinizə avtomatik müraciət göndərir. Gündəlik ən çoxu 10 avtomatik müraciət göndərilir; hər müraciəti “Müraciətlərim” bölməsində görəcəksiniz. İstənilən vaxt söndürə bilərsiniz.|Whenever your profile is saved or a new vacancy is published, AI calculates the match score and applies on your behalf when it meets the threshold. Up to 10 automatic applications are sent per day; you can review each one under “My applications” and disable this at any time.
Tam strukturlaşdırılmış CV|Fully structured CV
JSON-u endir|Download JSON
CV-ni AI ilə analiz etdikdən sonra kurslar, layihələr, referanslar, detallı iş təcrübəsi və digər bütün bölmələr burada görünəcək.|After AI analyzes your CV, courses, projects, references, detailed experience and every other section will appear here.
Dil:|Language:
Format:|Format:
Bəli|Yes
Xeyr|No
Naməlum|Unknown
Manual yoxlanmalı məlumatlar|Details requiring manual review
Dəqiq mətn sübutu göstərilməyib.|No exact text evidence was provided.
Qabaqcıl redaktə — tam JSON|Advanced editing — full JSON
Burada bütün strukturlaşdırılmış sahələri düzəldə bilərsiniz. Düzgün JSON formatını qoruyun.|You can edit every structured field here. Keep valid JSON formatting.
JSON formatı düzgün deyil. Vergül və mötərizələri yoxlayın.|The JSON format is invalid. Check commas and brackets.
Struktur dəyişikliklərini tətbiq et|Apply structured changes
Təcrübə|Experience
Vəzifə|Role
Şirkət|Company
Başlama tarixi|Start date
Bitmə tarixi|End date
Hazırda burada işləyirəm|I currently work here
Təcrübə əlavə et|Add experience
Təhsil müəssisəsi|School or university
İxtisas və dərəcə|Qualification and degree
Məzuniyyət ili|Graduation year
Təhsil əlavə et|Add education
Bacarıqlar və nailiyyətlər|Skills and achievements
Bacarıqlar (vergüllə ayırın)|Skills (separate with commas)
Dillər və səviyyə|Languages and proficiency
Sertifikatlar və kurslar|Certificates and courses
CV yüklə|Upload CV
CV faylınızı əlavə edin|Add your CV file
Fayl seç|Choose file
CV mətni — oxunan mətni yoxlayın və ya bura yapışdırın|CV text — review extracted text or paste it here
Mətndən ilkin doldur|Basic autofill from text
Məlumatlar çıxarılır...|Extracting details...
Yadda saxlanmamış dəyişikliklər|Unsaved changes
Profil məlumatları|Profile details
Saxlanılır...|Saving...
Dəyişiklikləri saxla|Save changes
Profilinizin gücü|Profile strength
tamamlanıb|complete
Yaxşı CV konkret danışır|A strong CV is specific
Hazırda|Current
Dillər və sertifikatlar|Languages and certificates
Çap et / PDF kimi saxla|Print or save as PDF
Minimum maaş (AZN)|Minimum salary (AZN)
Maksimum maaş (AZN)|Maximum salary (AZN)
Minimum təcrübə (il)|Minimum experience (years)
Məşğulluq növü|Employment type
Tələb olunan bacarıqlar|Required skills
Namizədə tələblər|Candidate requirements
Uyğun namizədlər|Matching candidates
Müraciətlər|Applications
Göndərildi|Submitted
Yayımlanıb|Published
Müraciət edənlər|Applicants
İlk vakansiyanızı yaradın|Create your first vacancy
HR köməkçiniz|Your HR assistant
Doğru insan, doğru komanda.|The right person for the right team.
Vakansiya layihəsi|Vacancy draft
İş ünvanı|Work address
Tam ünvan və ya ərazi|Full address or area
Google Maps-dən seç|Select from Google Maps
Ünvanı Google Maps-də aç|Open address in Google Maps
İş ünvanını Google Maps-dən seçin|Select the work address from Google Maps
Tam ünvanı və ya obyektin adını yazın, xəritədə yoxlayın və sonra seçimi təsdiqləyin.|Enter the full address or place name, verify it on the map, then confirm your selection.
Ünvan axtarışı|Address search
Məsələn: Bakı, Xətai rayonu, Babək prospekti 10|For example: Baku, Khatai district, Babek Avenue 10
Google Maps ünvan önizləməsi|Google Maps address preview
Ünvan yazın|Enter an address
Google Maps-də yoxla|Check in Google Maps
Bu ünvanı seç|Select this address
TƏSDİQ GÖZLƏYİR|AWAITING CONFIRMATION
Yoxla və yayımla|Review and publish
Namizəd siyahısı|Candidate list
Namizəd axtar|Search candidates
Minimum uyğunluq|Minimum match
Minimum təcrübə|Minimum experience
Bu filtrlərə uyğun namizəd yoxdur|No candidates match these filters
Müraciət CV-si ↗|Applicant CV ↗
Müraciət statusu|Application status
Müsahibə|Interview
Mesajlar|Messages
Dəstək|Support
Sorğular və mesajlar|Requests and messages
Namizədlərlə yazışmalarınız|Your conversations with candidates
İşəgötürənlərlə yazışmalarınız|Your conversations with employers
Şikayət, təklif və sorğularınız|Your complaints, suggestions and requests
Şirkət və işçilərin şikayət, təklif və sorğuları|Complaints, suggestions and requests from companies and candidates
Yazışmalar|Conversations
Ümumi yazışma|General conversation
Namizədlər bölməsindən “Mesaj yaz” ilə yazışma başladın.|Start a conversation with “Message” in the Candidates section.
Şirkətlər sizə yazanda və ya müraciətinizdən “Şirkətə yaz” seçəndə yazışmalar burada görünəcək.|Conversations appear here when a company writes to you or you choose “Message company” on an application.
İlk mesajınızı yazın.|Write your first message.
Mesaj|Message
Mesajınızı yazın…|Type your message…
Soldan yazışma seçin. Bütün mesajlar yadda saxlanılır.|Choose a conversation on the left. All messages are saved.
Mesaj yaz|Message
Şirkətə yaz|Message company
Yeni sorğu|New request
Bütün mövzular|All topics
Mövzu|Topic
Sorğular|Requests
Hələ sorğu yoxdur.|No requests yet.
Şikayət, təklif və ya sual göndərin|Send a complaint, suggestion or question
Başlıq|Subject
Sorğu admin panelinə və admin e-poçtuna göndərilir. Cavab və status dəyişikliyi burada görünəcək.|The request goes to the admin panel and admin e-mail. Replies and status changes appear here.
Göndər|Send
Sorğunuz göndərildi. Statusunu bu bölmədə izləyə bilərsiniz.|Your request was sent. Track its status in this section.
Joblink dəstək|Joblink support
Cavab|Reply
Cavabınızı yazın…|Type your reply…
Əlavə məlumat yazın…|Add more information…
Yeni status|New status
Statusu dəyişmə|Keep status
Şirkət və işçilərin bütün sorğuları burada toplanır.|All requests from companies and candidates are collected here.
Şikayət, təklif və suallarınızı göndərin, statusunu izləyin: göndərildi, oxundu, icradadır, tamamlandı.|Send complaints, suggestions and questions and track their status: sent, read, in progress, done.
Oxundu|Read
İcradadır|In progress
Tamamlandı|Done
Rədd edildi|Rejected
Vəzifə adının əlavə edilməsi|Add a job title
Bacarıq kataloqu|Skills catalog
Sertifikat kataloqu|Certifications catalog
Şikayət|Complaint
Təklif|Suggestion
Texniki problem|Technical issue
Ödəniş və hesab-faktura|Payments and invoices
Verifikasiya|Verification
Vakansiya və ya müraciət|Vacancy or application
AI köməkçi|AI assistant
Suallarınız, yadda qalan söhbətlər.|Your questions, saved conversations.
Profiliniz və vakansiyalar barədə AI ilə danışın; hər söhbət yadda qalır.|Talk to AI about your profile and vacancies; every conversation is saved.
AI ilə soruş|Ask AI
Yeni söhbət|New conversation
Yeni vakansiya söhbəti|New vacancy conversation
Söhbətlər|Conversations
Adını dəyiş|Rename
Söhbətin yeni adı|New conversation name
Sil|Delete
Bu söhbət silinsin?|Delete this conversation?
Hələ söhbət yoxdur.|No conversations yet.
Bu vakansiya haqqında soruşun|Ask about this vacancy
Karyera köməkçiniz|Your career assistant
Cavablar profiliniz və bu vakansiyanın tələbləri əsasında verilir.|Answers are based on your profile and this vacancy's requirements.
Profiliniz əsasında karyera, CV və müraciət suallarınıza cavab verir. Söhbətlər yadda saxlanılır.|Answers career, CV and application questions based on your profile. Conversations are saved.
Bu vakansiyaya nə qədər uyğunam?|How well do I fit this vacancy?
Müraciət üçün CV-mdə nəyi gücləndirim?|What should I strengthen in my CV for this application?
Müsahibədə hansı suallar gözlənilir?|Which interview questions should I expect?
Təcrübəmə görə hansı vəzifələrə müraciət edim?|Which roles should I apply for with my experience?
CV-mi necə gücləndirə bilərəm?|How can I strengthen my CV?
Növbəti 3 ayda nəyi öyrənməliyəm?|What should I learn in the next 3 months?
AI köməkçiyə mesaj|Message to the AI assistant
Sualınızı yazın…|Type your question…
AI bağlantısı hazırda aktiv deyil.|AI is not available right now.
Mesajı göndər|Send message
Bu söhbətin vakansiyası artıq yayımlanıb.|This conversation's vacancy is already published.
Yüksək|High
Orta|Medium
Aşağı|Low
Orfoqrafiya|Spelling
Qrammatika|Grammar
Uyğunsuzluq|Inconsistency
Çatışmayan məlumat|Missing information
Məzmun|Content
Profilinizi necə doldurmaq istəyirsiniz?|How would you like to fill your profile?
Hazır CV-dən doldur|Fill from an existing CV
PDF, DOCX və ya şəkil yükləyin, sahələri AI avtomatik doldursun. Sonra yoxlayıb düzəldə bilərsiniz.|Upload a PDF, DOCX or image and let AI fill the fields. You can review and edit them afterwards.
Əl ilə doldur|Fill in manually
CV-niz yoxdursa, məlumatları özünüz yazın. Peşəkar xülasəni AI sizin yazdıqlarınız əsasında hazırlayacaq.|No CV? Enter your details yourself. AI will write your professional summary from what you enter.
AI ilə yaz|Write with AI
AI ilə yenidən yaz|Rewrite with AI
Yazılır…|Writing…
Bütün tapılan səhvlər və çatışmazlıqlar|All errors and gaps found
Problem:|Problem:
Səbəb:|Cause:
Həmin yerə get və düzəlt|Go to the exact place and fix
CV-ni təkliflərə əsasən yenidən hazırla|Rebuild the CV from the suggestions
Yeni variantı hazırla|Prepare a new version
Hazırlanır…|Preparing…
Başqa variant|Another version
Seçilənləri tətbiq et və yadda saxla|Apply selected and save
PDF kimi yüklə|Download as PDF
Peşəkar xülasə|Professional summary
İş təcrübəsi|Work experience
Kurslar və təlimlər|Courses and training
Bu CV Joblink platformasında hazırlanıb|This CV was created on Joblink
AI ilə sırala|Rank with AI
AI qiymətləndirir…|AI is evaluating…
Müsahibəyə dəvət et|Invite to interview
Nəzərə al|Consider
Tələb olunan imtahanlar|Required exams
İstəyə bağlı: namizəd bu imtahanları veribsə tələb ödənmiş sayılır|Optional: the requirement is met if the candidate passed these exams
imtahanlar|exams
Vəzifələr kataloqu|Job titles catalog
Vəzifə sorğuları|Job title requests
Kataloqdakı vəzifələr|Titles in catalog
Gözləyən sorğular|Pending requests
Peşə qrupları|Profession groups
Yeni vəzifə|New job title
Peşə qrupu *|Profession group *
Alternativ yazılışlar|Alternative spellings
Vəzifə axtar…|Search job titles…
Bütün peşə qrupları|All profession groups
Rədd et|Reject
Əlavə et|Add
Vəzifəni yazın və siyahıdan seçin|Type a job title and pick from the list
Kataloqda|In catalog
Bu vəzifə siyahıda yoxdur.|This title is not in the list.
AI ilə yoxla|Check with AI
Yoxlanılır…|Checking…
Bunu nəzərdə tuturdunuz:|Did you mean:
Seç|Select
Oxşar vəzifələr:|Similar titles:
Heç biri deyil — müraciət et|None of these — send a request
AI da uyğun vəzifə tapmadı.|AI found no matching title either.
Əlavə edilməsi üçün müraciət et|Request to add it
Sorğunuz adminə göndərildi. Statusunu “Sorğularım” bölməsində izləyə bilərsiniz.|Your request was sent to the admin. Track its status under “My requests”.
İmtahanlar|Exams
Toxunun: verilib → hazırlaşır → yoxdur|Tap: passed → preparing → none
Daha çox göstər|Show more
Alınıb|Earned
Davam edir|In progress
Kataloqda uyğun sertifikat tapılmadı.|No matching certification in the catalog.
Beynəlxalq sertifikatlar və lisenziyalar|International certifications and licences
Məsələn: ACCA, CIPS, PMP, IELTS, NEBOSH|For example: ACCA, CIPS, PMP, IELTS, NEBOSH
CV-nizdə tapılan sertifikatlar|Certifications found in your CV
Hamısını əlavə et|Add all
sil|remove
Bal|Score
Səviyyə|Level
İl|Year
Yoxlama linki|Verification link
Sertifikatlar uyğunluq balına təsir edir: alınmış sertifikat əlaqəli bacarıqları təsdiqləyir, davam edən isə qismən sayılır.|Certifications affect the match score: an earned certification proves related skills, one in progress counts partly.
Sertifikat tələbləri|Certification requirements
Tələb olunan və ya üstünlük verilən sertifikat axtarın|Search for a required or preferred certification
Tələb növü|Requirement type
Məcburi|Required
Üstünlükdür|Preferred
Minimum bal|Minimum score
Minimum səviyyə|Minimum level
Məcburi sertifikatı olmayan namizədin balı 70-dən yuxarı olmur; üstünlük verilən sertifikat əlavə bal verir.|Candidates without a required certification score at most 70; a preferred certification adds bonus points.
Var|Held
Səviyyə aşağıdır|Level too low
Ekvivalent sertifikat|Equivalent certification
Yoxdur|Missing
Digər kurslar və təlimlər|Other courses and training
Kataloqda olmayan kurs və təlimlər: adı, təşkilat, il|Courses not in the catalog: name, provider, year
Sertifikatla təsdiqlənən:|Proven by certification:
Sertifikat|Certification
Bütün namizədlər|All candidates
Sertifikatlar|Certifications
yoxlama linki ↗|verification link ↗
Sertifikatlar kataloqu|Certifications catalog
Kataloqdakı sertifikatlar|Certifications in catalog
Profillərdə qeyd olunub|Listed in profiles
Aktiv vakansiya tələbləri|Active vacancy requirements
Beynəlxalq sertifikatlar kataloqu|International certifications catalog
Namizəd profillərində, vakansiya tələblərində və uyğunluq balında istifadə olunan ortaq siyahı|Shared list used in candidate profiles, vacancy requirements and match scores
Yeni sertifikat|New certification
Kataloqda olmayan yerli və ya sahəyə xas sertifikatı əlavə edin|Add a local or field-specific certification missing from the catalog
Sertifikatın adı *|Certification name *
Verən təşkilat *|Issuing organization *
Bölmə *|Section *
Bölmə seçin|Choose a section
Səviyyələr (aşağıdan yuxarı)|Levels (lowest to highest)
Sübut etdiyi bacarıqlar|Skills it proves
Yalnız bacarıq kataloqunda olan adlar qəbul edilir.|Only names from the skills catalog are accepted.
Sinonimlər və qısaltmalar|Synonyms and abbreviations
CV-də bu yazılışlar avtomatik tanınacaq.|These spellings will be recognized in CVs automatically.
Bölmələr|Sections
Sertifikatlar peşə sahələri üzrə qruplaşdırılıb|Certifications are grouped by professional field
Bütün bölmələr|All sections
Sertifikat, təşkilat və ya qısaltma axtar…|Search certification, issuer or abbreviation…
Təşkilat|Issuer
Səviyyələr|Levels
Profillər|Profiles
Mənbə|Source
Uyğun sertifikat tapılmadı.|No matching certification found.
Yeni sertifikat kataloqa əlavə edildi.|New certification added to the catalog.
Bacarıq dəlili|Skill evidence
Vəzifə uyğunluğu|Role fit
Uyğun təcrübə|Relevant experience
Şəhər və iş formatı|City and work format
Təcrübədə təsdiqlənən:|Proven in experience:
Yalnız siyahıda və ya CV mətnində:|Only listed or mentioned:
Uyğun təcrübə:|Relevant experience:
Bacarıq dəlili 50%, vəzifə uyğunluğu 20%, uyğun təcrübə 20%, şəhər və iş formatı 10%. Bacarıq iş təcrübəsində göstərilibsə tam, yalnız siyahıda və ya mətndə keçirsə qismən sayılır. İşə qəbul ehtimalı deyil.|Skill evidence 50%, role fit 20%, relevant experience 20%, city and work format 10%. A skill shown in work experience counts fully; one only listed or mentioned counts partly. Not a hiring probability.
Sistem yalnız əvvəlki vəzifələrinizə uyğun, bacarıqlarınızın çoxu iş təcrübənizdə və ya bacarıq siyahınızda təsdiqlənən, təcrübə tələbini qarşılayan və aşağıdakı həddi keçən vakansiyalara sizin əvəzinizə müraciət göndərir. Gündəlik ən çoxu 10 avtomatik müraciət göndərilir; hər birini “Müraciətlərim” bölməsində görəcək və geri götürə biləcəksiniz.|Applications are sent on your behalf only to vacancies related to your past roles, where most skills are evidenced in your experience or skills list, the experience requirement is met and the score is above the threshold below. At most 10 automatic applications are sent per day; you will see each one under “My applications” and can withdraw it.
Təklif edildi|Offer made
İşə qəbul edildi|Hired
Geri götürülüb|Withdrawn
Hesab təhlükəsizliyi|Account security
Şifrəni dəyiş|Change password
Hazırkı şifrə|Current password
Yeni şifrə|New password
Yeni şifrəni təkrar yazın|Repeat new password
Şifrəni yenilə|Update password
Hesabı sil|Delete account
Təsdiq üçün SİL yazın|Type SİL to confirm
Hesabı birdəfəlik sil|Delete account permanently
Bağlanıb|Closed
Müddəti bitib|Expired
Yenidən aç|Reopen
Müraciəti geri götür|Withdraw application
Vakansiya dayandırıldı.|Vacancy paused.
Vakansiya yenidən yayımlandı.|Vacancy republished.
Vakansiya bağlandı.|Vacancy closed.
Müraciət geri götürüldü.|Application withdrawn.
Uyğun deyil|Not suitable
Hələ müraciət yoxdur|No applications yet
Vakansiyanı yayımlayaq?|Publish this vacancy?
Redaktəyə qayıt|Back to editing
Yayımlanır...|Publishing...
Təsdiq et və yayımla|Confirm and publish
Hesabınıza təhlükəsiz daxil olun|Sign in securely
Hesabınıza daxil olun|Sign in to your account
E-poçt və şifrənizlə istənilən müasir brauzerdən daxil ola bilərsiniz.|Sign in from any modern browser using your email and password.
E-poçt|Email
Şifrə|Password
Şifrəni təkrar yazın|Repeat password
Şifrələr uyğun gəlmir.|Passwords do not match.
Şifrə ən azı 10 simvol olmalıdır.|Your password must contain at least 10 characters.
Hesab yarat|Create account
Daxil ol|Sign in
Gözləyin…|Please wait…
Sessiya bu cihazda 7 gün qorunur. Şifrəniz açıq mətn kimi saxlanmır.|Your session remains active on this device for 7 days. Your password is not stored as plain text.
Joblink hesabınızı yaradın|Create your Joblink account
Passkey ilə daxil ol|Sign in with passkey
Passkey yarat və qeydiyyatdan keç|Create account with passkey
Hesabım var — daxil ol|Already have an account? Sign in
Yeni hesab yarat|Create new account
Giriş tamamlanmadı.|Sign in failed.
Giriş alınmadı.|Could not sign in.
Bağla|Close
Müraciət et|Apply
Müraciət edilib|Applied
Ətraflı ↗|Details ↗
Ətraflı|Details
Tələblər|Requirements
Vəzifə öhdəlikləri|Responsibilities
İşin təsviri|Job description
Namizəddən tələb olunanlar|Candidate requirements
İş şəraiti|Working conditions
İş qrafiki:|Work schedule:
Ünvan|Address
Tələb olunan bacarıqlar|Required skills
Yerləşdirilib:|Posted:
Son tarix:|Deadline:
Maaş|Salary
Ərazi|Location
Məşğulluq|Employment
İş formatı|Work arrangement
Təcrübə|Experience
Razılaşma yolu ilə|Negotiable
Göstərilməyib|Not specified
Digər|Other
Yadda saxlanıb|Saved
Təsdiq et və göndər|Confirm and submit
Göndərilir...|Submitting...
Nümunə vakansiya|Demo vacancy
Ümumi nəticə|Overall result
DƏLİLLƏRƏ ƏSASLANAN HESABAT|EVIDENCE-BASED REPORT
Dərin AI analizi|In-depth AI analysis
Tamlıq|Completeness
Nailiyyətlər|Achievements
Bacarıqlar|Skills
Siyahıda uyğun bacarıq tapılmadı.|No matching skill was found in the catalogue.
Yalnız siyahıda olan bacarıqları seçə bilərsiniz.|You can select only skills from the catalogue.
Siyahıda yoxdursa, AI ilə yoxladıb yeni bacarıq kimi əlavə edə bilərsiniz.|If it is not listed, ask AI to verify and add it as a new skill.
Yeni bacarıq kimi yoxla və əlavə et|Check and add as a new skill
Əvvəlcə yazılış və məna üzrə mövcud kataloq yoxlanacaq|The existing catalogue will be checked by spelling and meaning first
AI bacarığı kataloqla müqayisə edir…|AI is comparing the skill with the catalogue…
AI yoxlayır…|AI is checking…
Bacarıq seçildi.|Skill selected.
Bacarıq axtarın və seçin|Search and select a skill
Oxunaqlılıq|Readability
CV-nin güclü tərəfləri|CV strengths
DƏLİL|EVIDENCE
Prioritet inkişaf sahələri|Priority improvements
Təsir:|Impact:
Düzəliş:|Fix:
ATS yoxlaması|ATS check
Real rol uyğunluğu|Realistic role fit
Boşluq:|Gap:
Cümlə səviyyəsində düzəlişlər|Sentence-level rewrites
İNDİ|CURRENT
TƏKLİF|SUGGESTED
Fəaliyyət planı|Action plan
Platforma icmalı|Platform overview
İstifadəçilər|Users
Vakansiya moderasiyası|Job moderation
Müraciət axını|Application flow
Sistem və audit|System and audit
Admin panel|Admin panel
Platforma nəzarəti|Platform control
İDARƏETMƏ|ADMINISTRATION
Təhlükəsiz idarəetmə|Secure administration
Dəyişikliklər audit jurnalında qeydə alınır.|Changes are recorded in the audit log.
Sistemə bax|View system
Administrator|Administrator
Admin panel hazırlanır|Preparing admin panel
Platforma məlumatları yüklənir…|Loading platform data…
Platformanın təhlükəsizliyi, məzmun keyfiyyəti və əməliyyat göstəriciləri bir yerdə.|Platform security, content quality and operational metrics in one place.
Ümumi istifadəçi|Total users
namizəd|candidates
Şirkət hesabı|Company accounts
Təsdiqlənmiş giriş|Verified access
Aktiv vakansiya|Active jobs
dayandırılıb|paused
son 30 gündə|in the last 30 days
Platforma fəaliyyəti|Platform activity
Əsas əməliyyat göstəriciləri|Core operational metrics
Aktiv profillər|Active profiles
Yayımlanmış vakansiyalar|Published jobs
Son 30 gün müraciətləri|Applications in the last 30 days
Diqqət tələb edir|Needs attention
Operativ yoxlama siyahısı|Operational checklist
Dayandırılmış vakansiyalar|Paused jobs
Dayandırılmış hesablar|Suspended accounts
AI xidməti|AI service
Aktiv|Active
Yoxlayın|Check
Son inzibati fəaliyyət|Recent administrative activity
Bütün dəyişikliklər audit jurnalına yazılır|Every change is recorded in the audit log
Hələ inzibati dəyişiklik edilməyib.|No administrative changes yet.
İstifadəçi idarəetməsi|User management
hesab göstərilir|accounts shown
Ad, e-poçt, şirkət və ya vakansiya axtar…|Search name, email, company or job…
Bütün statuslar|All statuses
Namizəd|Candidate
Şirkət|Company
Dayandırılıb|Suspended
İstifadəçi|User
Hesab növü|Account type
Fəaliyyət|Activity
Qeydiyyat|Registered
Status|Status
Profil məlumatı yoxdur|No profile information
vakansiya|jobs
müraciət|applications
Dayandır|Suspend
Aktivləşdir|Activate
Vakansiya moderasiyası|Job moderation
vakansiya göstərilir|jobs shown
Yayımlanıb|Published
Arxivlənib|Archived
Müraciət|Applications
Yayımla|Publish
Arxivlə|Archive
Müraciət monitorinqi|Application monitoring
platforma müraciəti|platform applications
Vakansiya|Job
Növ|Type
AI avtomatik|AI automated
Əl ilə|Manual
Sistem vəziyyəti|System status
Production konfiqurasiyası|Production configuration
Mühit|Environment
AI provayderi|AI provider
AI bağlantısı|AI connection
Aktiv deyil|Inactive
Giriş sistemi|Authentication
CV saxlanması|CV storage
Audit jurnalı|Audit log
Son 100 administrator əməliyyatı|Last 100 administrator actions
Audit jurnalı boşdur.|The audit log is empty.
Administrator əməliyyatı tamamlandı.|Administrative action completed.
Ödənişlər və borclar|Payments and balances
Ümumi hesablanıb|Total billed
hesab-faktura|invoices
Daxil olan ödəniş|Payments received
Qeydə alınmış ödənişlər|Recorded payments
Qalıq borc|Outstanding balance
gecikmiş hesab|overdue invoices
Maliyyə reyestri|Billing ledger
Kimin ödədiyini, qismən ödənişləri və qalıq borcları izləyin|Track who paid, partial payments and outstanding balances
CSV endir|Download CSV
Ödəniş yaz|Record payment
Hesab yarat|Create invoice
Yeni hesab-faktura|New invoice
İstifadəçi və ya şirkət üçün ödənilməli məbləğ yaradın|Create an amount due for a user or company
Hesab seçin|Select account
Təyinat|Description
Məsələn: Premium şirkət paketi — oktyabr|For example: Premium company plan — October
Məbləğ (AZN)|Amount (AZN)
Son ödəniş tarixi|Due date
Ləğv et|Cancel
Hesab-fakturanı yarat|Create invoice
Ödənişi qeydə al|Record payment
Qismən və ya tam ödənişi uyğun hesab-fakturaya bağlayın|Link a partial or full payment to the relevant invoice
Hesab-faktura|Invoice
Ödənilməmiş hesab seçin|Select an outstanding invoice
qalıq|outstanding
Ödənilən məbləğ (AZN)|Amount paid (AZN)
Ödəniş tarixi|Payment date
Ödəniş üsulu|Payment method
Bank köçürməsi|Bank transfer
Kart|Card
Nağd|Cash
Digər|Other
Tranzaksiya / qəbz №|Transaction / receipt no.
İstinad nömrəsi|Reference number
Qeyd|Note
Əlavə qeyd (istəyə bağlı)|Additional note (optional)
Ödənişi təsdiqlə|Confirm payment
Ödənilib|Paid
Qismən ödənilib|Partially paid
Gecikib|Overdue
Ödənilməyib|Unpaid
Ləğv edilib|Cancelled
Müştəri / hesab|Customer / account
Hesablanıb|Billed
Son tarix|Due date
Bu filtrə uyğun hesab-faktura yoxdur.|No invoices match this filter.
Ödəniş tarixçəsi|Payment history
ödəniş qeydə alınıb|payments recorded
Ödəyən|Payer
Üsul|Method
İstinad|Reference
Hesab-faktura yaradıldı.|Invoice created.
Ödəniş qeydə alındı.|Payment recorded.
Bacarıqlar kataloqu|Skills catalog
Ümumi bacarıq|Total skills
Admin tərəfindən əlavə|Added by admin
Kateqoriya|Category
Bölmə|Section
Ortaq bacarıqlar kataloqu|Shared skills catalog
CV profili və vakansiyalar eyni nəzarətli siyahıdan istifadə edir|CV profiles and vacancies use the same controlled list
Hər bölməni açın, daxilindəki bacarıqlara baxın və Excel formatında endirin|Open any section, review its skills and download them in Excel format
Hamısını XLSX|Download all as XLSX
Joblink kateqoriyaları|Joblink categories
CV və vakansiyalarda istifadə olunan əsas kateqoriyalar|Core categories used in CVs and vacancies
ESCO bacarıq növləri|ESCO skill types
Peşəkar bacarıqları bilik sahələrindən ayırır|Separates professional skills from knowledge areas
ESCO istifadə səviyyələri|ESCO reuse levels
Bacarığın müxtəlif peşə və sektorlar üzrə tətbiq sahəsi|How broadly a skill applies across occupations and sectors
ESCO BÖLMƏSİ|ESCO SECTION
JOBLINK BÖLMƏSİ|JOBLINK SECTION
Bu bölməni XLSX|Download this section as XLSX
Bu bölmədə bacarıq axtar…|Search skills in this section…
Yüklənir…|Loading…
Bu bölmədə uyğun bacarıq tapılmadı.|No matching skills were found in this section.
Əvvəlki|Previous
Növbəti|Next
Yeni bacarıq|New skill
Yeni kataloq bacarığı|New catalog skill
Dublikatların qarşısını almaq üçün Azərbaycan və İngilis adlarını dəqiq yazın|Enter accurate Azerbaijani and English names to prevent duplicates
Azərbaycan dilində ad|Azerbaijani name
İngilis dilində ad|English name
Məsələn: Maliyyə modelləşdirilməsi|For example: Financial modeling
Azərbaycan dilində kateqoriya|Azerbaijani category
İngilis dilində kateqoriya|English category
Sinonimlər və alternativ yazılışlar|Synonyms and alternate spellings
Vergül ilə ayırın: financial modelling, maliyyə modeli|Separate with commas: financial modelling, maliyyə modeli
Axtarış zamanı bu yazılışların hamısı eyni bacarığa yönləndiriləcək.|All these spellings will resolve to the same skill in search.
Kataloqa əlavə et|Add to catalog
Sistem bacarıqları|System skills
İngilis versiyası|English version
Sinonimlər|Synonyms
Sistem|System
Uyğun bacarıq tapılmadı.|No matching skill found.
Yeni bacarıq ümumi kataloqa əlavə edildi.|The new skill was added to the shared catalog.
`;
const english = new Map(
  pairs
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf("|");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
export function translate(
  text: string,
  language: SiteLanguage = activeLanguage,
) {
  if (language === "az") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const translated =
    (language === "ru"
      ? (RU_UI[trimmed] ?? RU_EXTRA[trimmed] ?? RU_MORE[trimmed])
      : undefined) ??
    english.get(trimmed) ??
    EN_EXTRA[trimmed] ??
    EN_MORE[trimmed];
  if (translated) return text.replace(trimmed, translated);
  const skillTranslation = localizedSkillLabel(trimmed, "en");
  if (skillTranslation !== trimmed)
    return text.replace(trimmed, skillTranslation);
  if (language === "ru") {
    const ruMatch =
      trimmed.match(/^(\d+) il təcrübə$/)?.[1] ??
      trimmed.match(/^(\d+) baxışda$/)?.[1] ??
      trimmed.match(/^(\d+) vakansiya$/)?.[1] ??
      trimmed.match(/^(\d+)% uyğun$/)?.[1];
    if (ruMatch !== undefined) {
      const n = Number(ruMatch);
      if (trimmed.endsWith("il təcrübə"))
        return text.replace(
          trimmed,
          `${n} ${n % 10 === 1 && n % 100 !== 11 ? "год" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "года" : "лет"} опыта`,
        );
      if (trimmed.endsWith("baxışda"))
        return text.replace(trimmed, `${n} на рассмотрении`);
      if (trimmed.endsWith("vakansiya"))
        return text.replace(
          trimmed,
          `${n} ${n % 10 === 1 && n % 100 !== 11 ? "вакансия" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "вакансии" : "вакансий"}`,
        );
      return text.replace(trimmed, `${n}% соответствия`);
    }
  }
  if (/^\d+ il təcrübə$/.test(trimmed))
    return text.replace(
      trimmed,
      trimmed.replace("il təcrübə", "years experience"),
    );
  if (/^\d+(?:[.,]\d+)?–\d+(?:[.,]\d+)? il$/.test(trimmed))
    return text.replace(trimmed, trimmed.replace(/ il$/, " years"));
  if (/^\d+ baxışda$/.test(trimmed))
    return text.replace(trimmed, trimmed.replace("baxışda", "in review"));
  if (trimmed.endsWith(" yaddaşdan çıxar"))
    return text.replace(
      trimmed,
      trimmed.replace(/ yaddaşdan çıxar$/, " remove from saved"),
    );
  if (trimmed.endsWith(" yadda saxla"))
    return text.replace(trimmed, trimmed.replace(/ yadda saxla$/, " save job"));
  if (/^\d+ vakansiya$/.test(trimmed))
    return text.replace(trimmed, trimmed.replace("vakansiya", "jobs"));
  if (/^\d+% uyğun$/.test(trimmed))
    return text.replace(trimmed, trimmed.replace("uyğun", "match"));
  return text;
}
export function localizeTree(
  node: ReactNode,
  language: SiteLanguage = activeLanguage,
): ReactNode {
  if (typeof node === "string") return translate(node, language);
  if (Array.isArray(node))
    // toArray gives static children stable keys, so cloning them into a new
    // children array does not trigger React's missing-key warning.
    return Children.toArray(node).map((child) => localizeTree(child, language));
  if (!isValidElement(node)) return node;
  const original = node.props as Record<string, unknown>;
  const changes: Record<string, unknown> = {};
  for (const key of [
    "label",
    "title",
    "placeholder",
    "aria-label",
    "alt",
    "description",
  ]) {
    if (typeof original[key] === "string")
      changes[key] = translate(original[key] as string, language);
  }
  if ("children" in original)
    changes.children = localizeTree(original.children as ReactNode, language);
  if (
    node.type === "option" &&
    !("value" in original) &&
    typeof original.children === "string"
  )
    changes.value = original.children;
  return cloneElement(node, changes);
}
