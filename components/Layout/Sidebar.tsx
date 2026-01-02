
import React from 'react';
import { LayoutDashboard, Users, Settings, LogOut, Utensils, Music, UserCheck } from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentRole, onRoleChange, activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'floor', label: 'Floor', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Utensils },
    { id: 'ktv', label: 'KTV', icon: Music },
    { id: 'admin', label: 'Admin', icon: Settings, roles: [UserRole.ADMIN] },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-slate-900 h-screen fixed left-0 top-0 flex-col text-slate-300 z-50">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm">LX</span>
            LUXE Resto-KTV
          </h1>
        </div>
        
        <div className="flex-1 py-6 overflow-y-auto">
          <div className="px-4 mb-6">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">Role Select</label>
            <select 
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="w-full mt-2 bg-slate-800 border-none rounded-md py-2 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500"
            >
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>{role.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <nav className="px-4 space-y-1">
            {navItems.filter(item => !item.roles || item.roles.includes(currentRole)).map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-400">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-20 px-6 flex items-center justify-between z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.filter(item => !item.roles || item.roles.includes(currentRole)).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <item.icon size={22} className={activeTab === item.id ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
        {/* Mobile Quick Role Toggle */}
        <div className="relative group">
          <select 
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          >
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{role.replace('_', ' ')}</option>
            ))}
          </select>
          <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
            <UserCheck size={22} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Role</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
