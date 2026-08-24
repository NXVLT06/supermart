import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Camera, Eye, RefreshCw, ZoomIn, ZoomOut, Maximize2, Sparkles, Layers } from 'lucide-react';

export type CameraPreset = 'isometric' | 'top' | 'front' | 'side' | 'reset';

interface ThreeViewportProps {
  onSetup?: (scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => void;
  onAnimate?: (delta: number, time: number, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
  onCleanup?: () => void;
  showAxes?: boolean;
  showGrid?: boolean;
  quality?: 'low' | 'medium' | 'high';
  className?: string;
  overlayControls?: React.ReactNode;
  hudInfo?: {
    fieldTitle?: string;
    magnitude?: string;
    particleCount?: number;
    vectorCount?: number;
    status?: string;
  };
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  onSetup,
  onAnimate,
  onCleanup,
  showAxes = true,
  showGrid = true,
  quality = 'high',
  className = '',
  overlayControls,
  hudInfo
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });
  const isRightDragRef = useRef(false);

  const [fps, setFps] = useState(60);
  const [activeView, setActiveView] = useState<CameraPreset>('isometric');

  // Camera spherical coordinates for smooth manual orbit controls
  const sphericalRef = useRef({
    radius: 9.0,
    theta: Math.PI / 4, // azimuth
    phi: Math.PI / 3,   // polar angle
    target: new THREE.Vector3(0, 0, 0)
  });

