import json
import os

temp_log_path = "scratch/overview_temp.txt"
if os.path.exists(temp_log_path):
    print("Found temp log. Processing...")
    with open(temp_log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line.strip())
                if data.get("type") == "USER_INPUT":
                    content = data.get("content", "")
                    created_at = data.get("created_at", "")
                    if content:
                        print("=" * 60)
                        print(f"USER INPUT AT {created_at}:")
                        print(content)
            except Exception as e:
                pass
else:
    print("Temp log not found!")
