import { marked } from "marked";
import { sanitizeHtml } from "@/lib/html-safety";

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
