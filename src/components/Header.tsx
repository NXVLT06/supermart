import React from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  Presentation, 
  Maximize2, 
  Minimize2, 
  GraduationCap, 
  Gauge, 
  Menu,
  BookOpen
} from 'lucide-react';

export type LearningLevel = 'beginner' | 'learning' | 'advanced';
export type QualityLevel = 'low' | 'medium' | 'high';

interface HeaderProps {
  onToggleSidebarMobile: () => void;
  learningMode: LearningLevel;
  onChangeLearningMode: (mode: LearningLevel) => void;
  quality: QualityLevel;
  onChangeQuality: (q: QualityLevel) => void;
  onStartPresentation: () => void;
  onOpenTutorial: () => void;
  currentModuleName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebarMobile,
  learningMode,
  onChangeLearningMode,
  quality,
  onChangeQuality,
  onStartPresentation,
  onOpenTutorial,
  currentModuleName
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 glass-panel border-b border-cyan-500/20 flex items-center justify-between z-20">
      {/* Left: Mobile Menu & Current Module Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebarMobile}
          className="p-2 rounded-lg lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
          <div>
            <h2 className="text-sm font-orbitron font-bold text-white tracking-wide truncate max-w-xs sm:max-w-md">
              {currentModuleName}
            </h2>
            <div className="text-[10px] font-mono text-slate-400 hidden sm:block">
              Applied Math • Vector Integral Theorems & EM Physics
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls: Learning Mode, Quality, Tutorial, Fullscreen */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Learning Mode Switcher */}
        <div className="hidden md:flex items-center p-1 glass-panel rounded-lg border-slate-800 text-xs font-mono">
          <GraduationCap className="w-3.5 h-3.5 text-cyan-400 ml-1 mr-1.5" />
          {(['beginner', 'learning', 'advanced'] as LearningLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => onChangeLearningMode(lvl)}
              className={`px-2.5 py-1 rounded capitalize transition-all ${
                learningMode === lvl
                  ? 'bg-cyan-500/30 text-cyan-300 font-semibold border border-cyan-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Quality Switcher */}
        <div className="hidden sm:flex items-center p-1 glass-panel rounded-lg border-slate-800 text-xs font-mono">
          <Gauge className="w-3.5 h-3.5 text-purple-400 ml-1 mr-1.5" />
          {(['low', 'medium', 'high'] as QualityLevel[]).map((q) => (
            <button
              key={q}
              onClick={() => onChangeQuality(q)}
              className={`px-2 py-0.5 rounded uppercase text-[10px] transition-all ${
                quality === q
                  ? 'bg-purple-500/30 text-purple-300 font-semibold border border-purple-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Tutorial Button */}
        <button
          onClick={onOpenTutorial}
          className="p-2 rounded-lg glass-panel hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors"
          title="Open First-Launch Tutorial Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Presentation Mode Button */}
        <button
          onClick={onStartPresentation}
          className="hidden sm:flex btn-purple px-3 py-1.5 rounded-lg text-xs font-orbitron font-semibold items-center gap-1.5 cursor-pointer"
          title="Presentation Mode"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>Deck</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg glass-panel hover:border-cyan-400 text-slate-300 hover:text-white transition-colors"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
