#!/usr/bin/env python3
"""Final promo video from REAL screen recordings of the platform (Playwright videos in CLIPS dir: gate, jobs, company, payroll, calc, pricing .webm
+ .json with the 'trim' seconds to skip at the start). Needs ffmpeg + Pillow. Output: OUT (default /tmp/promo2/jobmatch_promo_az_silent.mp4) + SRT."""
import subprocess, os, json, textwrap
from PIL import Image, ImageDraw, ImageFilter, ImageChops
CLIPS=os.environ.get('CLIPS','/tmp/promo2/clips/'); B=os.environ.get('WORK','/tmp/promo2/build/'); os.makedirs(B,exist_ok=True)
OUT=os.environ.get('OUT','/tmp/promo2/jobmatch_promo_az_silent.mp4'); SRT=os.environ.get('SRT','/tmp/promo2/jobmatch_promo_az.srt')
HERO=os.environ.get('HERO','/tmp/promo/shots/01_gate.png')
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
W,H,FPS=1920,1080,30
CW,CH,CX,CY=1280,720,320,228
T=0.6
# (clip, start, end (after trim), speed, scene length, headline, voice-over, badge (text,from,to))
S=[
 ('gate',0,6.0,1.0,7.0,'Hər şey ayrı alətdə?\nBu, itirilən vaxtdır.','CV-lər poçtda, işçi məlumatları Excel-də, əmək haqqı başqa yerdə. Vaxt hər gün bu dağınıqlığa gedir.',None),
 ('gate',14.8,22.7,1.0,8.0,'Bir platforma:\niş axtarışından əmək haqqına.','JobMatch bunu dəyişir: iş axtaran, işəgötürən və kadr şöbəsi eyni platformada.',('Qəbul · Kadr · Əmək haqqı',2.0,7.5)),
 ('jobs',0,7.0,1.0,8.0,'Doğru namizəd\nsaniyələr içində.','Süni intellekt hər CV-ni vakansiya ilə müqayisə edir və aydın uyğunluq balı verir: bacarıq, təcrübə, maaş.',('Uyğunluq balı: 84%',3.0,7.5)),
 ('jobs',7.0,15.8,1.1,8.0,'Müraciət də\nbir klik.','Namizəd bir kliklə müraciət edir. Siz isə vaxtınızı yalnız ən uyğun namizədlərə ayırırsınız.',('1 kliklə müraciət',2.0,7.5)),
 ('company',0,9.4,1.3,8.0,'Bütün mərhələlər\nbir ekranda.','Müraciətdən müsahibəyə, testdən təklifə: canlı panel hər namizədin harada olduğunu göstərir.',('Canlı icmal',1.0,7.0)),
 ('people',0,9.0,1.1,8.0,'Kadr işi\nnizamlı və izlənən.','İşçi kartı, kadr əmrləri, məzuniyyət, davamiyyət, ştat planı: hamısı hazır şablonlarla, hər dəyişiklik tarixçədə.',('İşçi kartı · əmrlər · ştat',1.5,7.5)),
 ('payroll',0,7.0,0.875,8.0,'Əmək haqqı\navtomatik hesablanır.','Vergi və sığorta 2026 dərəcələri ilə avtomatik hesablanır. Bank reyestri və haqq-hesab vərəqələri hazırdır.',('Gross → net, avtomatik',1.5,7.5)),
 ('calc',0,11.9,1.5,8.0,'13 kalkulyator.\nTamamilə pulsuz.','Qeydiyyatsız belə 13 kalkulyator pulsuzdur: maaş, məzuniyyət, ixtisar, super-gross. Hər nəticədə qanun maddəsi var.',('Hər nəticədə maddə nömrəsi',3.5,7.8)),
 ('pricing',0,8.8,1.1,8.0,'Pulsuz başlayın.\nİhtiyac artdıqca böyüyün.','Başlamaq pulsuzdur. AI paketləri 49 manatdan; Kadr modulu AI ilə birlikdə 120, tək 150 manat. ƏDV əlavə olunur.',('ƏDV əlavə olunur',2.5,7.8)),
 ('outro',0,0,1.0,7.0,'İndi qeydiyyatdan keçin.\nİlk addım pulsuzdur.','Növbəti addımı gecikdirməyin: pulsuz hesab açın və doğru insanı, doğru imkanı tapın.',None),
]
def run(cmd):
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode: print(r.stderr[-2000:]); raise SystemExit(1)
def bg():
    im=Image.new('RGB',(W,H)); px=im.load()
    for y in range(H):
        for x in range(W):
            k=0.5*y/H+0.5*x/W
            px[x,y]=(int(20+38*k),int(8+12*k),int(7+9*k))
    glow=Image.new('RGB',(W,H)); ImageDraw.Draw(glow).ellipse((1100,-300,2300,700),fill=(120,45,18)); glow=glow.filter(ImageFilter.GaussianBlur(220))
    base=ImageChops.add(im,glow).convert('RGBA')
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((CX+8,CY+22,CX+CW+8,CY+CH+22),22,fill=(0,0,0,190)); sh=sh.filter(ImageFilter.GaussianBlur(26))
    base=Image.alpha_composite(base,sh)
    ImageDraw.Draw(base).rounded_rectangle((CX-4,CY-4,CX+CW+4,CY+CH+4),22,outline=(255,138,76,255),width=4)
    base.convert('RGB').save(B+'bg.png')
