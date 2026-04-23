import os
import re
import glob

# Pola Regex
pattern_show = re.compile(r"\$\(\s*['\"](#\w+_loadingState)['\"]\s*\)\.show\(\);?")
pattern_hide = re.compile(r"\$\(\s*['\"](#\w+_loadingState)['\"]\s*\)\.hide\(\);?")
pattern_datatable = re.compile(r"\$\(\s*['\"](#\w+)['\"]\s*\)\.DataTable\(\s*\{")

# Optional: Pola untuk mencari $tabel.DataTable({ di javascript.html tapi kita akan exclude itu
# karena kita hanya merefaktor page_*.html

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace show()
    content = pattern_show.sub(r"SultanUI.showLoading('\1');", content)
    
    # Replace hide()
    content = pattern_hide.sub(r"SultanUI.hideLoading('\1');", content)
    
    # Replace DataTable({
    content = pattern_datatable.sub(r"SultanTable.init('\1', {", content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored: {os.path.basename(filepath)}")
        return True
    return False

def main():
    target_dir = "."
    files = glob.glob(os.path.join(target_dir, "*.html"))
    count = 0
    for file in files:
        # Jangan refaktor helper
        basename = os.path.basename(file)
        if basename in ['ui_helpers.html', 'javascript.html', 'css_sultan.html', 'index.html', 'login.html']:
            continue
            
        if process_file(file):
            count += 1
            
    print(f"Total files refactored: {count}")

if __name__ == "__main__":
    main()
