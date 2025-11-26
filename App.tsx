import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStorage } from './services/storageService';
import { Note, Folder, ViewState, Theme } from './types';
import BottomNav from './components/BottomNav';
import NoteCard from './components/NoteCard';
import { ChevronLeftIcon, SearchIcon, TrashIcon, FolderIcon, HashIcon, CheckIcon, RestoreIcon, SelectIcon, ChevronDownIcon, ChevronUpIcon, XIcon, CheckCircleIcon, CircleIcon, MoreVerticalIcon, CopyIcon, EditIcon } from './components/Icons';

// --- Helper Functions ---

const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    const saturation = 65 + (Math.abs(hash) % 25); 
    const lightness = 75 + (Math.abs(hash >> 2) % 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`; 
};

const parseMetadataFromText = (text: string) => {
    const tagMatches = text.matchAll(/#([a-zA-Z0-9_-]+)/g);
    const tags = Array.from(tagMatches).map(m => m[1].toLowerCase());
    return { 
        derivedTags: [...new Set(tags)] 
    };
};

// --- Components ---

// Universal Top Bar
const TopBar: React.FC<{
    title: string;
    onSearchChange: (val: string) => void;
    onToggleSelect: () => void;
    isSelectionMode: boolean;
    searchPlaceholder?: string;
    onBack?: () => void;
    extraAction?: React.ReactNode;
}> = ({ title, onSearchChange, onToggleSelect, isSelectionMode, searchPlaceholder = "Search...", onBack, extraAction }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isSearchOpen) {
            setQuery('');
            onSearchChange('');
        }
    }, [isSearchOpen, onSearchChange]);

    const handleSearchBlur = () => {
       if (!query) setIsSearchOpen(false);
    };

    return (
        <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur z-50 pt-safe px-4 border-b border-surfaceHighlight transition-all">
            <div className="h-14 flex items-center justify-between w-full max-w-5xl mx-auto">
                {isSearchOpen ? (
                    <div className="flex-1 flex items-center animate-fade-in">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                onSearchChange(e.target.value);
                            }}
                            onBlur={handleSearchBlur}
                            placeholder={searchPlaceholder}
                            className="w-full bg-transparent text-textMain text-lg outline-none placeholder-textMuted"
                        />
                        <button onClick={() => setIsSearchOpen(false)} className="p-2 text-textMuted hover:text-textMain">
                            <XIcon size={20} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {onBack && (
                                <button onClick={onBack} className="p-1 -ml-1 text-textMuted hover:text-textMain">
                                    <ChevronLeftIcon />
                                </button>
                            )}
                            <h1 className="text-xl font-bold text-textMain truncate">{title}</h1>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                             {extraAction}
                             <button 
                                onClick={onToggleSelect} 
                                className={`p-2 rounded-full transition-colors ${isSelectionMode ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-textMain hover:bg-surfaceHighlight'}`}
                            >
                                <SelectIcon size={22} />
                            </button>
                            <button 
                                onClick={() => setIsSearchOpen(true)} 
                                className="p-2 rounded-full text-textMuted hover:text-textMain hover:bg-surfaceHighlight transition-colors"
                            >
                                <SearchIcon size={22} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Highlighting Editor Component
const HighlightedEditor: React.FC<{
  content: string;
  onChange: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}> = ({ content, onChange, placeholder, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const renderHighlights = (text: string) => {
    if (!text) return <span className="text-textMain"> </span>; 
    const parts = text.split(/(@[\w-]+|#[\w-]+)/g);
    return parts.map((part, index) => {
        if (part.startsWith('@')) return <span key={index} className="text-blue-500 font-bold">{part}</span>;
        if (part.startsWith('#')) return <span key={index} className="text-primary font-bold">{part}</span>;
        return <span key={index} className="text-textMain">{part}</span>;
    });
  };

  const fontClasses = "font-sans text-lg leading-relaxed whitespace-pre-wrap break-words";

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
        <pre
            ref={preRef}
            aria-hidden="true"
            className={`absolute inset-0 p-5 m-0 pointer-events-none text-transparent bg-transparent overflow-hidden ${fontClasses}`}
        >
            {renderHighlights(content)}
            <br />
        </pre>
        <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`absolute inset-0 w-full h-full bg-transparent p-5 text-textMain outline-none resize-none z-10 ${fontClasses}`}
            style={{ color: 'transparent', caretColor: 'rgb(var(--color-text-main))' }} 
            autoFocus={!readOnly}
            spellCheck={false}
        />
    </div>
  );
};

// --- Editor View ---

const EditorView: React.FC<{ 
  note: Note; 
  folders: Folder[];
  folderCounts: Record<string, number>;
  onSave: (note: Note) => void; 
  onClose: () => void;
  onDelete: (id: string) => void;
  createFolder: (name: string) => Folder;
}> = ({ note, folders, folderCounts, onSave, onClose, onDelete, createFolder }) => {
  const [content, setContent] = useState(note.content);
  const [manualFolderIds, setManualFolderIds] = useState<string[]>(note.folderIds || []);
  const [manualTags, setManualTags] = useState<string[]>(note.tags || []);
  const [derivedTags, setDerivedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // State to toggle between View and Edit mode
  const [isEditing, setIsEditing] = useState(!note.content);
  
  // Folder Selector State
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [folderInputValue, setFolderInputValue] = useState('');
  const folderWrapperRef = useRef<HTMLDivElement>(null);

  // Menu & Modal State
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { derivedTags } = parseMetadataFromText(content);
    setDerivedTags(derivedTags);
  }, [content]);

  // Handle clicks outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (folderWrapperRef.current && !folderWrapperRef.current.contains(event.target as Node)) {
            setIsFolderMenuOpen(false);
        }
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setShowMenu(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const finalTags = useMemo(() => {
      return [...new Set([...manualTags, ...derivedTags])];
  }, [manualTags, derivedTags]);

  const getFolder = (id: string) => folders.find(f => f.id === id);

  const handleContentChange = (val: string) => {
    // Inline Folder Extraction Logic: matches "@folder "
    const folderMatch = val.match(/@([a-zA-Z0-9_-]+)(\s)$/); 
    
    if (folderMatch) {
        const folderName = folderMatch[1];
        const fullMatch = folderMatch[0]; 

        let targetFolder = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
        if (!targetFolder) {
            targetFolder = createFolder(folderName);
        }

        if (targetFolder && !manualFolderIds.includes(targetFolder.id)) {
            setManualFolderIds(prev => [...prev, targetFolder!.id]);
        }

        // Remove the trigger word from content
        const newContent = val.slice(0, val.lastIndexOf(fullMatch)) + val.slice(val.lastIndexOf(fullMatch) + fullMatch.length);
        setContent(newContent);
        return;
    } 

    // Inline Tag Extraction Logic: matches "#tag "
    const tagMatch = val.match(/#([a-zA-Z0-9_-]+)(\s)$/);

    if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();
        const fullMatch = tagMatch[0];

        if (!manualTags.includes(tagName)) {
            setManualTags(prev => [...prev, tagName]);
        }

        // Remove the trigger word from content
        const newContent = val.slice(0, val.lastIndexOf(fullMatch)) + val.slice(val.lastIndexOf(fullMatch) + fullMatch.length);
        setContent(newContent);
        return;
    }
    
    setContent(val);
  };

  const handleSave = () => {
    onSave({
      ...note,
      title: '', 
      content,
      folderIds: manualFolderIds,
      tags: finalTags,
      updatedAt: Date.now()
    });
    onClose();
  };

  const confirmDelete = () => {
      onDelete(note.id);
      onClose();
  };

  const sortedFolders = useMemo(() => {
      return [...folders].sort((a, b) => {
          const countA = folderCounts[a.id] || 0;
          const countB = folderCounts[b.id] || 0;
          return countB - countA;
      });
  }, [folders, folderCounts]);

  const toggleFolder = (id: string) => {
      if (!isEditing) return;
      if (manualFolderIds.includes(id)) {
          setManualFolderIds(manualFolderIds.filter(fid => fid !== id));
      } else {
          setManualFolderIds([...manualFolderIds, id]);
      }
  };

  const handleFolderInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
          e.preventDefault();
          const rawName = folderInputValue.trim();
          if (!rawName) return;

          const name = rawName.startsWith('@') ? rawName.slice(1) : rawName;
          if (!name) return;

          let targetFolder = folders.find(f => f.name.toLowerCase() === name.toLowerCase());
          if (!targetFolder) {
              targetFolder = createFolder(name);
          }

          if (!manualFolderIds.includes(targetFolder.id)) {
              setManualFolderIds([...manualFolderIds, targetFolder.id]);
          }
          setFolderInputValue('');
          setIsFolderMenuOpen(false);
      }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ',' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const val = tagInput.trim().replace(/^#/, '').toLowerCase();
          if (val && !manualTags.includes(val)) {
              setManualTags([...manualTags, val]);
          }
          setTagInput('');
      } else if (e.key === 'Backspace' && !tagInput && manualTags.length > 0) {
          setManualTags(manualTags.slice(0, -1));
      }
  };

  const removeTag = (t: string) => {
      if (!isEditing) return;
      setManualTags(manualTags.filter(tag => tag !== t));
  };

  return (
    <div className="fixed inset-0 bg-background z-[60] flex flex-col h-dvh animate-slide-up">
      {/* Top Bar for Editor - Z-Index increased to 50 to stay above folder row */}
      <div className="relative pt-safe bg-background border-b border-surfaceHighlight z-50 shadow-sm shrink-0">
        <div className="h-14 flex items-center justify-between px-4">
            <button onClick={onClose} className="p-2 -ml-2 text-textMuted hover:text-textMain">
            <ChevronLeftIcon />
            </button>
            <div className="flex items-center gap-2" ref={menuRef}>
                {isEditing && (
                    <button onClick={handleSave} className="p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30 active:bg-primary/40 transition-colors">
                        <CheckIcon size={20} />
                    </button>
                )}
                <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-surfaceHighlight text-textMain' : 'text-textMuted hover:text-textMain'}`}
                >
                    <MoreVerticalIcon size={20} />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                    <div className="absolute top-14 right-4 bg-surface border border-surfaceHighlight rounded-xl shadow-2xl z-[70] min-w-[160px] animate-fade-in overflow-hidden flex flex-col">
                        {!isEditing && (
                            <button 
                                onClick={() => {
                                    setIsEditing(true);
                                    setShowMenu(false);
                                }}
                                className="w-full text-left px-4 py-3 text-textMain hover:bg-surfaceHighlight flex items-center gap-2 transition-colors border-b border-surfaceHighlight/50"
                            >
                                <EditIcon size={18}/> <span className="font-medium text-sm">Edit Note</span>
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(content);
                                setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-textMain hover:bg-surfaceHighlight flex items-center gap-2 transition-colors border-b border-surfaceHighlight/50"
                        >
                            <CopyIcon size={18}/> <span className="font-medium text-sm">Copy Text</span>
                        </button>
                        <button 
                            onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                            className="w-full text-left px-4 py-3 text-red-400 hover:bg-surfaceHighlight flex items-center gap-2 transition-colors"
                        >
                            <TrashIcon size={18}/> <span className="font-medium text-sm">Delete Note</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative pb-safe">
          <div className="relative z-40 bg-surface/50 border-b border-surfaceHighlight shrink-0">
                {/* Row 1: Folder Input */}
                <div ref={folderWrapperRef} className="flex items-center px-4 py-2 gap-2 relative">
                    <FolderIcon size={18} className="text-textMuted shrink-0" />
                    <div className="flex-1 flex overflow-x-auto gap-2 no-scrollbar items-center">
                        {manualFolderIds.map(fid => {
                            const f = getFolder(fid);
                            if (!f) return null;
                            return (
                                <span key={fid} onClick={() => toggleFolder(fid)} className={`flex items-center gap-1 bg-surfaceHighlight text-xs px-2 py-1 rounded-full whitespace-nowrap ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                                    {f.name} {isEditing && <XIcon size={12}/>}
                                </span>
                            );
                        })}
                        {isEditing && (
                            <input 
                                type="text"
                                value={folderInputValue}
                                onFocus={() => setIsFolderMenuOpen(true)}
                                onChange={(e) => {
                                    setFolderInputValue(e.target.value);
                                    setIsFolderMenuOpen(true);
                                }}
                                onKeyDown={handleFolderInputKeyDown}
                                placeholder={manualFolderIds.length === 0 ? "Add folder..." : ""}
                                className="bg-transparent text-sm text-textMain outline-none min-w-[100px] flex-1"
                            />
                        )}
                    </div>
                    {isEditing && isFolderMenuOpen && (
                        <div className="absolute top-full left-0 right-0 max-h-40 overflow-y-auto bg-surface border-b border-surfaceHighlight shadow-lg animate-fade-in z-50">
                            {sortedFolders.filter(f => f.name.toLowerCase().includes(folderInputValue.toLowerCase())).map(f => (
                                <button 
                                    key={f.id}
                                    onClick={() => { toggleFolder(f.id); setFolderInputValue(''); setIsFolderMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-textMain hover:bg-surfaceHighlight flex justify-between items-center"
                                >
                                    <span>{f.name}</span>
                                    {manualFolderIds.includes(f.id) && <CheckIcon size={14} className="text-primary"/>}
                                </button>
                            ))}
                            {folderInputValue && !sortedFolders.some(f => f.name.toLowerCase() === folderInputValue.toLowerCase()) && (
                                <button 
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur before click
                                        const newFolder = createFolder(folderInputValue);
                                        toggleFolder(newFolder.id);
                                        setFolderInputValue('');
                                        setIsFolderMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surfaceHighlight font-medium"
                                >
                                    Create "{folderInputValue}"
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Row 2: Tag Input */}
                <div className="flex items-center px-4 py-2 gap-2 border-t border-surfaceHighlight/50">
                    <HashIcon size={18} className="text-textMuted shrink-0" />
                    <div className="flex-1 flex overflow-x-auto gap-2 no-scrollbar items-center">
                        {finalTags.map(tag => (
                            <span key={tag} className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1 ${derivedTags.includes(tag) && !manualTags.includes(tag) ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surfaceHighlight text-textMain'}`}>
                                #{tag}
                                {isEditing && manualTags.includes(tag) && (
                                    <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-400"><XIcon size={12}/></button>
                                )}
                            </span>
                        ))}
                        {isEditing && (
                             <input 
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder={finalTags.length === 0 ? "Add tags..." : ""}
                                className="bg-transparent text-sm text-textMain outline-none min-w-[80px] flex-1"
                            />
                        )}
                    </div>
                </div>
          </div>
          
          <div className="flex-1 relative">
            <HighlightedEditor 
                content={content} 
                onChange={handleContentChange} 
                placeholder={isEditing ? "Start typing... use @folder or #tag" : ""}
                readOnly={!isEditing}
            />
          </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
             <div className="bg-surface border border-surfaceHighlight rounded-2xl p-6 w-full max-w-xs shadow-2xl transform transition-all scale-100">
                <h3 className="text-lg font-bold text-textMain mb-2">Delete Note?</h3>
                <p className="text-textMuted mb-6 text-sm">This note will be moved to trash. You can restore it later.</p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-4 py-3 rounded-xl bg-surfaceHighlight text-textMain font-medium hover:bg-surfaceHighlight/80 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
                    >
                        Delete
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const { notes, folders, theme, saveNote, deleteNote, restoreNote, permanentlyDeleteNote, emptyTrash, createFolder, deleteFolder, clearAllData, saveTheme } = useStorage();
  
  const [view, setView] = useState<ViewState>('home');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const activeNote = activeNoteId ? notes.find(n => n.id === activeNoteId) : null;

  const folderCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      notes.forEach(n => {
          if (!n.isDeleted) {
              n.folderIds.forEach(fid => {
                  counts[fid] = (counts[fid] || 0) + 1;
              });
          }
      });
      return counts;
  }, [notes]);

  const toggleSelection = (id: string) => {
      if (selectedNoteIds.includes(id)) {
          setSelectedNoteIds(selectedNoteIds.filter(nid => nid !== id));
      } else {
          setSelectedNoteIds([...selectedNoteIds, id]);
      }
  };

  const handleBulkDelete = () => {
      if (window.confirm(`Delete ${selectedNoteIds.length} notes?`)) {
          selectedNoteIds.forEach(id => deleteNote(id));
          setSelectedNoteIds([]);
          setIsSelectionMode(false);
      }
  };

  const filteredNotes = useMemo(() => {
      let filtered = notes.filter(n => !n.isDeleted);
      
      if (view === 'folders' && activeFolderId) {
          filtered = filtered.filter(n => n.folderIds.includes(activeFolderId));
      } else if (view === 'tags' && activeTag) {
          filtered = filtered.filter(n => n.tags.includes(activeTag));
      }

      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(n => n.content.toLowerCase().includes(q) || (n.summary && n.summary.toLowerCase().includes(q)));
      }

      return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, view, activeFolderId, activeTag, searchQuery]);

  const trashNotes = useMemo(() => notes.filter(n => n.isDeleted).sort((a, b) => b.updatedAt - a.updatedAt), [notes]);

  const createNewNote = () => {
      const newNote: Note = {
          id: crypto.randomUUID(),
          title: '',
          content: '',
          folderIds: view === 'folders' && activeFolderId ? [activeFolderId] : [],
          tags: view === 'tags' && activeTag ? [activeTag] : [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDeleted: false
      };
      saveNote(newNote);
      setActiveNoteId(newNote.id);
  };

  // --- Render Views ---

  if (activeNote) {
      return (
          <EditorView 
            note={activeNote}
            folders={folders}
            folderCounts={folderCounts}
            onSave={saveNote}
            onClose={() => setActiveNoteId(null)}
            onDelete={(id) => { deleteNote(id); setActiveNoteId(null); }}
            createFolder={createFolder}
          />
      );
  }

  const renderContent = () => {
      if (view === 'settings') {
          return (
              <div className="p-4 space-y-6 pt-20 pb-24">
                  <div className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-surfaceHighlight">
                          <h3 className="font-semibold text-textMain">Appearance</h3>
                      </div>
                      <div className="p-4 flex gap-2">
                          {(['light', 'dark', 'black', 'system'] as Theme[]).map(t => (
                              <button 
                                key={t}
                                onClick={() => saveTheme(t)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${theme === t ? 'bg-primary text-white border-primary' : 'bg-background text-textMuted border-surfaceHighlight hover:border-textMuted'}`}
                              >
                                {t}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden">
                      <button onClick={() => setView('trash')} className="w-full flex items-center justify-between p-4 hover:bg-surfaceHighlight transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                  <TrashIcon size={20} />
                              </div>
                              <div className="text-left">
                                  <div className="text-textMain font-medium">Trash</div>
                                  <div className="text-textMuted text-xs">{trashNotes.length} deleted notes</div>
                              </div>
                          </div>
                          <ChevronLeftIcon className="rotate-180 text-textMuted" />
                      </button>
                  </div>

                  <div className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden">
                       <button onClick={() => { if(window.confirm("Clear all data?")) clearAllData(); }} className="w-full text-left p-4 text-red-500 hover:bg-surfaceHighlight transition-colors font-medium">
                           Reset App Data
                       </button>
                  </div>
              </div>
          );
      }

      if (view === 'trash') {
          return (
             <div className="pb-24 pt-20 px-4">
                 <div className="flex justify-between items-center mb-4">
                     <h2 className="text-textMuted text-sm font-medium">Deleted Notes ({trashNotes.length})</h2>
                     {trashNotes.length > 0 && (
                         <button onClick={emptyTrash} className="text-red-500 text-sm hover:underline">Empty Trash</button>
                     )}
                 </div>
                 {trashNotes.length === 0 ? (
                     <div className="text-center text-textMuted mt-20">Trash is empty</div>
                 ) : (
                     <div className="space-y-3">
                         {trashNotes.map(note => (
                             <div key={note.id} className="bg-surface border border-surfaceHighlight p-4 rounded-xl flex justify-between items-start">
                                 <p className="text-textMain line-clamp-2 text-sm flex-1 mr-4 opacity-70">{note.content || "Empty"}</p>
                                 <div className="flex flex-col gap-2">
                                     <button onClick={() => restoreNote(note.id)} className="p-2 text-primary hover:bg-primary/10 rounded-full"><RestoreIcon size={18}/></button>
                                     <button onClick={() => permanentlyDeleteNote(note.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><XIcon size={18}/></button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
          );
      }

      // Default List View (Home/Folders/Tags)
      if (view === 'folders' && !activeFolderId) {
          return (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-4 p-4 pt-20 pb-24 max-w-5xl mx-auto">
                  {folders.map(folder => (
                      <button 
                        key={folder.id} 
                        onClick={() => setActiveFolderId(folder.id)}
                        className="flex flex-col items-center justify-start gap-2 p-2 rounded-xl hover:bg-surfaceHighlight/50 transition-colors group text-center"
                      >
                          <div className="relative">
                            <FolderIcon size={56} fill="currentColor" className="text-amber-400 opacity-90 group-hover:opacity-100 transition-opacity" />
                            <span className="absolute -top-1 -right-1 bg-surfaceHighlight border border-background text-[10px] text-textMuted px-1.5 rounded-full shadow-sm">
                                {folderCounts[folder.id] || 0}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-textMain line-clamp-2 w-full break-words leading-tight">
                              {folder.name}
                          </span>
                      </button>
                  ))}
                  <button 
                    onClick={() => {
                        const name = prompt("New Folder Name:");
                        if (name) createFolder(name);
                    }}
                    className="flex flex-col items-center justify-start gap-2 p-2 rounded-xl hover:bg-surfaceHighlight/50 transition-colors text-textMuted hover:text-primary group"
                  >
                      <div className="w-14 h-14 flex items-center justify-center border-2 border-dashed border-surfaceHighlight rounded-xl group-hover:border-primary/50 transition-colors">
                        <PlusIcon size={24} />
                      </div>
                      <span className="text-xs font-medium">New Folder</span>
                  </button>
              </div>
          );
      }

      if (view === 'tags' && !activeTag) {
           const allTags = Array.from(new Set(notes.filter(n => !n.isDeleted).flatMap(n => n.tags)));
           return (
               <div className="p-4 pt-20 pb-24 max-w-5xl mx-auto">
                   <div className="flex flex-wrap gap-2">
                       {allTags.map(tag => (
                           <button 
                                key={tag} 
                                onClick={() => setActiveTag(tag)}
                                className="px-4 py-3 bg-surface border border-surfaceHighlight rounded-xl text-textMain hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                           >
                               <HashIcon size={16} className="text-textMuted" />
                               {tag}
                               <span className="bg-surfaceHighlight px-1.5 py-0.5 rounded-md text-[10px] text-textMuted">
                                   {notes.filter(n => !n.isDeleted && n.tags.includes(tag)).length}
                               </span>
                           </button>
                       ))}
                   </div>
               </div>
           );
      }

      return (
          <div className="p-4 pt-20 pb-24 space-y-3 min-h-screen max-w-5xl mx-auto">
              {activeFolderId && (
                  <div className="flex items-center gap-2 text-sm text-textMuted mb-2">
                      <FolderIcon size={14} /> 
                      <span>{folders.find(f => f.id === activeFolderId)?.name}</span>
                      <button onClick={() => setActiveFolderId(null)} className="p-1 hover:text-textMain"><XIcon size={12}/></button>
                  </div>
              )}
              {activeTag && (
                  <div className="flex items-center gap-2 text-sm text-textMuted mb-2">
                      <HashIcon size={14} /> 
                      <span>#{activeTag}</span>
                      <button onClick={() => setActiveTag(null)} className="p-1 hover:text-textMain"><XIcon size={12}/></button>
                  </div>
              )}
              
              {filteredNotes.length === 0 ? (
                  <div className="text-center mt-20">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surfaceHighlight text-textMuted mb-4">
                          <SearchIcon size={24} />
                      </div>
                      <p className="text-textMuted">No notes found</p>
                  </div>
              ) : (
                filteredNotes.map(note => (
                    <NoteCard 
                        key={note.id} 
                        note={note} 
                        onClick={(n) => {
                            if (isSelectionMode) toggleSelection(n.id);
                            else setActiveNoteId(n.id);
                        }}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedNoteIds.includes(note.id)}
                    />
                ))
              )}
          </div>
      );
  };

  const getTitle = () => {
      if (view === 'settings') return 'Settings';
      if (view === 'folders') return activeFolderId ? folders.find(f => f.id === activeFolderId)?.name || 'Folder' : 'Folders';
      if (view === 'tags') return activeTag ? `#${activeTag}` : 'Tags';
      if (view === 'trash') return 'Trash';
      return 'Sanchita Notes';
  };

  const PlusIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );

  return (
    <div className="min-h-screen bg-background text-textMain font-sans selection:bg-primary/30">
        <TopBar 
            title={getTitle()}
            onSearchChange={setSearchQuery}
            onToggleSelect={() => setIsSelectionMode(!isSelectionMode)}
            isSelectionMode={isSelectionMode}
            onBack={
                (view === 'folders' && activeFolderId) ? () => setActiveFolderId(null) :
                (view === 'tags' && activeTag) ? () => setActiveTag(null) :
                (view === 'trash') ? () => setView('settings') :
                undefined
            }
            extraAction={isSelectionMode && selectedNoteIds.length > 0 && (
                <button onClick={handleBulkDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors mr-2">
                    <TrashIcon size={20} />
                </button>
            )}
        />

        {renderContent()}

        {!activeNoteId && view !== 'editor' && (
            <BottomNav 
                activeTab={view === 'trash' ? 'settings' : view} 
                onTabChange={(t) => {
                    setView(t);
                    setActiveFolderId(null);
                    setActiveTag(null);
                    setIsSelectionMode(false);
                }} 
                onAddClick={createNewNote}
            />
        )}
    </div>
  );
};

export default App;