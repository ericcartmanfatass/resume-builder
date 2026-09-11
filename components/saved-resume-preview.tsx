"use client";

import Link from "next/link";
import HtmlResumePreview from "@/components/html-resume-preview";
import PDFExportButton from "@/components/pdf-export-button";
import { AccountMenu } from "@/components/account-menu";
import type { ResumeData } from "@/types/resume";

export function SavedResumePreview({
  data,
  shareToken,
}: {
  data: ResumeData;
  shareToken?: string;
}) {
  return (
    <main className="flex h-screen min-h-0 flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {data.title || "简历预览"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {shareToken
              ? "只读分享 · 内容与作者云端保存版本同步"
              : "个人预览 · 仅自己可见"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AccountMenu />
          <PDFExportButton
            resumeData={data}
            shareToken={shareToken}
            size="sm"
          />
          <Link href="/" className="text-sm underline underline-offset-4">
            我的编辑器
          </Link>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        <HtmlResumePreview
          resumeData={data}
          embedded
          className="block h-full w-full border-0 bg-white"
        />
      </div>
    </main>
  );
}
