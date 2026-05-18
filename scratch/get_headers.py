import urllib.request
import csv
import io

def fetch_headers(sheet_name):
    url = f"https://docs.google.com/spreadsheets/d/1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(sheet_name)}"
    print(f"Fetching {sheet_name} from: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            csv_data = response.read().decode('utf-8')
            reader = csv.reader(io.StringIO(csv_data))
            rows = [next(reader) for _ in range(4)]
            print(f"Success! Fetched {len(rows)} header rows.")
            for i, r in enumerate(rows):
                print(f"Row {i+1} (columns={len(r)}): {r[:15]} ... {r[-10:]}")
            return rows
    except Exception as e:
        print(f"Error: {e}")
        return None

print("=== MURID SD PER ROMBEL ===")
rombel = fetch_headers("Murid SD per Rombel")

print("\n=== MURID SD PER AGAMA ===")
agama = fetch_headers("Murid SD per Agama")
