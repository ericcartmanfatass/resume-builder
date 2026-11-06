export interface PersonalInfoItem {
  label: string
  value: string
  icon?: string
  id: string
}

export type ModuleContentMode = "markdown" | "rich-text"

export interface ResumeModule {
  id: string
  title: string
  subtitle?: string
  timeRange?: string
  content: string
  contentMode?: ModuleContentMode
  icon?: string
  order: number
}

export interface ResumeData {
  title: string
  personalInfo: PersonalInfoItem[]
  modules: ResumeModule[]
  avatar?: string
  avatarShape?: "square" | "circle"
  createdAt: string
  updatedAt: string
}

export interface ResumeSourceFile {
  version: string
  data: ResumeData
  metadata: {
    exportedAt: string
    appVersion: string
  }
}

/** @deprecated Use ResumeSourceFile; kept for code importing the old type. */
export type MagicyanFile = ResumeSourceFile

export interface EditorState {
  resumeData: ResumeData
  isEditing: boolean
  selectedModuleId?: string
  showPreview: boolean
}
