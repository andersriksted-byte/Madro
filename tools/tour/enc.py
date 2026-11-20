import json,subprocess,sys,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
m=json.load(open('vid/meta.json'));os.makedirs('out',exist_ok=True)
names=sys.argv[1:] or list(m)
for n in names:
    c=m[n]
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',c['list'],'-vf',f"scale=480:-2,fps=25",'-c:v','libx264','-crf','30','-preset','slow','-pix_fmt','yuv420p','-movflags','+faststart','-an',f'out/{n}.mp4'],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'out/{n}.mp4','-vf','fps=1.25,scale=160:-2,tile=12x1','-frames:v','1',f'out/{n}_sheet.png'],check=True)
    print(n,os.path.getsize(f'out/{n}.mp4')//1024,'KB')
