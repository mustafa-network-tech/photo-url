"""Read-only city EXIF inventory. Run explicitly; not part of the Vercel build.
Requires Pillow. --check verifies the committed artifacts without changing them.
"""
import hashlib
import json
import math
from pathlib import Path
import sys
import warnings
from urllib.parse import quote
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CITY = ROOT / 'images' / 'ŞEHİRLER'
ORIGIN = 'https://arsiv.mavikadraj.com.tr/'
FIELDS = {1: 'GPSLatitudeRef', 2: 'GPSLatitude', 3: 'GPSLongitudeRef', 4: 'GPSLongitude'}


def decimal(dms, ref, limit, positive, negative):
    if isinstance(ref, bytes):
        ref = ref.decode('ascii')
    if ref not in (positive, negative) or len(dms) != 3:
        raise ValueError('Missing/invalid GPS reference or DMS')
    d, m, s = [float(x) for x in dms]
    if not all(math.isfinite(x) for x in (d, m, s)):
        raise ValueError('Non-finite GPS')
    if not (0 <= d <= limit and 0 <= m < 60 and 0 <= s < 60):
        raise ValueError('Invalid DMS range')
    value = d + m / 60 + s / 3600
    if value > limit:
        raise ValueError('Out-of-range coordinate')
    return -value if ref == negative else value


def scan():
    rows, photos = [], []
    counts = dict(total=0, validGps=0, missingGps=0, invalidGps=0)
    tags_path = ROOT / 'photo-tags.json'
    tags = json.loads(tags_path.read_text('utf-8')) if tags_path.exists() else {}
    for file in sorted(CITY.rglob('*')):
        if file.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'):
            continue
        if file.is_symlink() or not file.resolve().is_relative_to(CITY.resolve()):
            raise ValueError('Photo outside city root')
        rel = file.relative_to(ROOT).as_posix()
        parts = file.relative_to(CITY).parts
        url = ORIGIN + quote(rel, safe='/')
        row = dict(path=rel, imageUrl=url, category='Şehirler', city=parts[0],
                   location=' / '.join(parts[1:-1]), sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
                   exif={}, status='missingGps')
        counts['total'] += 1
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error')
                with Image.open(file) as image:
                    exif = image.getexif()
                    row['exifPresent'] = bool(exif)
                    gps = exif.get_ifd(34853)
            row['exif'] = {name: str(gps[tag]) if tag in gps else None for tag, name in FIELDS.items()}
            if any(tag in gps for tag in FIELDS):
                row['status'] = 'invalidGps'
                lat = decimal(gps[2], gps[1], 90, 'N', 'S')
                lng = decimal(gps[4], gps[3], 180, 'E', 'W')
                if lat == 0 and lng == 0:
                    raise ValueError('Suspicious zero/zero GPS; excluded without correction')
                row.update(status='validGps', latitude=lat, longitude=lng)
                thumb = 'thumbnails/' + rel.removeprefix('images/') + '.jpg'
                photos.append(dict(id=rel, imageUrl=url, photoUrl=url,
                    thumbnailUrl=ORIGIN + quote(thumb, safe='/') if (ROOT / thumb).is_file() else url,
                    latitude=lat, longitude=lng, title=tags.get(rel, {}).get('label') or file.name,
                    location=' · '.join(parts[:-1]), category='Şehirler',
                    locationSource='exif', exactLocation=True))
        except Exception as error:
            row.update(status='invalidGps', error=f'{type(error).__name__}: {error}')
        counts[row['status']] += 1
        rows.append(row)
    if not rows:
        raise ValueError('City inventory is empty; check the source directory')
    counts['points'] = len({(p['latitude'], p['longitude']) for p in photos})
    return dict(summary=counts, files=rows), photos


if __name__ == '__main__':
    inventory, photos = scan()
    artifacts = {
        ROOT / 'reports/city-gps-inventory.json': json.dumps(inventory, ensure_ascii=False, indent=2) + '\n',
        ROOT / 'harita/city-photos.js': 'window.MAVI_MAP_PHOTOS = ' + json.dumps(photos, ensure_ascii=False, indent=2).replace('<', '\\u003c') + ';\n'
    }
    for path, content in artifacts.items():
        if '--check' in sys.argv:
            if path.read_text('utf-8') != content:
                raise SystemExit(f'Stale GPS artifact: {path.name}')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding='utf-8')
    print(json.dumps(inventory['summary']))
