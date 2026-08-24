import React from 'react';
import { 
  Home, 
  Compass, 
  Layers, 
  Waypoints, 
  Box, 
  ShieldCheck, 
  Zap, 
  Radio, 
  Table, 
  Presentation, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  Cpu,
  Waves
} from 'lucide-react';

interface SidebarProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onStartPresentation: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onNavigate,
  collapsed,
  onToggleCollapse,
  onStartPresentation
}) => {
  const navSections = [
    {
      title: "Core Explorers",
      items: [
        { id: 'landing', label: 'Lab Home', icon: Home },
        { id: 'field_explorer', label: 'Field Explorer', icon: Compass },
        { id: 'vector_calculus', label: 'Vector Calculus', icon: Activity },
      ]
    },
    {
      title: "Vector Integrals",
      items: [
        { id: 'line_integral', label: 'Line Integral ∫', icon: Waypoints },
        { id: 'surface_integral', label: 'Surface Integral ∬', icon: Layers },
        { id: 'volume_integral', label: 'Volume Integral ∭', icon: Box },
      ]
    },
    {
      title: "Integral Theorems",
      items: [
        { id: 'greens', label: "Green's Theorem", icon: ShieldCheck, badge: "2D" },
        { id: 'gauss', label: "Gauss' Theorem", icon: ShieldCheck, badge: "3D Flux" },
        { id: 'stokes', label: "Stokes' Theorem", icon: ShieldCheck, badge: "3D Curl" },
        { id: 'comparison', label: 'Theorem Matrix', icon: Table },
      ]
    },
    {
      title: "Electromagnetic Physics",
      items: [
        { id: 'electric', label: 'Electric Field & Gauss', icon: Zap },
        { id: 'magnetic', label: 'Magnetic Field & Ampère', icon: Compass },
        { id: 'emwave', label: 'EM Wave & Poynting', icon: Waves },
      ]
    }
  ];

  return (
    <aside
      className={`glass-panel border-r border-cyan-500/20 flex flex-col justify-between transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Logo & Collapse Toggle */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-cyan-500/20">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="leading-tight truncate">
                <div className="text-xs font-orbitron font-bold text-white tracking-wide">VECTOR LAB</div>
                <div className="text-[10px] font-mono text-cyan-400">APPLIED MATH</div>
              </div>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 mx-auto"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Item Lists */}
        <div className="p-2 space-y-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {!collapsed && (
                <div className="px-3 mb-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-cyan-300'}`} />
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 border border-slate-700">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Presentation Mode Quick Launch */}
      <div className="p-3 border-t border-cyan-500/20">
        <button
          onClick={onStartPresentation}
          className={`w-full py-2.5 rounded-xl btn-purple text-xs font-orbitron font-semibold flex items-center justify-center gap-2 cursor-pointer ${
            collapsed ? 'px-0' : 'px-3'
          }`}
          title="Launch Presentation Mode"
        >
          <Presentation className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Presentation</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
