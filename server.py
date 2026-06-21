import http.server
import socketserver
import webbrowser
import socket
import sys

DEFAULT_PORT = 8000

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Multiple threads to handle requests, preventing canvas assets or script loading from blocking."""
    pass

def find_available_port(start_port):
    """Finds an available TCP port starting from start_port."""
    port = start_port
    while port < start_port + 100:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                port += 1
    return start_port

def run_server():
    port = find_available_port(DEFAULT_PORT)
    server_address = ('127.0.0.1', port)
    
    # Set up simple HTTP request handler
    handler = http.server.SimpleHTTPRequestHandler
    
    # Custom log messages to keep console clean and readable
    class CustomHandler(handler):
        def log_message(self, format, *args):
            # Suppress default request logs (like GET /main.js HTTP/1.1 200) to keep terminal clean
            # but allow errors to show
            if "404" in args[1] or "500" in args[1]:
                super().log_message(format, *args)
                
    try:
        httpd = ThreadingHTTPServer(server_address, CustomHandler)
        url = f"http://localhost:{port}"
        
        print("\n" + "="*50)
        print("          AEROTRACK LOCALHOST WEB SERVER")
        print("="*50)
        print(f" [+] Status: Running successfully")
        print(f" [+] Address: {url}")
        print(f" [+] Directory being served: Current workspace")
        print("="*50)
        print(" [!] Press Ctrl+C to stop the server at any time\n")
        
        # Launch default browser
        webbrowser.open(url)
        
        # Start serving loop
        httpd.serve_forever()
        
    except KeyboardInterrupt:
        print("\n [-] Shutting down AeroTrack localhost server...")
        sys.exit(0)
    except Exception as e:
        print(f"\n [x] Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_server()
