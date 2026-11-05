"use client";

import type React from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import HtmlResumePreview from "@/components/html-resume-preview";
import ResponsiveResumePreview from "@/components/responsive-resume-preview";
import { useCompactLayout } from "@/hooks/use-compact-layout";
import ModuleEditor from "@/components/module-editor";
import PDFExportButton from "@/components/pdf-export-button";
import PersonalInfoEditor from "@/components/personal-info-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  createBlankResumeData,
  downloadFile,
  exportToMagicyanFile,
  importFromMagicyanFile,
} from "@/lib/resume-utils";
import type { EditorState, ResumeData } from "@/types/resume";
import type { AccountUser } from "@/types/account";
import { AccountMenu } from "@/components/account-menu";
import { useAccount } from "@/components/account-provider";
import { CloudResumeControls } from "@/components/cloud-resume-controls";
import { useCloudResume } from "@/hooks/use-cloud-resume";

type ViewMode = "both" | "edit-only" | "preview-only";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const LOCAL_RESUME_KEY = "magicyan-resume-draft";

const ViewModeSelector = memo(function ViewModeSelector({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const modes = [
    {
      key: "both" as ViewMode,
      label: "编辑 + 预览",
      icon: "mdi:view-split-vertical",
    },
    { key: "edit-only" as ViewMode, label: "仅编辑", icon: "mdi:pencil" },
    { key: "preview-only" as ViewMode, label: "仅预览", icon: "mdi:eye" },
  ];

  return (
    <div className="relative inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-1">
      {modes.map((mode) => (
        <button
          key={mode.key}
          onClick={() => onViewModeChange(mode.key)}
          className={`relative flex min-w-[84px] items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:min-w-[100px] ${
            viewMode === mode.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon icon={mode.icon} className="h-4 w-4" />
          <span className="hidden sm:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
});

export default function ResumeBuilder({ user }: { user: AccountUser | null }) {
  const localKey = user ? `${LOCAL_RESUME_KEY}:${user.id}` : LOCAL_RESUME_KEY;
  const { confirm, requireLogin } = useAccount();
  const [editorState, setEditorState] = useState<EditorState>({
    resumeData: {
      title: "加载中...",
      personalInfo: [],
      avatar: "",
      avatarShape: "circle",
      modules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isEditing: true,
    showPreview: true,
  });
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [compactMode, setCompactMode] = useState<"edit" | "preview">("edit");
  const isCompact = useCompactLayout();
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasGuestDraft, setHasGuestDraft] = useState(false);
  const { toast } = useToast();
  const loadCloudData = useCallback((resumeData: ResumeData) => {
    setEditorState((previous) => ({ ...previous, resumeData }));
  }, []);
  const cloud = useCloudResume(
    user,
    editorState.resumeData,
    isHydrated,
    localKey,
    loadCloudData,
  );

  const loadDemoData = useCallback(async () => {
    const response = await fetch("/demo.magicyan");
    if (!response.ok) {
      throw new Error("Failed to load demo data");
    }

    const content = await response.text();
    return importFromMagicyanFile(content);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (user)
          setHasGuestDraft(
            Boolean(localStorage.getItem(LOCAL_RESUME_KEY)) &&
              !localStorage.getItem(`${localKey}:guest-dismissed`),
          );
        const savedDraft = window.localStorage.getItem(localKey);
        if (savedDraft) {
          setEditorState((prev) => ({
            ...prev,
            resumeData: importFromMagicyanFile(savedDraft),
          }));
          setIsHydrated(true);
          return;
        }

        const demoData = await loadDemoData();

        setEditorState((prev) => ({
          ...prev,
          resumeData: demoData,
        }));
        setIsHydrated(true);
      } catch (error) {
        console.error("加载示例数据失败:", error);
        setIsHydrated(true);
        toast({
          title: "加载失败",
          description: "无法加载本地草稿或示例简历数据，请刷新页面重试。",
          variant: "destructive",
        });
      }
    };

    loadInitialData();
  }, [loadDemoData, toast, localKey, user?.id]);

  useEffect(() => {
    if (!isHydrated || cloud.restoring) {
      return;
    }

    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        cloud.writeLocalDraft(editorState.resumeData);
        setSaveStatus("saved");
      } catch (error) {
        console.error("自动保存失败:", error);
        setSaveStatus("error");
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    editorState.resumeData,
    isHydrated,
    cloud.restoring,
    cloud.writeLocalDraft,
  ]);

  useEffect(() => {
    const flush = () => {
      if (!isHydrated || cloud.restoring) return;
      try {
        cloud.writeLocalDraft(editorState.resumeData);
      } catch {
        setSaveStatus("error");
      }
    };
    window.addEventListener("resume:flush-draft", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("resume:flush-draft", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [
    editorState.resumeData,
    isHydrated,
    cloud.restoring,
    cloud.writeLocalDraft,
  ]);

  const handleLoadDemo = async () => {
    try {
      const demoData = await loadDemoData();
      await cloud.detach();
      window.localStorage.removeItem(localKey);
      setEditorState((prev) => ({
        ...prev,
        resumeData: demoData,
      }));
      toast({
        title: "示例已加载",
        description: "当前草稿已替换为示例简历。",
      });
    } catch (error) {
      console.error("加载示例数据失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载示例简历数据，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleCreateBlankResume = async () => {
    try {
      await cloud.detach();
    } catch (cause) {
      toast({
        title: "请先处理云端保存",
        description: cause instanceof Error ? cause.message : "保存失败。",
        variant: "destructive",
      });
      return;
    }
    const blankResume = createBlankResumeData();
    window.localStorage.removeItem(localKey);
    setEditorState((prev) => ({
      ...prev,
      resumeData: blankResume,
    }));
    toast({
      title: "已新建简历",
      description: "当前草稿已重置为空白简历。",
    });
  };

  const updateResumeData = useCallback((updates: Partial<ResumeData>) => {
    setEditorState((prev) => ({
      ...prev,
      resumeData: {
        ...prev.resumeData,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const handleExport = () => {
    try {
      const fileContent = exportToMagicyanFile(editorState.resumeData);
      const filename = `${editorState.resumeData.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}.magicyan`;
      downloadFile(fileContent, filename);

      toast({
        title: "导出成功",
        description: `简历源文件已导出为 ${filename}`,
      });
    } catch (error) {
      console.error("导出失败:", error);
      toast({
        title: "导出失败",
        description: "文件导出时发生错误，请重试。",
        variant: "destructive",
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith(".magicyan")) {
      toast({
        title: "文件格式错误",
        description: "请选择 .magicyan 格式文件。",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "文件大小不能超过 5MB。",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const content = loadEvent.target?.result as string;
        const importedData = importFromMagicyanFile(content);
        await cloud.detach();

        setEditorState((prev) => ({
          ...prev,
          resumeData: importedData,
        }));

        toast({
          title: "导入成功",
          description: `已导入简历：${importedData.title}`,
        });
      } catch (error) {
        console.error("导入文件失败:", error);
        toast({
          title: "导入失败",
          description:
            error instanceof Error
              ? error.message
              : "文件解析失败，请检查文件格式。",
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "读取失败",
        description: "无法读取文件，请重试。",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const handleCloudSave = async () => {
    if (!user) {
      requireLogin();
      return;
    }
    try {
      await cloud.save();
      toast({
        title: cloud.active ? "云端同步完成" : "已保存到云端",
        description: "后续修改将自动同步。",
      });
    } catch (cause) {
      toast({
        title: "云端保存失败",
        description: cause instanceof Error ? cause.message : "请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const saveStatusLabel =
    saveStatus === "saving"
      ? "本地保存中"
      : saveStatus === "saved"
        ? "本地草稿已保存"
        : saveStatus === "error"
          ? "本地保存失败"
          : "";

  return (
    <div className="resume-editor">
      <header className="editor-toolbar">
        <div className="toolbar-title">
          <div className="flex min-w-0 items-center gap-2">
            <Icon
              icon="mdi:file-document-edit"
              className="h-6 w-6 text-primary"
            />
            <h1 className="sr-only whitespace-nowrap text-lg font-semibold md:not-sr-only">
              简历生成器
            </h1>
          </div>
          <Badge
            variant="secondary"
            className="hidden min-w-0 max-w-40 truncate text-xs xl:inline-flex 2xl:max-w-64"
            title={editorState.resumeData.title}
          >
            {editorState.resumeData.title}
          </Badge>
          {saveStatusLabel && (
            <span
              className={`hidden whitespace-nowrap text-xs 2xl:inline ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {saveStatusLabel}
            </span>
          )}
        </div>

        <div className="toolbar-actions desktop-toolbar-actions">
          <ViewModeSelector
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          <Separator orientation="vertical" className="hidden h-6 lg:block" />

          <input
            type="file"
            accept=".magicyan"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={cloud.busy || !isHydrated}
                className="gap-2 bg-transparent"
              >
                <Icon icon="mdi:dots-horizontal" className="h-4 w-4" />
                更多
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>更多操作</DialogTitle>
                <DialogDescription>
                  新建、载入或导入简历源文件。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="h-auto justify-start gap-3 px-4 py-3"
                    onClick={() => void handleCreateBlankResume()}
                  >
                    <Icon
                      icon="mdi:file-plus-outline"
                      className="h-5 w-5"
                    />
                    <span className="text-left">
                      <span className="block">新建空白简历</span>
                    </span>
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="h-auto justify-start gap-3 px-4 py-3"
                    onClick={() => void handleLoadDemo()}
                  >
                    <Icon
                      icon="mdi:file-restore-outline"
                      className="h-5 w-5"
                    />
                    <span className="text-left">
                      <span className="block">加载示例</span>
                    </span>
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="h-auto justify-start gap-3 px-4 py-3"
                    onClick={() =>
                      document.getElementById("import-file")?.click()
                    }
                  >
                    <Icon icon="mdi:import" className="h-5 w-5" />
                    <span className="text-left">
                      <span className="block">导入源文件</span>
                    </span>
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!isHydrated}
            className="gap-2 bg-transparent"
          >
            <Icon icon="mdi:export" className="h-4 w-4" />
            导出
          </Button>

          <Button
            size="sm"
            onClick={() => void handleCloudSave()}
            disabled={cloud.busy || !isHydrated}
            className="gap-2"
          >
            <Icon
              icon={
                cloud.busy
                  ? "mdi:loading"
                  : cloud.active
                    ? "mdi:cloud-sync-outline"
                    : "mdi:cloud-upload-outline"
              }
              className={`h-4 w-4 ${cloud.busy ? "animate-spin" : ""}`}
            />
            {cloud.busy ? "同步中…" : cloud.active ? "云端同步" : "保存"}
          </Button>

          <PDFExportButton resumeData={editorState.resumeData} size="sm" />
        </div>
        <div className="mobile-toolbar-actions">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={() => void handleCloudSave()}
              disabled={cloud.busy || !isHydrated}
              className="min-h-10 gap-2"
            >
              <Icon icon={cloud.busy ? "mdi:loading" : "mdi:content-save-outline"} className={`h-4 w-4 ${cloud.busy ? "animate-spin" : ""}`} />
              {cloud.busy ? "同步中…" : cloud.active ? "云端同步" : "保存"}
            </Button>
            <div className="[&>button]:w-full"><PDFExportButton resumeData={editorState.resumeData} size="sm" /></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="编辑与预览">
              <button type="button" role="tab" aria-selected={compactMode === "edit"} onClick={() => setCompactMode("edit")}
                className={`min-h-10 rounded-md px-3 text-sm font-medium ${compactMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>编辑</button>
              <button type="button" role="tab" aria-selected={compactMode === "preview"} onClick={() => setCompactMode("preview")}
                className={`min-h-10 rounded-md px-3 text-sm font-medium ${compactMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>预览</button>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-10 shrink-0 gap-1 bg-transparent" aria-label="更多简历操作">
                  <Icon icon="mdi:dots-horizontal" className="h-4 w-4" />更多
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>更多操作</DialogTitle>
                  <DialogDescription>新建、载入、导入或导出简历源文件。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <DialogClose asChild><Button variant="outline" className="min-h-11 justify-start" onClick={() => void handleCreateBlankResume()}>新建空白简历</Button></DialogClose>
                  <DialogClose asChild><Button variant="outline" className="min-h-11 justify-start" onClick={() => void handleLoadDemo()}>加载示例</Button></DialogClose>
                  <DialogClose asChild><Button variant="outline" className="min-h-11 justify-start" onClick={() => document.getElementById("import-file")?.click()}>导入源文件</Button></DialogClose>
                  <DialogClose asChild><Button variant="outline" className="min-h-11 justify-start" onClick={handleExport}>导出 .magicyan 源文件</Button></DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <AccountMenu>
          <CloudResumeControls cloud={cloud} ready={isHydrated} />
          {hasGuestDraft && user && (
            <section className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
              <p>此浏览器有一份游客草稿，是否导入当前账号？</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded px-1 py-1.5 text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  disabled={cloud.busy}
                  onClick={async () => {
                    if (
                      !(await confirm(
                        "导入游客草稿将替换当前编辑内容。已关联的云端简历会先保存。是否继续？",
                      ))
                    )
                      return;
                    try {
                      const raw = localStorage.getItem(LOCAL_RESUME_KEY);
                      if (!raw) return;
                      const imported = importFromMagicyanFile(raw);
                      await cloud.detach();
                      loadCloudData(imported);
                      localStorage.setItem(`${localKey}:guest-dismissed`, "1");
                      setHasGuestDraft(false);
                      toast({
                        title: "游客草稿已导入",
                        description: "点击“保存到云端”即可关联到当前账号。",
                      });
                    } catch (cause) {
                      toast({
                        title: "导入失败",
                        description:
                          cause instanceof Error ? cause.message : "请重试。",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  导入游客草稿
                </button>
                <button
                  type="button"
                  className="rounded px-1 py-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    localStorage.setItem(`${localKey}:guest-dismissed`, "1");
                    setHasGuestDraft(false);
                  }}
                >
                  暂不导入
                </button>
              </div>
            </section>
          )}
        </AccountMenu>
      </header>

      <div className="editor-content">
        {(isCompact ? compactMode === "edit" : viewMode === "both" || viewMode === "edit-only") && (
          <div
            className={`editor-panel ${viewMode === "edit-only" ? "w-full" : ""}`}
          >
            <div className="space-y-6 p-3 sm:p-6">
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="mdi:format-title"
                      className="h-5 w-5 text-primary"
                    />
                    <h2 className="font-medium">简历标题</h2>
                  </div>
                  <Input
                    value={editorState.resumeData.title}
                    onChange={(event) =>
                      updateResumeData({ title: event.target.value })
                    }
                    maxLength={200}
                    placeholder="请输入简历标题或姓名"
                    className="text-lg font-medium"
                  />
                </div>
              </Card>

              <PersonalInfoEditor
                personalInfo={editorState.resumeData.personalInfo}
                avatar={editorState.resumeData.avatar}
                avatarShape={editorState.resumeData.avatarShape}
                onUpdate={(personalInfo, avatar, avatarShape) =>
                  updateResumeData({ personalInfo, avatar, avatarShape })
                }
              />

              <ModuleEditor
                modules={editorState.resumeData.modules}
                onUpdate={(modules) => updateResumeData({ modules })}
              />
            </div>
          </div>
        )}

        {(isCompact ? compactMode === "preview" : viewMode === "both" || viewMode === "preview-only") && (
          <div
            className={`preview-panel ${viewMode === "preview-only" ? "w-full" : ""}`}
          >
            {isCompact ? (
              <ResponsiveResumePreview resumeData={editorState.resumeData} />
            ) : (
              <HtmlResumePreview resumeData={editorState.resumeData} embedded />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
