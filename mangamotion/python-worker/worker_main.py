import sys, json, time

def main():
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    files = payload.get('files', [])
    # Stage 1: clean
    print('PROGRESS:10', flush=True)
    time.sleep(0.5)
    # Stage 2: color (optional)
    print('PROGRESS:40', flush=True)
    time.sleep(0.5)
    # Stage 3: animate/render
    print('PROGRESS:80', flush=True)
    time.sleep(0.5)
    # Done
    print('PROGRESS:100', flush=True)
    print('OUTPUT:/outputs/result_demo.mp4', flush=True)

if __name__ == '__main__':
    main()
