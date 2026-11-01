# Arma la página para publicar como artifact: sin doctype/html/head/body (el host pone el esqueleto).
import re, sys
s = open('juego/dist/index.html').read()
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', s, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
head = head.replace('html, body {', 'html, body { height: 100%; color-scheme: dark;')
out = head.strip() + '\n' + body.strip() + '\n'
open('juego/dist/publicar.html', 'w').write(out)
print(len(out))
