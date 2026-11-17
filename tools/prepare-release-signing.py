#!/usr/bin/env python3
"""Materialize the owner's pinned signing key from Actions secrets, never print it."""
import base64,json,os,sys
from pathlib import Path

def prepare(env):
    required=['ARROWS_RELEASE_KEYSTORE_BASE64','ARROWS_RELEASE_KEYSTORE','ARROWS_RELEASE_CERT_SHA256']
    missing=[name for name in required if not env.get(name,'').strip()]
    if missing: raise ValueError('Missing secrets: '+', '.join(missing))
    expected=json.loads(Path('docs/production-signing.json').read_text())['certificateSha256']
    if env['ARROWS_RELEASE_CERT_SHA256'].lower()!=expected: raise ValueError('ARROWS_RELEASE_CERT_SHA256 does not match the pinned production identity')
    try: data=base64.b64decode(env['ARROWS_RELEASE_KEYSTORE_BASE64'],validate=True)
    except Exception: raise ValueError('Invalid ARROWS_RELEASE_KEYSTORE_BASE64') from None
    if not 1024<=len(data)<=32768: raise ValueError('Invalid signing payload size')
    path=Path(env['ARROWS_RELEASE_KEYSTORE']);path.parent.mkdir(parents=True,exist_ok=True)
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'wb') as f:f.write(data)

if __name__=='__main__':
    try: prepare(os.environ)
    except Exception as e: print(str(e),file=sys.stderr);sys.exit(1)
    print('Private signing material restored; certificate will be verified on the APK.')
