// Kullanıcı/başlık kaynaklı HTML ve CSS için temel temizlik.
export function sanitizeHtml(html) {
  if (!html) return "";
  return html
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*iframe[\s\S]*?<\s*\/\s*iframe\s*>/gi, "")
    .replace(/<\s*object[\s\S]*?<\s*\/\s*object\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function sanitizeCss(css) {
  if (!css) return "";
  return css
    .replace(/@import[^;]+;/gi, "")
    .replace(/<\s*\/?\s*style[^>]*>/gi, "")
    .replace(/expression\s*\(/gi, "");
}