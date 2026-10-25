import subprocess,json,re,shlex,os,hashlib,time
from pathlib import Path
root=Path('/workspace/codex');dest=Path('/tmp/codex-pages-audit/deep');out=[]
overrides={'cover-ecology-coupling':['315770','1'],'internal-pond-model':['cell','266518','1'],'reach-erosion-coupling':['48','7']}
for q in sorted(root.glob('integration/natural-world/*/query.cjs')):
 name=q.parent.name;rel=q.relative_to(root);readme=(q.parent/'README.md').read_text();matches=re.findall(r'^node (?:integration/natural-world/[^\s]+/)?query\.cjs([^\n]*)',readme,re.M)
 args=overrides.get(name,shlex.split(matches[0]) if matches else [])
 row={'module':name,'path':str(rel),'args':args};start=time.time();outputs=[]
 for kind,base in [('original',root),('candidate',dest/'site')]:
  logfile=dest/(name+'-'+kind+'-reads.json');env=dict(os.environ,AUDIT_READ_LOG=str(logfile))
  p=subprocess.run(['node','--preserve-symlinks','--preserve-symlinks-main','--require',str(dest/'record-reads.cjs'),str(base/rel),*args],cwd=base,env=env,capture_output=True,timeout=60)
  row[kind]={'exitCode':p.returncode,'outputBytes':len(p.stdout),'sha256':hashlib.sha256(p.stdout).hexdigest(),'stderr':p.stderr.decode()[:600]};outputs.append(p.stdout)
 row['passed']=row['original']['exitCode']==row['candidate']['exitCode']==0 and outputs[0]==outputs[1];row['elapsedSeconds']=round(time.time()-start,2);out.append(row)
 (dest/'query-checks.json').write_text(json.dumps({'status':'running','checks':out},ensure_ascii=False,indent=2));print(name,row['passed'],row['elapsedSeconds'],flush=True)
status='passed' if all(r['passed'] for r in out) else 'failed';(dest/'query-checks.json').write_text(json.dumps({'status':status,'checks':out},ensure_ascii=False,indent=2));print(status,flush=True)
