from pathlib import Path
files = [Path('app/branches/page.tsx'), Path('app/admin/page.tsx')]
for fp in files:
    text = fp.read_text(encoding='utf-8')
    new_text = text.replace('â”€â”€', '--').replace('â€”', '—').replace('â†’', '→')
    if new_text != text:
        fp.write_text(new_text, encoding='utf-8')
        print(f'Updated {fp}')
    else:
        print(f'No changes for {fp}')
