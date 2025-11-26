
import { useState, useEffect, useCallback } from 'react';
import { Note, Folder, DEFAULT_FOLDERS, Theme } from '../types';

const NOTES_KEY = 'gemini_notes_data';
const FOLDERS_KEY = 'gemini_folders_data';
const THEME_KEY = 'gemini_notes_theme';

export const useStorage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [theme, setTheme] = useState<Theme>('system');

  // Initialize
  useEffect(() => {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    const savedFolders = localStorage.getItem(FOLDERS_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        // Migration: Ensure folderIds exists and isDeleted exists
        const migrated = parsed.map((n: any) => ({
            ...n,
            folderIds: Array.isArray(n.folderIds) ? n.folderIds : (n.folderId ? [n.folderId] : []),
            isDeleted: n.isDeleted || false
        }));
        setNotes(migrated);
      } catch (e) {
        console.error("Failed to parse notes", e);
        setNotes([]);
      }
    }

    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (e) {
        console.error("Failed to parse folders", e);
        setFolders(DEFAULT_FOLDERS);
      }
    } else {
      setFolders(DEFAULT_FOLDERS);
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(DEFAULT_FOLDERS));
    }

    if (savedTheme) {
        setTheme(savedTheme as Theme);
    }
  }, []);

  // Auto-Cleanup unused folders
  useEffect(() => {
      // Calculate all folder IDs currently in use by non-deleted notes
      const usedFolderIds = new Set<string>();
      notes.forEach(n => {
          if (!n.isDeleted) {
              n.folderIds.forEach(id => usedFolderIds.add(id));
          }
      });

      setFolders(prev => {
          // Filter out any folders that are not in the used set
          const newFolders = prev.filter(f => usedFolderIds.has(f.id));
          
          // Only update state and localStorage if there is an actual change
          if (newFolders.length !== prev.length) {
              localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
              return newFolders;
          }
          return prev;
      });
  }, [notes]);

  const saveNote = useCallback((note: Note) => {
    setNotes(prev => {
      const existingIndex = prev.findIndex(n => n.id === note.id);
      let newNotes;
      if (existingIndex >= 0) {
        newNotes = [...prev];
        newNotes[existingIndex] = note;
      } else {
        newNotes = [note, ...prev];
      }
      localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
      return newNotes;
    });
  }, []);

  // Soft delete
  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const newNotes = prev.map(n => n.id === id ? { ...n, isDeleted: true } : n);
      localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
      return newNotes;
    });
  }, []);

  // Restore from trash
  const restoreNote = useCallback((id: string) => {
    setNotes(prev => {
      const newNotes = prev.map(n => n.id === id ? { ...n, isDeleted: false } : n);
      localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
      return newNotes;
    });
  }, []);

  // Hard delete
  const permanentlyDeleteNote = useCallback((id: string) => {
    setNotes(prev => {
        const newNotes = prev.filter(n => n.id !== id);
        localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
        return newNotes;
    });
  }, []);

  const emptyTrash = useCallback(() => {
    setNotes(prev => {
        const newNotes = prev.filter(n => !n.isDeleted);
        localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
        return newNotes;
    });
  }, []);

  const createFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      icon: 'folder'
    };
    setFolders(prev => {
      const newFolders = [...prev, newFolder];
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
      return newFolders;
    });
    return newFolder;
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => {
        const newFolders = prev.filter(f => f.id !== id);
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
        return newFolders;
    });
  }, []);

  const clearAllData = useCallback(() => {
      localStorage.removeItem(NOTES_KEY);
      localStorage.removeItem(FOLDERS_KEY);
      localStorage.removeItem(THEME_KEY);
      setNotes([]);
      setFolders(DEFAULT_FOLDERS);
      setTheme('system');
  }, []);

  const saveTheme = useCallback((newTheme: Theme) => {
      setTheme(newTheme);
      localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  return {
    notes,
    folders,
    theme,
    saveNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    emptyTrash,
    createFolder,
    deleteFolder,
    clearAllData,
    saveTheme
  };
};
