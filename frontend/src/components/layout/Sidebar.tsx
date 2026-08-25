import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Crosshair,
  History,
  Activity,
  ShieldAlert,
  HelpCircle,
  FileCode2,
  Sliders,
  Database
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatPercent } from '../../utils/geoAnalytics';

export const Sidebar: React.FC = () => {
  const { prediction, selectedRegionName } = useApp();

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Risk Map', path: '/map', icon: Map },
    { name: 'Location Check', path: '/assessment', icon: Crosshair },
    { name: 'Past Landslides', path: '/history', icon: History },
    { name: 'What the System Sees', path: '/observations', icon: Activity },
    { name: 'Data Coverage', path: '/coverage', icon: Database },
    { name: 'How It Works', path: '/model', icon: HelpCircle },
    { name: 'What-If Scenarios', path: '/scenarios', icon: Sliders },
    { name: 'High-Risk Areas', path: '/alerts', icon: ShieldAlert },
    { name: 'System Pipeline', path: '/methodology', icon: FileCode2 },
  ];

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-950/80 border border-red-800';
      case 'HIGH':
        return 'text-orange-400 bg-orange-950/80 border border-orange-800';
      case 'MODERATE':
        return 'text-amber-400 bg-amber-950/80 border border-amber-800';
      default:
        return 'text-emerald-400 bg-emerald-950/80 border border-emerald-800';
    }
  };

  return (
    <aside className="w-52 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 select-none z-20">
      {/* Navigation Links */}
      <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
        <div className="text-[9px] font-mono font-medium uppercase tracking-wider text-slate-500 px-3 py-1.5">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs transition font-medium ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Selected Location Footer HUD */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs space-y-1 font-mono">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">
          Selected Location
        </div>
        <div className="text-slate-200 font-bold truncate text-[11px]" title={selectedRegionName}>
          {selectedRegionName}
        </div>
        {prediction && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-850 text-[10px]">
            <span className="text-slate-400">
              {formatPercent(prediction.landslide_probability, 1)} Risk
            </span>
            <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${getRiskBadge(prediction.risk_level)}`}>
              {prediction.risk_level}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
