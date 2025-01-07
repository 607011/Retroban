#!/usr/bin/env python3

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

DIRECTORY_TO_SERVE = '.' 
PORT = 3333

class MyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.directory = DIRECTORY_TO_SERVE

    def log_message(self, format, *args):
        pass  # Override to suppress logging    

    def translate_path(self, path):
        path = path.split('?', 1)[0]
        path = path.split('#', 1)[0]
        path = os.path.join(self.directory, *path.split('/'))
        return path

if __name__ == '__main__':
    with HTTPServer(('', PORT), MyHandler) as httpd:
        print(f"Serving \x1b[1;31mRetroban\x1b[0m at http://localhost:{PORT}")
        print("Logging disabled. To re-enable comment out `MyHandler.log_message()`")
        httpd.serve_forever()
