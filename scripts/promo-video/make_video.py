import subprocess, os, textwrap
from PIL import Image, ImageDraw, ImageFilter
S=os.environ.get('SHOTS','/tmp/promo/shots/'); B='/tmp/promo/build2/'; os.makedirs(B,exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
W,H,FPS=1920,1080,30
CW,CH,CX,CY=1160,652,380,268
# (image, crop (x,y,w,h), headline, voiceover, duration)
scenes=[
 ('01_gate',(700,40,1100,619),'Yenə Excel? Yenə CV yığını?\nBəsdir.','Yenə Excel? Yenə CV yığını? Yenə "bu işçinin neçə gün məzuniyyəti qalıb" sualı? Bəsdir.',6.0),
 ('02_landing_mid',(420,300,1100,619),'İşə qəbul da, kadr da:\nbir platformada.','JobMatch işə qəbulu da, kadr işini də bir yerə yığır. Vakansiyanı yerləşdirirsiniz, namizədlər uyğunluq balı ilə özü sıralanır.',8.0),
 ('06_cand_overview',(360,470,1100,619),'Kimi çağırmalı?\nBal göstərir.','Kimi müsahibəyə çağırmaq lazımdır? Bal göstərir: bacarıq, təcrübə, maaş gözləntisi. Ən güclülər həmişə yuxarıda.',7.0),
 ('07_cv_analysis',(360,330,1100,619),'CV-ni AI oxusun.\nSiz qərar verin.','CV yığınını siz yox, süni intellekt oxuyur. Güclü və zəif tərəfləri çıxarır, siz isə yalnız qərar verirsiniz.',7.0),
 ('08_co_overview',(340,330,1100,619),'Nə harada qaldı?\nHamısı bir ekranda.','Müraciət, müsahibə, test, təklif: işin harada qaldığını artıq axtarmırsınız. Hamısı bir ekranda.',6.5),
 ('11_payroll',(360,520,720,405),'Maaş hesabı?\n2026 dərəcələri, avtomatik.','Əmək haqqı? Vergi və sığorta 2026 dərəcələri ilə avtomatik hesablanır. İşçi kartı, əmrlər, məzuniyyət, davamiyyət də eyni yerdədir.',8.0),
 ('04_calc',(280,315,1360,765),'Hələ tərəddüd edirsiniz?\n13 kalkulyator pulsuz.','Hələ qərar verməmisiniz? Əvvəl 13 pulsuz kalkulyatoru yoxlayın: maaş, məzuniyyət, ixtisar, super-gross. Qeydiyyat belə istəmir.',7.5),
 ('03_pricing',(400,200,1120,630),'Başlamaq pulsuz.\nAI: 49 AZN-dən · Kadr: 150 AZN','Qiymət? Başlamaq pulsuzdur. AI istəyirsinizsə 49 manatdan. AI-siz bütün platforma 150 manat, ƏDV əlavə olunur.',8.0),
 ('01_gate',(0,480,1000,562),'İndi qeydiyyatdan keçin.\nİlk addım pulsuzdur.','Növbəti CV yığınını açmazdan əvvəl bir dəqiqə ayırın. İndi pulsuz qeydiyyatdan keçin. JobMatch: doğru insan, doğru imkan.',7.5),
]
def bg():
    im=Image.new('RGB',(W,H))
    px=im.load()
    for y in range(H):
        t=y/H
        for x in range(0,W):
            # vertical gradient + warm glow top-right
            gx=(x/W)
            r=int(20+ (58-20)*(0.5*t+0.5*gx)); g=int(8+(20-8)*(0.5*t+0.5*gx)); b=int(7+(16-7)*(0.5*t+0.5*gx))
            px[x,y]=(r,g,b)
    glow=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(glow); d.ellipse((1100,-300,2300,700),fill=(120,45,18)); glow=glow.filter(ImageFilter.GaussianBlur(220))
    from PIL import ImageChops
    return ImageChops.add(im,glow)
BASE=bg()
def card(img,crop):
    x,y,w,h=crop
    c=Image.open(S+img+'.png').convert('RGB').crop((x,y,x+w,y+h)).resize((CW,CH),Image.LANCZOS)
    base=BASE.copy().convert('RGBA')
    # shadow
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((CX+10,CY+24,CX+CW+10,CY+CH+24),28,fill=(0,0,0,170)); sh=sh.filter(ImageFilter.GaussianBlur(28)); base=Image.alpha_composite(base,sh)
    mask=Image.new('L',(CW,CH),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,CW,CH),24,fill=255)
    base.paste(c,(CX,CY),mask)
    ImageDraw.Draw(base).rounded_rectangle((CX,CY,CX+CW,CY+CH),24,outline=(255,138,76,255),width=3)
    return base.convert('RGB')
