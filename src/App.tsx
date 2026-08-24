import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header, { LearningLevel, QualityLevel } from './components/Header';
import LandingPage from './views/LandingPage';
import FieldExplorerView from './views/FieldExplorerView';
import VectorCalculusView from './views/VectorCalculusView';
import LineIntegralView from './views/LineIntegralView';
import SurfaceIntegralView from './views/SurfaceIntegralView';
import VolumeIntegralView from './views/VolumeIntegralView';
import GreensTheoremView from './views/GreensTheoremView';
import GaussTheoremView from './views/GaussTheoremView';
import StokesTheoremView from './views/StokesTheoremView';
import TheoremComparisonView from './views/TheoremComparisonView';
import ElectricFieldView from './views/ElectricFieldView';
import MagneticFieldView from './views/MagneticFieldView';
import EMWaveView from './views/EMWaveView';
import PresentationMode from './components/PresentationMode';
import TutorialModal from './components/TutorialModal';

export const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<string>('landing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [learningMode, setLearningMode] = useState<LearningLevel>('learning');
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Auto-launch tutorial on first launch
  useEffect(() => {
    const seen = localStorage.getItem('em_lab_tutorial_seen');
    if (!seen) {
      setIsTutorialOpen(true);
    }
  }, []);

  const getModuleName = (id: string) => {
    switch (id) {
      case 'landing': return 'Electromagnetic Laboratory Home';
      case 'field_explorer': return '3D Vector Field Explorer';
      case 'vector_calculus': return 'Vector Calculus Lab (Gradient, Div, Curl)';
      case 'line_integral': return 'Line Integral ∫C F·dr & Work';
      case 'surface_integral': return 'Surface Integral ∬S F·n̂ dS & Flux';
      case 'volume_integral': return 'Volume Integral ∭V f dV & Densities';
      case 'greens': return "Green's Theorem Verification Engine";
      case 'gauss': return "Gauss' Divergence Theorem Verification Engine";
      case 'stokes': return "Stokes' Theorem Verification Engine";
      case 'comparison': return "Unified Theorem Matrix & Maxwell's Equations";
      case 'electric': return "Electric Field & Coulomb / Gauss's Law";
      case 'magnetic': return "Magnetic Field & Biot-Savart / Ampère's Law";
      case 'emwave': return "Electromagnetic Wave & Poynting Vector";
      default: return 'Vector Calculus Lab';
    }
  };

  const renderActiveView = () => {
    switch (currentModule) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={(mod) => setCurrentModule(mod)}
            onStartPresentation={() => setIsPresentationOpen(true)}
          />
        );
      case 'field_explorer':
        return <FieldExplorerView />;
      case 'vector_calculus':
        return <VectorCalculusView />;
      case 'line_integral':
        return <LineIntegralView />;
      case 'surface_integral':
        return <SurfaceIntegralView />;
      case 'volume_integral':
        return <VolumeIntegralView />;
      case 'greens':
        return <GreensTheoremView />;
      case 'gauss':
        return <GaussTheoremView />;
      case 'stokes':
        return <StokesTheoremView />;
      case 'comparison':
        return <TheoremComparisonView onNavigate={(mod) => setCurrentModule(mod)} />;
      case 'electric':
        return <ElectricFieldView />;
      case 'magnetic':
        return <MagneticFieldView />;
      case 'emwave':
        return <EMWaveView />;
      default:
        return <LandingPage onNavigate={(mod) => setCurrentModule(mod)} onStartPresentation={() => setIsPresentationOpen(true)} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#030712] text-slate-100 overflow-hidden select-none">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar
          currentModule={currentModule}
          onNavigate={(mod) => setCurrentModule(mod)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onStartPresentation={() => setIsPresentationOpen(true)}
        />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50 h-full w-72">
            <Sidebar
              currentModule={currentModule}
              onNavigate={(mod) => {
                setCurrentModule(mod);
                setMobileSidebarOpen(false);
              }}
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
              onStartPresentation={() => {
                setMobileSidebarOpen(false);
                setIsPresentationOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          onToggleSidebarMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          learningMode={learningMode}
          onChangeLearningMode={(lvl) => setLearningMode(lvl)}
          quality={quality}
          onChangeQuality={(q) => setQuality(q)}
          onStartPresentation={() => setIsPresentationOpen(true)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          currentModuleName={getModuleName(currentModule)}
        />

        {/* View container */}
        <main className="flex-1 overflow-y-auto relative cyber-grid">
          {renderActiveView()}
        </main>
      </div>

      {/* Presentation Mode Fullscreen Deck */}
      {isPresentationOpen && (
        <PresentationMode
          onClose={() => setIsPresentationOpen(false)}
          onNavigateModule={(mod) => {
            setIsPresentationOpen(false);
            setCurrentModule(mod);
          }}
        />
      )}

      {/* Interactive First Launch Tutorial Guide */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
};

export default App;
