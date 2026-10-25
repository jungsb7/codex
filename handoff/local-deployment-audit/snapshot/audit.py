import subprocess,json,re,posixpath as pp
from pathlib import Path
root=Path('/workspace/codex'); dest=Path('/tmp/codex-pages-audit')
rows={}
for l in subprocess.check_output(['git','ls-tree','-rl','HEAD'],cwd=root,text=True).splitlines():
 m,p=l.split('\t',1);mode,kind,sha,size=m.split();rows[p]={'bytes':int(size),'gitBlob':sha}
text={p:(root/p).read_text(errors='replace') for p in rows if Path(p).suffix in ['.html','.js','.css','.md','.txt','.cjs','.json']}
# Conservative runtime: retain all outputs, frontend modules, docs, assets, code,
# small input evidence, and runtime-loaded review screenshots. Exclude only
# three large replay-input banks and validation images not referenced by site/docs.
banks=['integration/natural-world/'+p+'/inputs/' for p in ['basin-water-budget','coupled-water-model','pond-network-model']]
excluded={p:'recalculation-only input bank; query.cjs reads precomputed output' for p in rows if any(p.startswith(b) for b in banks)}
for p in rows:
 if '/validation/' in p and Path(p).suffix in ['.png','.webp'] and not p.startswith('integration/natural-world/seasonal-loading/validation/'):
  excluded[p]='validation image without identified site/document reference'
edges=[];missing=[]
# Parse explicit site resources and document hyperlinks, not historical prose source paths.
for p,s in text.items():
 if Path(p).suffix not in ['.html','.md','.css','.js']:continue
 refs=[]
 if p.endswith('.html'):refs+=re.findall(r'(?:src|href)\s*=\s*[\"\']([^\"\']+)[\"\']',s)
 if p.endswith('.md'):refs+=re.findall(r'\]\(([^)]+)\)',s)
 if p.endswith('.css'):refs+=re.findall(r'url\([\"\']?([^\)\"\']+)',s)
 if p.endswith('.js'):refs+=re.findall(r'[\"\']([^\"\'\n]+\.(?:png|webp|jpg|svg))[\"\']',s)
 for ref in refs:
  if re.match(r'^(?:[a-z]+:|#|//)',ref):continue
  r=ref.split('#')[0].split('?')[0].strip('<>')
  if not r:continue
  resolved=pp.normpath(pp.join(pp.dirname(p),r)) if not r.startswith('/') else r.removeprefix('/codex/').lstrip('/')
  if resolved in rows:
   edges.append({'from':p,'reference':ref,'to':resolved});excluded.pop(resolved,None)
  elif '${' not in ref and not any(c in ref for c in '\\{}'):
   missing.append({'from':p,'reference':ref,'resolved':resolved})
# Retain every image mentioned in a JS/HTML/doc literal, even a non-link prose reference.
for p in list(excluded):
 if '/validation/' not in p:continue
 for src,s in text.items():
  if not src.endswith(('.html','.js','.md')):continue
  rel=pp.relpath(p,pp.dirname(src))
  if rel in s or p in s:
   excluded.pop(p);edges.append({'from':src,'to':p,'reason':'literal/prose reference retained conservatively'});break
included=sorted(set(rows)-set(excluded));total=sum(rows[p]['bytes'] for p in included)
# Runtime CommonJS closure. Do not execute simulation or query scripts.
roots=[p for p in rows if p.endswith('/query.cjs')]; seen=set(); stack=roots[:];requires=[]
while stack:
 p=stack.pop()
 if p in seen:continue
 seen.add(p)
 for rel in re.findall(r'require\([\"\'](\.[^\"\']+)[\"\']\)',text.get(p,'')):
  q=pp.normpath(pp.join(pp.dirname(p),rel));q=next((x for x in [q,q+'.js',q+'.cjs',q+'.json'] if x in rows),q)
  requires.append({'from':p,'to':q,'present':q in rows,'included':q in included})
  if q in rows:stack.append(q)
assert all(e['included'] for e in requires)
# Cloudflare constraint comparison only; no host contact.
large=[{'path':p,**rows[p]} for p in included if rows[p]['bytes']>25*1024*1024]
result={'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'scope':'conservative candidate, not proven mathematically minimal or a built Pages artifact','tracked':{'files':len(rows),'bytes':sum(v['bytes'] for v in rows.values())},'candidate':{'files':len(included),'bytes':total,'largest':max((dict(path=p,**rows[p]) for p in included),key=lambda v:v['bytes']),'overDecimal1GB':total-10**9,'remainingBinary1GiB':2**30-total},'excluded':{'files':len(excluded),'bytes':sum(rows[p]['bytes'] for p in excluded)},'retainedAllOutputFiles':True,'retainedAllHtmlFiles':True,'retainedSeasonalReviewImages':sum(p.startswith('integration/natural-world/seasonal-loading/validation/') and p.endswith('.webp') for p in included),'queryEntrypoints':len(roots),'queryRequireClosureFiles':len(seen),'queryRequireEdges':len(requires),'preExistingMissingLiteralReferences':missing,'cloudflareConstraintOnly':{'fileLimit':20000,'perFileLimitBytes':25*1024*1024,'filesOverLimit':large,'fileCountPass':len(included)<=20000,'perFilePass':not large},'uncertainty':['All computed outputs retained to cover manifest-driven and dynamic period/partition paths; not all possible UI interactions enumerated.','Only explicit HTML/Markdown/CSS links and static query requires resolved; legacy missing links listed, not repaired.','Excluded replay banks remain in Git; full development rebuild requires repository checkout.','No Pages artifact build or remote source settings verification performed.']}
(dest/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(dest/'publish-files.json').write_text(json.dumps([dict(path=p,**rows[p]) for p in included],ensure_ascii=False,indent=2)+'\n')
(dest/'publish-files.txt').write_text('\n'.join(included)+'\n')
(dest/'excluded-files.json').write_text(json.dumps([dict(path=p,reason=excluded[p],**rows[p]) for p in sorted(excluded)],ensure_ascii=False,indent=2)+'\n')
(dest/'dependency-edges.json').write_text(json.dumps({'site':edges,'query':requires},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='preExistingMissingLiteralReferences'},ensure_ascii=False));print('MISSING_LITERAL',len(missing))
