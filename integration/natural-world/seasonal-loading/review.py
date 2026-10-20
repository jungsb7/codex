"""Losslessly store browser captures and build a local before/after review gallery."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent
samples = json.loads((root / 'samples.json').read_text())
for stage in ('before', 'after'):
    for png in (root / 'validation' / stage).glob('*.png'):
        original = Image.open(png).convert('RGB')
        target = png.with_suffix('.webp')
        original.save(target, lossless=True, method=6)
        assert Image.open(target).convert('RGB').tobytes() == original.tobytes()
        png.unlink()

head = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>대표 12경관 전후 점검</title><style>body{margin:24px;background:#122b33;color:#e8eee7;font:16px/1.6 system-ui}select{margin:8px;padding:8px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;height:auto}a{color:#b8e7de}@media(max-width:700px){main{grid-template-columns:1fr}}</style><h1>대표 12경관 전후 점검</h1><p>자연 11권역 + 기존 호수. 원본 약26km, 확대 형태는 설계 표시. 해안·호수·미정 상태 유지.</p><p><a href="README.md">구현·검증 기록</a></p><label>경관<select id="sample"></select></label><label>화면<select id="width"><option>1500</option><option>390</option></select>px</label><label>확대<select id="zoom"><option>12</option><option>24</option><option>32</option></select>배</label><p id="info"></p><main><section><h2>수정 전</h2><a id="before-link"><img id="before" alt="수정 전 경관"></a></section><section><h2>수정 후</h2><a id="after-link"><img id="after" alt="수정 후 경관"></a></section></main><script>'''
script = 'const samples=' + json.dumps(samples, ensure_ascii=False) + ''';
const $=id=>document.getElementById(id);
samples.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;$('sample').append(o);});
function render(){const s=samples.find(s=>s.id===$('sample').value);$('info').textContent=s.regionName+' · '+s.coordinates.join(', ')+' · '+s.reason+' · '+s.biome;for(const stage of ['before','after']){const url='validation/'+stage+'/'+s.id+'-'+$('width').value+'-'+$('zoom').value+'.webp';$(stage).src=url;$(stage+'-link').href=url;}}
for(const id of ['sample','width','zoom'])$(id).onchange=render;render();</script></html>'''
(root / 'REVIEW.html').write_text(head + script)
print('Verified lossless WebP captures and generated REVIEW.html')
