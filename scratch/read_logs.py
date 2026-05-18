import os

log_path = "/Users/macbookpro/.gemini/antigravity/brain/375d62ed-5360-4462-8142-118d9bf89148/.system_generated/logs/overview.txt"
if os.path.exists(log_path):
    print("File exists! Reading last 200 lines:")
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    for line in lines[-200:]:
        print(line.strip())
else:
    print(f"File not found: {log_path}")