  const updateCameraFromSpherical = () => {
    if (!cameraRef.current) return;
    const s = sphericalRef.current;
    // clamp phi
    s.phi = Math.max(0.05, Math.min(Math.PI - 0.05, s.phi));
    s.radius = Math.max(1.5, Math.min(30, s.radius));

    const x = s.target.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta);
    const y = s.target.y + s.radius * Math.cos(s.phi);
    const z = s.target.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(s.target);
  };

  const setCameraPreset = (preset: CameraPreset) => {
    setActiveView(preset);
    const s = sphericalRef.current;
    s.target.set(0, 0, 0);

    switch (preset) {
      case 'isometric':
        s.radius = 9.0;
        s.theta = Math.PI / 4;
        s.phi = Math.PI / 3;
        break;
      case 'top':
        s.radius = 9.0;
        s.theta = 0;
        s.phi = 0.05;
        break;
      case 'front':
        s.radius = 9.0;
        s.theta = 0;
        s.phi = Math.PI / 2;
        break;
      case 'side':
        s.radius = 9.0;
        s.theta = Math.PI / 2;
        s.phi = Math.PI / 2;
        break;
      case 'reset':
        s.radius = 9.0;
        s.theta = Math.PI / 4;
        s.phi = Math.PI / 3;
        break;
    }
    updateCameraFromSpherical();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.025);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraFromSpherical();

    // 3. Renderer
    const pixelRatio = quality === 'high' ? Math.min(window.devicePixelRatio, 2) : quality === 'medium' ? 1.25 : 1.0;
    const renderer = new THREE.WebGLRenderer({
      antialias: quality !== 'low',
      powerPreference: 'high-performance',
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 1.2);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.0);
    dirLight2.position.set(-5, -8, -5);
    scene.add(dirLight2);

    // 5. Grid Helper
    if (showGrid) {
      const grid = new THREE.GridHelper(12, 24, 0x00f0ff, 0x1e293b);
      grid.position.y = -0.01;
      scene.add(grid);
    }

    // 6. 3D Glowing Axes
    if (showAxes) {
      const axesGroup = new THREE.Group();
      const createAxis = (dir: THREE.Vector3, colorHex: number, label: string) => {
        const lineMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2, transparent: true, opacity: 0.85 });
        const points = [new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(4.5)];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geom, lineMat);

        const coneGeom = new THREE.ConeGeometry(0.12, 0.35, 16);
        const coneMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.2, metalness: 0.8 });
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.copy(dir.clone().multiplyScalar(4.5));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        axesGroup.add(line);
        axesGroup.add(cone);
      };

      createAxis(new THREE.Vector3(1, 0, 0), 0xef4444, 'X'); // Red X
      createAxis(new THREE.Vector3(0, 1, 0), 0x22c55e, 'Y'); // Green Y
      createAxis(new THREE.Vector3(0, 0, 1), 0x3b82f6, 'Z'); // Blue Z
      scene.add(axesGroup);
    }

    // Setup Callback
    if (onSetup) {
      onSetup(scene, camera, renderer);
    }

    // Animation Loop & FPS calculation
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      frameCount++;
      if (time - lastFpsUpdate >= 500) {
        setFps(Math.round((frameCount * 1000) / (time - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = time;
      }

      if (onAnimate && sceneRef.current && cameraRef.current) {
        onAnimate(delta, time / 1000, sceneRef.current, cameraRef.current);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      if (onCleanup) onCleanup();
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, [showAxes, showGrid, quality]);

  // Pointer & Touch Controls for Orbit/Pan/Zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    isRightDragRef.current = e.button === 2;
    previousMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePosRef.current.x;
    const deltaY = e.clientY - previousMousePosRef.current.y;
    previousMousePosRef.current = { x: e.clientX, y: e.clientY };

    const s = sphericalRef.current;
    if (isRightDragRef.current || e.shiftKey) {
      // Pan
      const panSpeed = 0.006 * s.radius;
      if (cameraRef.current) {
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        cameraRef.current.getWorldDirection(right);
        right.cross(up).normalize();
        s.target.addScaledVector(right, -deltaX * panSpeed);
        s.target.y += deltaY * panSpeed;
      }
    } else {
      // Orbit
      const rotateSpeed = 0.007;
      s.theta -= deltaX * rotateSpeed;
      s.phi -= deltaY * rotateSpeed;
    }
    updateCameraFromSpherical();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1 + e.deltaY * 0.001;
    sphericalRef.current.radius *= zoomFactor;
    updateCameraFromSpherical();
  };

  // Touch Handling for Mobile/Tablet
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx * dx + dy * dy)
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      const s = sphericalRef.current;
      s.theta -= deltaX * 0.008;
      s.phi -= deltaY * 0.008;
      updateCameraFromSpherical();
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = touchStartRef.current.dist / dist;
      sphericalRef.current.radius *= ratio;
      touchStartRef.current.dist = dist;
      updateCameraFromSpherical();
    }
  };

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-xl bg-slate-950/80 border border-cyan-500/20 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Scientific HUD Top Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        {/* Left HUD: Title & Telemetry */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-cyan-300 font-semibold">{hudInfo?.fieldTitle || '3D LAB RENDERER'}</span>
            {hudInfo?.magnitude && (
              <span className="text-slate-400 border-l border-slate-700 pl-2">
                |F|: <span className="text-emerald-400 font-semibold">{hudInfo.magnitude}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right HUD: Performance & Counters */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-3 text-xs font-mono text-slate-300">
            {hudInfo?.vectorCount !== undefined && (
              <span title="Vector Arrows Count">
                Vectors: <span className="text-cyan-400">{hudInfo.vectorCount}</span>
              </span>
            )}
            {hudInfo?.particleCount !== undefined && (
              <span title="Active Flow Particles">
                Particles: <span className="text-purple-400">{hudInfo.particleCount}</span>
              </span>
            )}
            <span className="border-l border-slate-700 pl-2" title="Frames Per Second">
              FPS: <span className={fps >= 50 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-red-400'}>{fps}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Camera View Controls Quick Toolbar */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 p-1 glass-panel rounded-lg z-10 pointer-events-auto">
        <button
          onClick={() => setCameraPreset('isometric')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            activeView === 'isometric' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'text-slate-400 hover:text-white'
          }`}
          title="Isometric View (3D)"
        >
          3D ISO
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            activeView === 'top' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'text-slate-400 hover:text-white'
          }`}
          title="Top Down (XY Plane)"
        >
          TOP
        </button>
        <button
          onClick={() => setCameraPreset('front')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            activeView === 'front' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'text-slate-400 hover:text-white'
          }`}
          title="Front View (XZ Plane)"
        >
          FRONT
        </button>
        <button
          onClick={() => setCameraPreset('side')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            activeView === 'side' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' : 'text-slate-400 hover:text-white'
          }`}
          title="Side View (YZ Plane)"
        >
          SIDE
        </button>
        <button
          onClick={() => setCameraPreset('reset')}
          className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors"
          title="Reset Camera Target"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Optional Overlay Custom Controls Slot */}
      {overlayControls && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-auto">
          {overlayControls}
        </div>
      )}
    </div>
  );
};

export default ThreeViewport;
