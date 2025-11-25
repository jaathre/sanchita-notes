
import React from 'react';
import { HomeIcon, FolderIcon, PlusIcon, HashIcon, SettingsIcon } from './Icons';
import { ViewState } from '../types';

interface BottomNavProps {
  activeTab: ViewState;
  onTabChange: (tab: ViewState) => void;
  onAddClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onAddClick }) => {
  
  const NavItem = ({ tab, icon: Icon, label }: { tab: ViewState, icon: any, label: string }) => {
    const isActive = activeTab === tab;
    return (
      <button 
        onClick={() => onTabChange(tab)}
        className={`flex flex-col items-center justify-center w-16 h-14 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-textMuted hover:text-textMain'}`}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-surfaceHighlight pb-safe pt-1 px-4 pb-2 z-50">
      <div className="flex items-center justify-between max-w-lg mx-auto relative">
        <NavItem tab="home" icon={HomeIcon} label="Home" />
        <NavItem tab="folders" icon={FolderIcon} label="Folders" />
        
        {/* Floating Plus Button Wrapper */}
        <div className="relative -top-5">
            <button 
                onClick={onAddClick}
                className="bg-primary hover:bg-primaryHover text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-primary/30 transform transition-transform active:scale-95"
            >
                <PlusIcon size={28} strokeWidth={3} />
            </button>
        </div>

        <NavItem tab="tags" icon={HashIcon} label="Tags" />
        <NavItem tab="settings" icon={SettingsIcon} label="Settings" />
      </div>
    </div>
  );
};

export default BottomNav;