bg()
total=0
for i,(clip,a,b,sp,L,head,vo,badge) in enumerate(S):
    open(f'{B}h{i}.txt','w').write(head); open(f'{B}s{i}.txt','w').write('\n'.join(textwrap.wrap(vo,78)))
    common=(f"drawtext=fontfile={FONT}:textfile={B}h{i}.txt:fontcolor=white:fontsize=62:line_spacing=10:x=90:y='46+(1-min(1,t/0.5))*34':shadowcolor=black@0.7:shadowx=3:shadowy=3:alpha='min(1,t/0.45)',"
            f"drawbox=x=90:y=184:w=150:h=7:color=0xff8a4c@1:t=fill,"
            f"drawtext=fontfile={FONT}:text='jobmatch':fontcolor=0xff9a5c:fontsize=34:x=w-text_w-70:y=54")
    badgef=''
    if badge:
        txt,t0,t1=badge; open(f'{B}b{i}.txt','w').write(txt)
        badgef=(f",drawtext=fontfile={FONT}:textfile={B}b{i}.txt:fontcolor=white:fontsize=34:box=1:boxcolor=0xe5501f@0.96:boxborderw=18:"
                f"x=w-text_w-370:y='252+(1-min(1,(t-{t0})/0.35))*-24':enable='between(t,{t0},{t1})':alpha='min(1,(t-{t0})/0.3)'")
    sub=(f",drawbox=x=0:y=ih-112:w=iw:h=112:color=black@0.55:t=fill,"
         f"drawtext=fontfile={FONT}:textfile={B}s{i}.txt:fontcolor=white:fontsize=31:line_spacing=8:x=(w-text_w)/2:y=h-96:shadowcolor=black@0.8:shadowx=2:shadowy=2:alpha='min(1,max(0,(t-0.3)/0.4))'")
    if clip!='outro':
        trim=json.load(open(f'{CLIPS}{clip}.json'))['trim']
        fc=(f"[1:v]trim=start={trim+a:.3f}:end={trim+b:.3f},setpts=(PTS-STARTPTS)/{sp},scale={CW}:{CH},fps={FPS},tpad=stop_mode=clone:stop_duration=3[c];"
            f"[0:v][c]overlay={CX}:{CY}:eof_action=pass,{common}{badgef}{sub}[v]")
        run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate',str(FPS),'-i',B+'bg.png','-i',f'{CLIPS}{clip}.webm','-filter_complex',fc,'-map','[v]','-t',str(L),'-r',str(FPS),'-pix_fmt','yuv420p','-c:v','libx264','-preset','medium','-crf','18',f'{B}scene{i}.mp4'])
    else:
        open(f'{B}o1.txt','w').write('İndi pulsuz başlayın'); open(f'{B}o2.txt','w').write('AI: 49 AZN-dən · Kadr: AI ilə 120, tək 150 AZN (+ƏDV)\nJobMatch by Digilabs · +994 55 478 25 81')
        fc=(f"[0:v]scale={W}:{H},boxblur=22:2,eq=brightness=-0.28[bgv];"
            f"[bgv]drawtext=fontfile={FONT}:text='jobmatch ✳':fontcolor=0xff9a5c:fontsize=64:x=(w-text_w)/2:y=190:alpha='min(1,t/0.5)',"
            f"drawtext=fontfile={FONT}:textfile={B}o1.txt:fontcolor=white:fontsize=118:x=(w-text_w)/2:y='400+(1-min(1,t/0.6))*40':shadowcolor=black@0.8:shadowx=4:shadowy=4:alpha='min(1,t/0.5)',"
            f"drawtext=fontfile={FONT}:textfile={B}o2.txt:fontcolor=0xffd2b0:fontsize=44:line_spacing=14:x=(w-text_w)/2:y=600:alpha='min(1,max(0,(t-0.5)/0.5))',"
            f"drawbox=x=(iw-520)/2:y=760:w=520:h=84:color=0xe5501f@1:t=fill,"
            f"drawtext=fontfile={FONT}:text='Pulsuz qeydiyyat →':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=781:alpha='min(1,max(0,(t-0.9)/0.4))'{sub}[v]")
        run(['ffmpeg','-y','-loglevel','error','-loop','1','-framerate',str(FPS),'-i',HERO,'-filter_complex',fc,'-map','[v]','-t',str(L),'-r',str(FPS),'-pix_fmt','yuv420p','-c:v','libx264','-preset','medium','-crf','18',f'{B}scene{i}.mp4'])
    print('scene',i,'ok'); total+=L
