import React from 'react';
import { ScanText, Database } from 'lucide-react';

export type ActiveTab = 'intake' | 'records';

interface TabNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
      <button
        type="button"
        onClick={() => setActiveTab('intake')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          activeTab === 'intake'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50 font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <ScanText className="w-4 h-4" />
        <span>AI Form Scanner</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('records')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          activeTab === 'records'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50 font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <Database className="w-4 h-4" />
        <span>Patient Records Registry</span>
      </button>
    </div>
  );
};

export default TabNavigation;