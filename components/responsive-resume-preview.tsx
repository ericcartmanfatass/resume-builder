"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import HtmlResumePreview from "@/components/html-resume-preview";
import type { ResumeData } from "@/types/resume";

// CSS resolves physical units at 96px/in. Keep this display-only: PDF HTML
// and Puppeteer's A4 settings must not depend on the phone's viewport.
const A4_WIDTH = (210 / 25.4) * 96;
const A4_HEIGHT = (297 / 25.4) * 96;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3;

interface ResponsiveResumePreviewProps {
  resumeData: ResumeData;
  className?: string;
  activeSection?: string | null;
}

export default function ResponsiveResumePreview({
  resumeData,
  className = "",
  activeSection,
}: ResponsiveResumePreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setViewport((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitScale = viewport.width > 0 ? Math.min(1, viewport.width / A4_WIDTH) : 1;
  const scale = fitScale * zoom;
  // The A4 iframe preserves its own scroll for long resumes. The compact
  // viewport also scrolls to the matching edit section when it changes.
  const frameHeight = Math.max(A4_HEIGHT, viewport.height > 0 ? viewport.height / scale : 0);
  const scaledWidth = A4_WIDTH * scale;
  const scaledHeight = frameHeight * scale;

  return (
    <div className={`flex h-full min-h-0 min-w-0 flex-col ${className}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-white px-3 py-2 text-sm">
        <span className="min-w-0 truncate text-slate-600">A4 预览</span>
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="预览缩放">
          <button
            type="button"
            aria-label="缩小预览"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((value) => Math.max(MIN_ZOOM, Math.round((value - 0.25) * 100) / 100))}
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="适应宽度"
            className="min-w-14 rounded-md px-2 py-2 text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => setZoom(1)}
          >
            适宽
          </button>
          <button
            type="button"
            aria-label="放大预览"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((value) => Math.min(MAX_ZOOM, Math.round((value + 0.25) * 100) / 100))}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="min-h-0 min-w-0 flex-1 overflow-auto bg-slate-100"
        role="region"
        aria-label="简历预览区域，可通过上方按钮缩放"
      >
        {viewport.width > 0 && viewport.height > 0 && (
          <div
            className="relative mx-auto bg-white shadow-md"
            style={{ width: scaledWidth, height: scaledHeight }}
          >
            <HtmlResumePreview
              resumeData={resumeData}
              embedded
              activeSection={activeSection}
              onSectionPosition={(position) => {
                const viewportElement = viewportRef.current;
                if (!viewportElement) return;
                const target = Math.max(0, position * scale - viewportElement.clientHeight * 0.12);
                viewportElement.scrollTo({ top: target, behavior: "smooth" });
              }}
              className="absolute left-0 top-0 block border-0 bg-white"
              style={{
                width: A4_WIDTH,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