T=0.5
def run(cmd):
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode: print(r.stderr[-1500:]); raise SystemExit(1)
for i,(img,crop,head,vo,d) in enumerate(scenes):
    card(img,crop).save(f'{B}base{i}.png')
    open(f'{B}h{i}.txt','w').write(head); open(f'{B}s{i}.txt','w').write('\n'.join(textwrap.wrap(vo,70)))
    n=int(d*FPS)
    z=f"1+0.05*on/{n}"
    vf=(f"scale=3840:-1,zoompan=z='{z}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d={n}:s={W}x{H}:fps={FPS},"
        f"drawtext=fontfile={FONT}:textfile={B}h{i}.txt:fontcolor=white:fontsize=70:line_spacing=12:x=90:y=52:shadowcolor=black@0.7:shadowx=3:shadowy=3:alpha='min(1,t/0.45)',"
        f"drawbox=x=90:y=212:w=150:h=8:color=0xff8a4c@1:t=fill,"
        f"drawtext=fontfile={FONT}:textfile={B}s{i}.txt:fontcolor=white:fontsize=36:line_spacing=10:x=(w-text_w)/2:y=h-130:shadowcolor=black@0.8:shadowx=2:shadowy=2:alpha='min(1,max(0,(t-0.3)/0.4))',"
        f"drawtext=fontfile={FONT}:text='jobmatch':fontcolor=0xff9a5c:fontsize=34:x=w-text_w-70:y=56")
    run(['ffmpeg','-y','-loglevel','error','-loop','1','-i',f'{B}base{i}.png','-vf',vf,'-t',str(d),'-r',str(FPS),'-pix_fmt','yuv420p','-c:v','libx264','-preset','medium','-crf','18',f'{B}scene{i}.mp4'])
inputs=[]
for i in range(len(scenes)): inputs+=['-i',f'{B}scene{i}.mp4']
trans=['fade','slideleft','fade','wipeleft','fade','slideleft','fade','circleopen']
fc=[];off=0;prev='[0:v]'
for i in range(1,len(scenes)):
    off+=scenes[i-1][4]-T; out=f'[v{i}]'
    fc.append(f"{prev}[{i}:v]xfade=transition={trans[i-1]}:duration={T}:offset={off:.2f}{out}"); prev=out
total=sum(s[4] for s in scenes)-T*(len(scenes)-1)
run(['ffmpeg','-y','-loglevel','error']+inputs+['-f','lavfi','-t',f'{total:.2f}','-i','anullsrc=r=48000:cl=stereo','-filter_complex',';'.join(fc),'-map',prev,'-map',f'{len(scenes)}:a','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-shortest',os.environ.get('OUT','/tmp/promo/jobmatch_promo_az_silent.mp4')])
def ts(t):
    h=int(t//3600);m=int(t%3600//60);s=t%60
    return f"{h:02}:{m:02}:{int(s):02},{int((s-int(s))*1000):03}"
srt=[];start=0
for i,(img,crop,head,vo,d) in enumerate(scenes):
    end=start+d-(T if i<len(scenes)-1 else 0)
    srt.append(f"{i+1}\n{ts(start)} --> {ts(end)}\n{vo}\n"); start+=d-T
open(os.environ.get('SRT','/tmp/promo/jobmatch_promo_az.srt'),'w').write('\n'.join(srt))
print('total',round(total,1))
