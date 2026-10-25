from pathlib import Path
import json,subprocess,re,posixpath as pp,collections
root=Path('/workspace/codex');dest=Path('/tmp/codex-pages-audit/deep');old=Path('/tmp/codex-pages-audit')
rows={}
for l in subprocess.check_output(['git','ls-tree','-rl','HEAD'],cwd=root,text=True).splitlines():
 m,p=l.split('\t',1);a=m.split();rows[p]={'bytes':int(a[-1]),'gitBlob':a[2]}
inc={x['path'] for x in json.loads((dest/'publish-files.json').read_text())};oldinc={x['path'] for x in json.loads((old/'publish-files.json').read_text())}
known=collections.defaultdict(list)
def use(p,why,src=None):
 if p in rows:known[p].append({'reason':why,**({'source':src} if src else {})})
# Explicit linked routes/resources, including documentation downloads.
for e in json.loads((old/'dependency-edges.json').read_text())['site']:use(e['to'],'explicit site/document reference',e['from'])
for p in rows:
 if p.endswith('.html'):use(p,'existing HTML entrypoint')
 if p.endswith(('.js','.css')):use(p,'frontend/shared module retained conservatively')
 if p.endswith('.md'):use(p,'existing documentation URL retained')
for e in json.loads((old/'dependency-edges.json').read_text())['query']:use(e['from'],'static AI require dependency');use(e['to'],'static AI require dependency',e['from'])
for f in dest.glob('*-candidate-reads.json'):
 for s in json.loads(f.read_text()):
  for prefix in [str(dest/'site')+'/',str(root)+'/']:
   if s.startswith(prefix):use(s[len(prefix):],'observed successful AI query file read',f.name)
# Resolve whole literals against repository and local module/document paths.
def resolve(src,ref):
 if re.match(r'^(?:https?:|data:|blob:|node:|#)',ref):return []
 ref=ref.split('#')[0].split('?')[0]
 bases=[pp.dirname(src),pp.dirname(pp.dirname(src)),'integration/natural-world','']
 return sorted({pp.normpath(pp.join(b,ref)) for b in bases if pp.normpath(pp.join(b,ref)) in rows})
for p in rows:
 if p.endswith(('.html','.js')):
  s=(root/p).read_text(errors='replace')
  for ref in re.findall(r'[\"\']([^\"\'\n]{1,300})[\"\']',s):
   if '/' in ref or re.search(r'\.(?:json|gz|bin|png|webp|js|css)$',ref):
    for q in resolve(p,ref):use(q,'resolved frontend literal',p)
# All descriptors in published manifests retained, including continuation states.
manifestEdges=[]
for p in rows:
 if p not in inc or not p.endswith('.json') or not any(x in Path(p).name for x in ['manifest','sources']):continue
 try:d=json.loads((root/p).read_text())
 except:continue
 if '/output/' not in p and p not in known:continue
 use(p,'published manifest/API descriptor retained')
 def walk(o,trail=''):
  if isinstance(o,dict):
   for k,v in o.items():walk(v,trail+'.'+k)
  elif isinstance(o,list):
   for i,v in enumerate(o):walk(v,trail+'['+str(i)+']')
  elif isinstance(o,str):
   for q in resolve(p,o):
    use(q,'published manifest descriptor '+trail,p);manifestEdges.append({'manifest':p,'field':trail,'to':q})
 walk(d)
# Dynamic screenshot and archive multipart resources with inspected loaders.
for p in rows:
 if p.startswith('integration/natural-world/seasonal-loading/validation/') and p.endswith('.webp'):use(p,'REVIEW.html dynamic sample/width/zoom image and download')
 if p.startswith('assets/'):use(p,'existing packed legacy HTML/game loader assets retained')
# Five manually traced large intermediate artifacts: only prepare/build consumers,
# unlisted by runtime manifests; queries+browser verified without them.
newexclude=oldinc-inc
oldexclude={x['path']:x for x in json.loads((old/'excluded-files.json').read_text())}
# Exact byte duplicate groups do not imply removable URLs.
bysha=collections.defaultdict(list)
for p,r in rows.items():bysha[r['gitBlob']].append(p)
dups=[{'bytesPerFile':rows[v[0]]['bytes'],'extraBytes':rows[v[0]]['bytes']*(len(v)-1),'paths':v} for v in bysha.values() if len(v)>1]
result=[]
for p,r in rows.items():
 evidence=known.get(p,[])
 if p in newexclude:cat=2;why='manually traced prepare/build intermediate; absent from runtime manifest and query reads; isolated candidate verification';evidence=[{'reason':why}]
 elif p in oldexclude:cat=2;evidence=[{'reason':oldexclude[p]['reason']}]
 elif evidence:cat=3
 elif '/validation/' in p or Path(p).suffix in ['.cc','.h'] or p.endswith('.cjs') and not p.endswith('/query.cjs'):
  cat=2;evidence=[{'reason':'development/test/validation artifact; retained in candidate unless explicitly excluded'}]
 else:cat=4;evidence=[{'reason':'not fully resolved; retained, absence of a literal match is not proof of non-use'}]
 result.append({'path':p,**r,'category':cat,'excludedFromCandidate':p not in inc,'evidence':evidence})
summary={str(k):{'files':sum(x['category']==k for x in result),'bytes':sum(x['bytes'] for x in result if x['category']==k),'excludedBytes':sum(x['bytes'] for x in result if x['category']==k and x['excludedFromCandidate'])} for k in [1,2,3,4]}
older=lambda p:'/output/' in p and not any('/'+q+'/' in p for q in ['cryosphere-coupling','reach-erosion-coupling','cover-ecology-coupling','pressure-coupling'])
summary['olderOutputs']={str(k):{'files':sum(x['category']==k and older(x['path']) for x in result),'bytes':sum(x['bytes'] for x in result if x['category']==k and older(x['path']))} for k in [1,2,3,4]}
summary['candidate']={'files':len(inc),'bytes':sum(rows[p]['bytes'] for p in inc),'over1GB':sum(rows[p]['bytes'] for p in inc)-10**9,'over900MB':sum(rows[p]['bytes'] for p in inc)-900000000}
summary['allExactDuplicateExtraBytes']=sum(d['extraBytes'] for d in dups)
summary['outputExactDuplicateExtraBytes']=sum(rows[v[0]]['bytes']*(len(v)-1) for v in bysha.values() if len(v)>1 and all('/output/' in p for p in v))
summary['categoryMeaning']={'1':'confirmed no use; none asserted without external access evidence','2':'reproduction/verification/record; only explicit excluded set tested for omission','3':'runtime, AI, documented download/reference, or conservatively retained frontend dependency','4':'unresolved dynamic/reference usage; retained'}
summary['externalDirectLinks']='Not observable locally; excluded file URLs would stop working on Pages, although Git copies remain. No claim of zero external direct-link users.'
(dest/'classification.json').write_text(json.dumps({'summary':summary,'files':result},ensure_ascii=False,indent=2)+'\n');(dest/'manifest-edges.json').write_text(json.dumps(manifestEdges,ensure_ascii=False,indent=2)+'\n');(dest/'exact-duplicates.json').write_text(json.dumps(sorted(dups,key=lambda d:d['extraBytes'],reverse=True),ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
