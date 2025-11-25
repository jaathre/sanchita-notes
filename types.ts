
export interface Note {
  id: string;
  title: string;
  content: string;
  folderIds: string[];
  tags: string[];
  summary?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean; // Soft delete flag
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  isSystem?: boolean;
}

export type ViewState = 'home' | 'folders' | 'tags' | 'settings' | 'editor' | 'trash';

export type Theme = 'light' | 'dark' | 'black' | 'system';

export interface AppState {
  view: ViewState;
  activeNoteId: string | null;
  activeFolderId: string | null;
  activeTag: string | null;
}

export const DEFAULT_FOLDERS: Folder[] = [];
