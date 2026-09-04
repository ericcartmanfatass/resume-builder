"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@iconify/react";
import type { PersonalInfoItem } from "@/types/resume";
import { sanitizeSvgBody, sanitizeUrl } from "@/lib/html-safety";
import { createNewPersonalInfoItem } from "@/lib/resume-utils";
import IconPicker from "./icon-picker";

interface PersonalInfoEditorProps {
  personalInfo: PersonalInfoItem[];
  avatar?: string;
  onUpdate: (personalInfo: PersonalInfoItem[], avatar?: string) => void;
}

/**
 * 个人信息编辑器组件
 */
export default function PersonalInfoEditor({
  personalInfo,
  avatar,
  onUpdate,
}: PersonalInfoEditorProps) {
  const [avatarUrl, setAvatarUrl] = useState(avatar || "");
  const safeAvatarUrl = sanitizeUrl(avatarUrl, { allowImages: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(avatar || "");
  }, [avatar]);

  /**
   * 处理文件上传
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAvatarUrl(base64);
        onUpdate(personalInfo, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * 更新个人信息项
   */
  const updatePersonalInfoItem = (
    id: string,
    updates: Partial<PersonalInfoItem>
  ) => {
    const updatedInfo = personalInfo.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate(updatedInfo, avatarUrl);
  };

  /**
   * 添加新的个人信息项
   */
  const addPersonalInfoItem = () => {
    const newItem = createNewPersonalInfoItem();
    onUpdate([...personalInfo, newItem], avatarUrl);
  };

  /**
   * 删除个人信息项
   */
  const removePersonalInfoItem = (id: string) => {
    const updatedInfo = personalInfo.filter((item) => item.id !== id);
    onUpdate(updatedInfo, avatarUrl);
  };

  /**
   * 处理头像URL变化
   */
  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
    onUpdate(personalInfo, url);
  };

  return (
    <Card className="section-card">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:account-circle" className="w-5 h-5 text-primary" />
          <h2 className="section-title">个人信息</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={addPersonalInfoItem}
          className="gap-2 bg-transparent"
        >
          <Icon icon="mdi:plus" className="w-4 h-4" />
          添加信息
        </Button>
      </div>

      <div className="space-y-4">
        {/* 头像设置 */}
        <div className="form-group">
          <Label className="form-label">头像</Label>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:cursor-pointer hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              {safeAvatarUrl ? (
                <img
                  src={safeAvatarUrl}
                  alt="头像预览"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon
                  icon="mdi:account"
                  className="w-8 h-8 text-muted-foreground"
                />
              )}
            </div>
            <div className="flex-1">
              <Input
                value={avatarUrl}
                onChange={(e) => handleAvatarChange(e.target.value)}
                placeholder="请输入头像图片URL或点击头像上传"
                className="mb-2 placeholder:text-gray-400 border border-border"
              />
              <p className="text-xs text-gray-400 pl-3">
                建议使用1:1比例的图片
              </p>
            </div>
          </div>
        </div>

        {/* 个人信息项列表 */}
        <div className="space-y-3">
          {personalInfo.map((item) => (
            <PersonalInfoItemEditor
              key={item.id}
              item={item}
              onUpdate={(updates) => updatePersonalInfoItem(item.id, updates)}
              onRemove={() => removePersonalInfoItem(item.id)}
            />
          ))}
        </div>

        {personalInfo.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Icon
              icon="mdi:information-outline"
              className="w-8 h-8 mx-auto mb-2 opacity-50"
            />
            <p className="text-sm">暂无个人信息，点击"添加信息"开始编辑</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </Card>
  );
}

/**
 * 个人信息项编辑器
 */
interface PersonalInfoItemEditorProps {
  item: PersonalInfoItem;
  onUpdate: (updates: Partial<PersonalInfoItem>) => void;
  onRemove: () => void;
}

function PersonalInfoItemEditor({
  item,
  onUpdate,
  onRemove,
}: PersonalInfoItemEditorProps) {
  const iconBody = sanitizeSvgBody(item.icon);

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
      {/* 图标选择 */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="icon-button bg-transparent"
          >
            {iconBody && (
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                dangerouslySetInnerHTML={{ __html: iconBody }}
              />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择图标</DialogTitle>
          </DialogHeader>
          <IconPicker
            selectedIcon={item.icon}
            onSelect={(icon) => onUpdate({ icon })}
          />
        </DialogContent>
      </Dialog>

      {/* 标签和值编辑 */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">标签</Label>
          <Input
            value={item.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="如：电话、邮箱"
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">内容</Label>
          <Input
            value={item.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="请输入对应内容"
            className="h-8"
          />
        </div>
      </div>

      {/* 删除按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="icon-button text-destructive hover:text-destructive"
      >
        <Icon icon="mdi:delete" className="w-4 h-4" />
      </Button>
    </div>
  );
}
