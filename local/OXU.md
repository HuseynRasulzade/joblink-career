# Joblink: kompüterdə lokal işlətmək

1. **Node.js 20+** qurun: https://nodejs.org (LTS). 
2. Zip-i **tam açın** (Extract All). Sonra:
   - Windows: `local\start.bat` faylına iki dəfə klikləyin
   - Mac/Linux: terminalda `bash local/start.sh`
   - və ya hər yerdə: `node local/run.mjs`
3. Qara pəncərə açılır; **onu bağlamayın**. İlk dəfə asılılıqlar qurulur (bir neçə dəqiqə). Sayt hazır olanda brauzer özü açılır (**http://localhost:3000**).
4. Windows: masaüstünə qısayol üçün bir dəfə `local\desktop-shortcut.bat` işə salın. Bundan sonra masaüstündəki **Joblink** ikonuna iki dəfə klikləmək kifayətdir.

Node.js yoxdursa `start.bat` onu avtomatik qurmağa çalışır (winget ilə). Alınmasa nodejs.org-dan LTS qurun.

Demo hesablar (parol hamısı üçün `Demo-12345-local`):
- İş axtaran: `namized@joblink.test`
- İşəgötürən: `isveren@joblink.test`
- Admin: `admin@joblink.test` (admin paneldə "Uyğunluq balı" səhifəsi)

Qeydlər:
- Məlumatlar yalnız sizin kompüterdə, `.wrangler/` qovluğunda saxlanılır. Silsəniz baza sıfırlanır.
- AI funksiyaları açar tələb edir. Qovluqdakı `.dev.vars` faylına `OPENAI_API_KEY=...` (və ya `DEEPSEEK_API_KEY=...`) yazıb yenidən işə salın. Açarsız sayt işləyir, AI düymələri isə "hazır deyil" deyir.
- Başqa port üçün: `PORT=3100 node local/run.mjs`.
