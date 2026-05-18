import re

with open('/Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/page_murid_sd_rombel.html', 'r') as f:
    content = f.read()

# 1. Insert style
style_block = """<!-- CSS tersentralisasi di css_sultan.html -->
<style>
  /* Custom Highlighting untuk Tiap Kelas */
  .sultan-cell-k1 { background-color: rgba(220, 53, 69, 0.05) !important; color: #b01a2e !important; }
  .sultan-cell-k2 { background-color: rgba(253, 126, 20, 0.05) !important; color: #a64f00 !important; }
  .sultan-cell-k3 { background-color: rgba(255, 193, 7, 0.06) !important; color: #855d00 !important; }
  .sultan-cell-k4 { background-color: rgba(40, 167, 69, 0.05) !important; color: #155724 !important; }
  .sultan-cell-k5 { background-color: rgba(23, 162, 184, 0.05) !important; color: #0c5460 !important; }
  .sultan-cell-k6 { background-color: rgba(111, 66, 193, 0.05) !important; color: #441f7a !important; }

  .dark-mode .sultan-cell-k1 { background-color: rgba(220, 53, 69, 0.15) !important; color: #ff8a9a !important; }
  .dark-mode .sultan-cell-k2 { background-color: rgba(253, 126, 20, 0.15) !important; color: #ffb076 !important; }
  .dark-mode .sultan-cell-k3 { background-color: rgba(255, 193, 7, 0.15) !important; color: #ffe066 !important; }
  .dark-mode .sultan-cell-k4 { background-color: rgba(40, 167, 69, 0.15) !important; color: #75ecab !important; }
  .dark-mode .sultan-cell-k5 { background-color: rgba(23, 162, 184, 0.15) !important; color: #6edff6 !important; }
  .dark-mode .sultan-cell-k6 { background-color: rgba(111, 66, 193, 0.15) !important; color: #c39bf5 !important; }
</style>"""
content = content.replace("<!-- CSS tersentralisasi di css_sultan.html -->", style_block)

# 2. Main Headers
content = content.replace('<th colspan="10" class="th-main align-middle text-center sultan-cell-success px-2 py-1">KELAS 1</th>', '<th colspan="10" class="th-main align-middle text-center sultan-cell-k1 px-2 py-1">KELAS 1</th>')
content = content.replace('<th colspan="10" class="th-main align-middle text-center sultan-cell-success px-2 py-1">KELAS 2</th>', '<th colspan="10" class="th-main align-middle text-center sultan-cell-k2 px-2 py-1">KELAS 2</th>')
content = content.replace('<th colspan="10" class="th-main align-middle text-center sultan-cell-success px-2 py-1">KELAS 3</th>', '<th colspan="10" class="th-main align-middle text-center sultan-cell-k3 px-2 py-1">KELAS 3</th>')
content = content.replace('<th colspan="10" class="th-main align-middle text-center sultan-cell-info px-2 py-1">KELAS 4</th>', '<th colspan="10" class="th-main align-middle text-center sultan-cell-k4 px-2 py-1">KELAS 4</th>')
content = content.replace('<th colspan="10" class="th-main align-middle text-center sultan-cell-info px-2 py-1">KELAS 5</th>', '<th colspan="10" class="th-main align-middle text-center sultan-cell-k5 px-2 py-1">KELAS 5</th>')
content = content.replace('<th colspan="10" class="th-main align-middle text-center sultan-cell-info px-2 py-1">KELAS 6</th>', '<th colspan="10" class="th-main align-middle text-center sultan-cell-k6 px-2 py-1">KELAS 6</th>')

# 3. Sub-headers and Sub-sub-headers via block replacement
# Let's replace within specific blocks
def replace_in_block(text, start_marker, end_marker, old_class, new_class):
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker, start_idx) + len(end_marker)
    block = text[start_idx:end_idx]
    block = block.replace(old_class, new_class)
    return text[:start_idx] + block + text[end_idx:]

content = replace_in_block(content, '<!-- Kelas 1 -->', '<!-- Kelas 2 -->', 'sultan-cell-success', 'sultan-cell-k1')
content = replace_in_block(content, '<!-- Kelas 2 -->', '<!-- Kelas 3 -->', 'sultan-cell-success', 'sultan-cell-k2')
content = replace_in_block(content, '<!-- Kelas 3 -->', '<!-- Kelas 4 -->', 'sultan-cell-success', 'sultan-cell-k3')

