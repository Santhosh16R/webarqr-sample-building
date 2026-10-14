"""Loopback-only development server, including a local compiler save endpoint."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_POST(self):
        if self.path not in ['/__save-target','/__save-test-report']:
            self.send_error(404); return
        if self.headers.get('Origin') != 'http://127.0.0.1:8765':
            self.send_error(403); return
        length = int(self.headers.get('Content-Length','0'))
        if length < 10 or length > 10_000_000:
            self.send_error(400); return
        target = ROOT/('docs/assets/building-targets.mind' if self.path=='/__save-target' else 'outputs/webar-browser-checks.json')
        target.write_bytes(self.rfile.read(length))
        self.send_response(200); self.end_headers()
        self.wfile.write(json.dumps({'bytes':target.stat().st_size}).encode())

if __name__ == '__main__':
    print('Local preview: http://127.0.0.1:8765/docs/', flush=True)
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
