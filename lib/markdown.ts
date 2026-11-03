import { marked } from "marked";
import { sanitizeHtml } from "@/lib/html-safety";

// Chinese punctuation and spaces next to ** are common in pasted resume text.
// Parse these pairs as emphasis too, while leaving code spans/blocks to marked.
marked.use({
  extensions: [{
    name: "resumeStrong",
    level: "inline",
    start: (source: string) => source.indexOf("**"),
    tokenizer(source: string) {
      const match = /^\*\*(?!\*)([^\n]+?)\*\*(?!\*)/.exec(source);
      const text = match?.[1].trim();
      if (match && text) {
        return { type: "strong", raw: match[0], text, tokens: this.lexer.inlineTokens(text) };
      }
    },
  }],
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * 将 Markdown 文本转换为 HTML
 * @param md Markdown 文本
 * @returns HTML 字符串
 */
export function renderMarkdown(md: string): string {
  if (!md) return "";
  
  try {
    return sanitizeHtml(marked.parse(md) as string);
  } catch (error) {
    console.error("Markdown 解析错误:", error);
    return escapeHtml(md);
  }
}

/**
 * 配置 marked 选项
 */
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true, // 支持 GitHub 风格的 Markdown
});
