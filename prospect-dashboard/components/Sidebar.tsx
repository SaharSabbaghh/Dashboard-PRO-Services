'use client';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'upload', label: 'Upload', icon: '↑' },
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'pnl', label: 'P&L', icon: '📊' },
  { id: 'costs', label: 'Costs', icon: '$' },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-56 bg-white border-r border-slate-200 min-h-screen">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img 
            src="https://maids.cc/favicon.ico" 
            alt="maids.cc" 
            className="w-12 h-12 rounded-lg"
          />
          <div>
            <h1 className="text-lg font-bold text-slate-800">PRO Services</h1>
            <p className="text-sm text-slate-400">maids.cc</p>
          </div>
        </div>
      </div>
      
      <nav className="p-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

