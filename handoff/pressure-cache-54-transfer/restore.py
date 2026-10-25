"""Restore existing phase54 caches without running a simulation (Python 3)."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def restore(destination):
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    destination.mkdir(parents=True, exist_ok=True)
    for entry in manifest['files']:
        name = entry['file']
        if not re.fullmatch(r'[a-zA-Z0-9_.-]+', name) or name in ('.', '..'):
            raise ValueError('Invalid filename')
        target = destination / name
        if target.exists() or target.is_symlink():
            if target.is_symlink() or not target.is_file():
                raise ValueError(f'Refusing non-regular destination: {target}')
            if target.stat().st_size != entry['bytes'] or digest(target) != entry['sha256']:
                raise ValueError(f'Refusing to overwrite different file: {target}')
            print(f'Already verified: {target}')
            continue
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=destination, prefix='.cache-restore-', delete=False) as out:
                temporary = Path(out.name)
                full = hashlib.sha256()
                size = 0
                for part in entry['parts']:
                    if not re.fullmatch(r'parts/[a-zA-Z0-9_.-]+', part['path']):
                        raise ValueError('Invalid part path')
                    part_hash = hashlib.sha256()
                    part_size = 0
                    with (root / part['path']).open('rb') as source:
                        for block in iter(lambda: source.read(1024 * 1024), b''):
                            out.write(block)
                            full.update(block)
                            part_hash.update(block)
                            part_size += len(block)
                    if part_size != part['bytes'] or part_hash.hexdigest() != part['sha256']:
                        raise ValueError(f'Part checksum mismatch: {part["path"]}')
                    size += part_size
                if size != entry['bytes'] or full.hexdigest() != entry['sha256']:
                    raise ValueError(f'Cache checksum mismatch: {name}')
                out.flush()
                os.fsync(out.fileno())
            # Atomic publication without replacing an existing destination.
            os.link(temporary, target)
            print(f'Restored and verified: {target} ({size} bytes)')
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', required=True, type=Path,
                        help='New or existing pressure-cache-54 directory; different files are never overwritten')
    restore(parser.parse_args().destination.expanduser().resolve())
