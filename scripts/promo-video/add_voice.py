#!/usr/bin/env python3
"""Adds a voice-over to the silent promo video.
Usage:  python3 add_voice.py [voice] [in.mp4] [out.mp4]
Needs:  pip install edge-tts   (Microsoft neural voices; Azerbaijani: az-AZ-BanuNeural / az-AZ-BabekNeural) and ffmpeg.
Set FAKE=1 to test the mixing with a placeholder tone instead of speech.
For a more emotional voice, record the lines of voiceover.md with a human narrator or ElevenLabs, name the files scene0.mp3..scene8.mp3
in the work folder and run again with USE_EXISTING=1."""
import asyncio, os, subprocess, sys
VOICE = sys.argv[1] if len(sys.argv) > 1 else "az-AZ-BanuNeural"
SRC = sys.argv[2] if len(sys.argv) > 2 else "jobmatch_promo_az_silent.mp4"
OUT = sys.argv[3] if len(sys.argv) > 3 else "jobmatch_promo_az_voice.mp4"
WORK = "voice_work"; os.makedirs(WORK, exist_ok=True)
T = 0.5  # cross-fade between scenes
# (duration, line) in the order of make_video.py
SCENES = [
 (5.5, "Hələ də CV-ləri əl ilə oxuyursunuz? Maaşı Excel-də hesablayırsınız?"),
 (7.0, "JobMatch işə qəbulu və kadr idarəçiliyini bir platformaya yığır. Vakansiya yaradın, namizədlər uyğunluq balı ilə sıralansın."),
 (6.0, "Bacarıq, təcrübə, maaş gözləntisi: hər namizəd üçün bir bal. Ən güclülər yuxarıda."),
 (6.5, "Süni intellekt CV-ni təhlil edir: güclü və zəif tərəfləri göstərir, düzəliş təklif edir."),
 (6.0, "Müraciətlər, müsahibələr, testlər, təkliflər: bütün axın bir ekranda."),
 (7.0, "Kadr modulu: işçi kartı, əmrlər, məzuniyyət, davamiyyət və əmək haqqı. Vergi və sığorta avtomatik hesablanır."),
 (6.0, "Üstəlik, 13 pulsuz kalkulyator: maaş, məzuniyyət, ixtisar, super-gross. Qeydiyyat belə lazım deyil."),
 (7.0, "Pulsuz başlayın. AI istəyirsinizsə 49 manatdan. AI olmadan bütün platforma 150 manat, ƏDV əlavə olunur."),
 (6.0, "Bu gün pulsuz qeydiyyatdan keçin və ilk vakansiyanı yerləşdirin. JobMatch: doğru insan, doğru imkan."),
]
def run(cmd): subprocess.run(cmd, check=True, capture_output=True)
def duration(path):
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",path],capture_output=True,text=True,check=True).stdout
    return float(out.strip())
async def speak(text, path):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate="+8%").save(path)
start = 0.0; inputs = []; filters = []
for i, (d, line) in enumerate(SCENES):
    mp3 = f"{WORK}/scene{i}.mp3"
    if os.environ.get("FAKE") == "1": run(["ffmpeg","-y","-f","lavfi","-i",f"sine=frequency={220+i*40}:duration={d-0.8}",mp3])
    elif not (os.environ.get("USE_EXISTING") == "1" and os.path.exists(mp3)): asyncio.run(speak(line, mp3))
    # a line longer than its scene is sped up a little (at most 1.25x) so it never runs into the next scene
    ratio = duration(mp3) / (d - 0.4)
    tempo = min(1.25, ratio) if ratio > 1 else 1.0
    delay = int((start + 0.2) * 1000)
    inputs += ["-i", mp3]
    filters.append(f"[{i+1}:a]atempo={tempo:.3f},adelay={delay}|{delay},volume=1.0[a{i}]")
    start += d - T
mix = "".join(f"[a{i}]" for i in range(len(SCENES))) + f"amix=inputs={len(SCENES)}:normalize=0,loudnorm=I=-16:TP=-1.5[aout]"
run(["ffmpeg","-y","-i",SRC]+inputs+["-filter_complex",";".join(filters)+";"+mix,"-map","0:v","-map","[aout]","-c:v","copy","-c:a","aac","-b:a","192k","-shortest",OUT])
print("ok:", OUT)
