#!/usr/bin/env python3
"""Restore verified source files from this archive checkout; requires Python 3 and zstd."""
import argparse, hashlib, json, pathlib, subprocess, tarfile, tempfile, os
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('destination',type=pathlib.Path)
p.add_argument('--verify-only',action='store_true')
a=p.parse_args(); base=pathlib.Path(__file__).resolve().parent
m=json.loads((base/'ARCHIVE.json').read_text()); source=json.loads((base/'SOURCE_MANIFEST.json').read_text())
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
# Verify every downloaded part before decoding. Re-running after an interrupted clone is safe.
h=hashlib.sha256()
with tempfile.TemporaryFile() as joined:
 for part in m['parts']:
  f=base/part['path']; assert f.stat().st_size==part['bytes'] and digest(f)==part['sha256'],f
  with f.open('rb') as inp:
   for b in iter(lambda:inp.read(1048576),b''):joined.write(b);h.update(b)
 assert h.hexdigest()==m['sha256'],'Complete archive checksum mismatch'
 joined.seek(0)
 proc=subprocess.Popen(['zstd','-d','-c'],stdin=joined,stdout=subprocess.PIPE)
 expected={source['root']+'/'+f['path']:f for f in source['files']}; seen=set()
 try:
  with tarfile.open(fileobj=proc.stdout,mode='r|') as tar:
   for member in tar:
    if member.isdir():continue
    assert member.isfile() and member.name in expected and member.name not in seen,member.name
    rel=pathlib.PurePosixPath(member.name)
    assert not rel.is_absolute() and '..' not in rel.parts
    spec=expected[member.name]; assert member.size==spec['bytes'];seen.add(member.name)
    target=a.destination/rel
    # Resolve any pre-existing parent symlinks and refuse paths outside destination.
    assert target.resolve().is_relative_to(a.destination.resolve()),target
    assert not target.is_symlink(),target
    existing=target.exists()
    if existing:assert target.is_file() and digest(target)==spec['sha256'],f'Refusing to overwrite {target}'
    out=None;tmp=None;sha=hashlib.sha256()
    try:
     if not a.verify_only and not existing:
      target.parent.mkdir(parents=True,exist_ok=True)
      fd,tmp=tempfile.mkstemp(prefix='.restore-',dir=target.parent);out=os.fdopen(fd,'wb')
     with tar.extractfile(member) as inp:
      for b in iter(lambda:inp.read(1048576),b''):
       sha.update(b)
       if out:out.write(b)
     assert sha.hexdigest()==spec['sha256'],member.name
     if out:out.close();out=None;os.chmod(tmp,member.mode & 0o777);os.replace(tmp,target);tmp=None
    finally:
     if out:out.close()
     if tmp:os.unlink(tmp)
  assert proc.wait()==0,'zstd failed'
  assert seen==set(expected),'Missing source files'
 finally:
  if proc.poll() is None:proc.kill();proc.wait()
print(json.dumps({'verified_files':len(seen),'source_bytes':sum(f['bytes'] for f in source['files']),'archive_sha256':m['sha256'],'verify_only':a.verify_only}))