total-=T*(len(S)-1)
inputs=[]
for i in range(len(S)): inputs+=['-i',f'{B}scene{i}.mp4']
trans=['circleopen','slideleft','fade','wipeleft','smoothleft','zoomin','slideright','wiperight','smoothright','fadeblack']
fc=[];off=0;prev='[0:v]'
for i in range(1,len(S)):
    off+=S[i-1][4]-T; out=f'[v{i}]'
    fc.append(f"{prev}[{i}:v]xfade=transition={trans[i-1]}:duration={T}:offset={off:.2f}{out}"); prev=out
fc.append(f"{prev}[{len(S)+1}:v]overlay=x='-1920+1920*t/{total:.2f}':y=1072:eof_action=repeat[vf]")
run(['ffmpeg','-y','-loglevel','error']+inputs+['-f','lavfi','-t',f'{total:.2f}','-i','anullsrc=r=48000:cl=stereo','-f','lavfi','-t',f'{total:.2f}','-i',f'color=c=0xff8a4c:s=1920x8:r={FPS}','-filter_complex',';'.join(fc),'-map','[vf]','-map',f'{len(S)}:a','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-shortest',OUT])
def ts(t):
    h=int(t//3600);m=int(t%3600//60);s=t%60
    return f"{h:02}:{m:02}:{int(s):02},{int((s-int(s))*1000):03}"
srt=[];start=0
for i,s in enumerate(S):
    end=start+s[4]-(T if i<len(S)-1 else 0)
    srt.append(f"{i+1}\n{ts(start)} --> {ts(end)}\n{s[6]}\n"); start+=s[4]-T
open(SRT,'w').write('\n'.join(srt)); print('total',round(total,1))
