'use client';

import { LayoutDashboard, Receipt, MessageSquare, Users } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Sales', Icon: LayoutDashboard },
  { id: 'chats', label: 'Chats', Icon: MessageSquare },
  { id: 'agents', label: 'Agents ', Icon: Users },
  { id: 'pnl', label: 'P&L', Icon: Receipt },
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
          const Icon = tab.Icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-base transition-colors mb-1 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