content = replace_in_block(content, '<!-- Kelas 4 -->', '<!-- Kelas 5 -->', 'sultan-cell-info', 'sultan-cell-k4')
content = replace_in_block(content, '<!-- Kelas 5 -->', '<!-- Kelas 6 -->', 'sultan-cell-info', 'sultan-cell-k5')
content = replace_in_block(content, '<!-- Kelas 6 -->', '</tr>', 'sultan-cell-info', 'sultan-cell-k6')

# Do it again for the second row of sub-headers (which has the same markers)
# The first pass did the first row of sub-headers. Wait, the markers repeat!
# Let's just do a regex replace restricted between "<!-- Kelas X -->" and the next marker.
blocks = re.split(r'(<!-- Kelas [1-6] -->)', content)
for i in range(len(blocks)):
    if blocks[i] == '<!-- Kelas 1 -->': blocks[i+1] = blocks[i+1].replace('sultan-cell-success', 'sultan-cell-k1')
    elif blocks[i] == '<!-- Kelas 2 -->': blocks[i+1] = blocks[i+1].replace('sultan-cell-success', 'sultan-cell-k2')
    elif blocks[i] == '<!-- Kelas 3 -->': blocks[i+1] = blocks[i+1].replace('sultan-cell-success', 'sultan-cell-k3')
    elif blocks[i] == '<!-- Kelas 4 -->': blocks[i+1] = blocks[i+1].replace('sultan-cell-info', 'sultan-cell-k4')
    elif blocks[i] == '<!-- Kelas 5 -->': blocks[i+1] = blocks[i+1].replace('sultan-cell-info', 'sultan-cell-k5')
    elif blocks[i] == '<!-- Kelas 6 -->': blocks[i+1] = blocks[i+1].replace('sultan-cell-info', 'sultan-cell-k6')
content = "".join(blocks)

# 4. Javascript logic replacement
js_old = """                    else if (i >= 4) {
                        if (i >= 4 && i <= 33) {
                            cell.classList.add('sultan-cell-success');
                        } else if (i >= 34 && i <= 63) {
                            cell.classList.add('sultan-cell-info');
                        }"""
js_new = """                    else if (i >= 4) {
                        if (i >= 4 && i <= 13) {
                            cell.classList.add('sultan-cell-k1');
                        } else if (i >= 14 && i <= 23) {
                            cell.classList.add('sultan-cell-k2');
                        } else if (i >= 24 && i <= 33) {
                            cell.classList.add('sultan-cell-k3');
                        } else if (i >= 34 && i <= 43) {
                            cell.classList.add('sultan-cell-k4');
                        } else if (i >= 44 && i <= 53) {
                            cell.classList.add('sultan-cell-k5');
                        } else if (i >= 54 && i <= 63) {
                            cell.classList.add('sultan-cell-k6');
                        }"""
content = content.replace(js_old, js_new)

js_foot_old = """                    var className = "text-center py-1 font-weight-bold";
                    if (c >= 4 && c <= 33) {
                        className += " sultan-cell-success";
                    } else if (c >= 34 && c <= 63) {
                        className += " sultan-cell-info";
                    }"""
js_foot_new = """                    var className = "text-center py-1 font-weight-bold";
                    if (c >= 4 && c <= 13) {
                        className += " sultan-cell-k1";
                    } else if (c >= 14 && c <= 23) {
                        className += " sultan-cell-k2";
                    } else if (c >= 24 && c <= 33) {
                        className += " sultan-cell-k3";
                    } else if (c >= 34 && c <= 43) {
                        className += " sultan-cell-k4";
                    } else if (c >= 44 && c <= 53) {
                        className += " sultan-cell-k5";
                    } else if (c >= 54 && c <= 63) {
                        className += " sultan-cell-k6";
                    }"""
content = content.replace(js_foot_old, js_foot_new)

with open('/Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/page_murid_sd_rombel.html', 'w') as f:
    f.write(content)

print("Done rombel!")
