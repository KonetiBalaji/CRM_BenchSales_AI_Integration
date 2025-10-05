import os
root = r"D:\\Balaji_DS_Portfolio\\CRM_BenchSales_AI_Integration"
for dirpath, dirnames, filenames in os.walk(root):
    for name in filenames:
        if name.endswith(('.json', '.jsonc', '.mjs', '.js', '.ts', '.yaml', '.yml')):
            path = os.path.join(dirpath, name)
            try:
                with open(path, 'rb') as f:
                    head = f.read(3)
                if head.startswith(b'\xef\xbb\xbf'):
                    rel = os.path.relpath(path, root)
                    print(rel)
            except Exception:
                pass
