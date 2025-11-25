
import React from 'react';
import { Note } from '../types';
import { CheckCircleIcon, CircleIcon } from './Icons';

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, isSelectionMode, isSelected }) => {
  return (
    <div 
      onClick={() => onClick(note)}
      className={`relative bg-surface p-5 rounded-xl border mb-3 transition-all cursor-pointer group
        ${isSelected 
            ? 'border-primary bg-primary/5' 
            : 'border-surfaceHighlight hover:border-primary/50 active:bg-surfaceHighlight'
        }`}
    >
      {isSelectionMode && (
         <div className="absolute top-4 right-4 z-10">
             {isSelected ? (
                 <CheckCircleIcon size={22} className="text-primary" />
             ) : (
                 <CircleIcon size={22} className="text-textMuted" />
             )}
         </div>
      )}

      {/* Content Preview only */}
      <p className={`text-textMain text-base leading-relaxed line-clamp-3 ${isSelectionMode ? 'pr-8' : ''}`}>
        {note.content || <span className="italic opacity-50">Empty note</span>}
      </p>
    </div>
  );
};

export default NoteCard;
