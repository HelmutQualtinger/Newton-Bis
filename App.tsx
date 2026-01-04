
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationConfig, AIInsight, ColorPalette } from './types';
import { PhysicsEngine } from './services/physicsEngine';
import { getPhysicsInsight } from './services/geminiService';

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>({
    G: 3.5,
    friction: 0.002,
    particleCount: 200,
    collisionElasticity: 0.8,
    trailLength: 40,
    showTrails: true,
    paused: false,
    mouseStrength: 15000,
    palette: 'fireworks',
    intensity: 1.2,
  });

  const [insight, setInsight] = useState<AIInsight>({
    title: "Gravitational Harmonics",
    content: "Calculating 40,000 interactions per frame using 4th-order Runge-Kutta integration for extreme orbital precision."
  });
  const [loadingInsight, setLoadingInsight] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const cursorRef = useRef<HTMLDivElement>(null);
  
  const mousePos = useRef({ x: 0, y: 0 });
  const isMouseActive = useRef(false);

  // Initialize Engine
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new PhysicsEngine(config, window.innerWidth, window.innerHeight);
    }
  }, []);

  // Update Engine Config
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setConfig(config);
    }
  }, [config]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        engineRef.current.updateDimensions(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rendering Loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;

    if (canvas && ctx && engine) {
      // Create motion trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(2, 6, 23, ${config.showTrails ? 1 / config.trailLength : 1})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Step physics
      const mStrength = isMouseActive.current ? config.mouseStrength : 0;
      engine.step(mousePos.current.x, mousePos.current.y, mStrength);

      // Draw particles
      ctx.globalCompositeOperation = 'lighter';
      const particles = engine.getParticles();
      
      for (const p of particles) {
        const glowRadius = p.radius * 8 * config.intensity;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        
        // Extract color and make it transparent for the outer glow
        const baseColor = p.color.replace('1.0)', '');
        gradient.addColorStop(0, `${baseColor} 0.8)`);
        gradient.addColorStop(0.2, `${baseColor} 0.3)`);
        gradient.addColorStop(1, `${baseColor} 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [config]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== undefined) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const handleFetchInsight = async () => {
    setLoadingInsight(true);
    const newInsight = await getPhysicsInsight(config);
    setInsight(newInsight);
    setLoadingInsight(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (cursorRef.current) {
      cursorRef.current.style.left = `${e.clientX}px`;
      cursorRef.current.style.top = `${e.clientY}px`;
    }
  };

  const palettes: { id: ColorPalette; name: string; color: string }[] = [
    { id: 'fireworks', name: 'Fireworks', color: 'from-rose-500 via-yellow-400 to-emerald-400' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: 'from-fuchsia-500 via-purple-600 to-cyan-400' },
    { id: 'ocean', name: 'Ocean', color: 'from-cyan-600 via-blue-500 to-indigo-400' },
    { id: 'inferno', name: 'Inferno', color: 'from-orange-600 via-red-500 to-yellow-400' },
    { id: 'emerald', name: 'Emerald', color: 'from-emerald-600 via-green-500 to-teal-400' },
    { id: 'monochrome', name: 'Mono', color: 'from-slate-400 via-slate-200 to-white' },
  ];

  const attractorColor = config.mouseStrength >= 0 ? 'rgba(34, 211, 238, 0.6)' : 'rgba(244, 63, 94, 0.6)';

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden font-sans text-slate-200">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => isMouseActive.current = true}
        onMouseLeave={() => isMouseActive.current = false}
        onMouseDown={() => isMouseActive.current = true}
        onMouseUp={() => isMouseActive.current = false}
        className="absolute inset-0 cursor-none"
      />

      <div 
        ref={cursorRef}
        className="pointer-events-none absolute w-32 h-32 rounded-full border-4 border-yellow-400 transition-all duration-300 flex items-center justify-center"
        style={{ 
          transform: 'translate(-50%, -50%)', 
          zIndex: 50,
          backgroundColor: isMouseActive.current ? attractorColor : 'rgba(255, 255, 255, 0.05)',
          boxShadow: isMouseActive.current ? `0 0 80px 10px ${attractorColor}, inset 0 0 20px rgba(255, 255, 0, 0.5)` : '0 0 20px rgba(255, 255, 255, 0.1)',
          opacity: isMouseActive.current ? 1 : 0.4
        }}
      >
        <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_20px_#fff]" />
        {isMouseActive.current && (
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-yellow-200/50 animate-spin-slow" />
        )}
      </div>

      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-yellow-400 to-emerald-400 tracking-tighter">
            Newtonian Sparks
          </h1>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">
            RK4 Precision • {config.particleCount} Bodies
          </p>
        </div>

        <div className="pointer-events-auto bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-white/5 max-w-sm shadow-2xl transition-all hover:bg-slate-900/60">
          <div className="flex items-center gap-2 mb-2 text-rose-400">
            <i className="fas fa-bolt text-sm"></i>
            <span className="font-bold uppercase tracking-widest text-[10px]">{insight.title}</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300 italic">
            "{insight.content}"
          </p>
          <button 
            onClick={handleFetchInsight}
            disabled={loadingInsight}
            className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] uppercase font-black tracking-widest rounded-lg transition-all"
          >
            {loadingInsight ? "Syncing..." : "Update AI Context"}
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 p-6 bg-slate-950/80 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl w-80 space-y-5 overflow-y-auto max-h-[80vh] scrollbar-hide">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Spectrum Palettes</label>
          <div className="grid grid-cols-3 gap-2">
            {palettes.map((p) => (
              <button
                key={p.id}
                onClick={() => setConfig({ ...config, palette: p.id })}
                className={`p-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${
                  config.palette === p.id ? 'border-white/40 bg-white/10 text-white' : 'border-white/5 bg-slate-900/50 text-slate-500 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className={`w-full h-1 rounded-full mb-1 bg-gradient-to-r ${p.color}`} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Particle Density</label>
                <span className="text-xs font-mono text-rose-400">{config.particleCount}</span>
            </div>
            <input 
                type="range" min="10" max="400" step="10" 
                value={config.particleCount} 
                onChange={(e) => setConfig({...config, particleCount: parseInt(e.target.value)})}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Glow Intensity</label>
            <span className="text-xs font-mono text-yellow-400">{(config.intensity).toFixed(1)}x</span>
          </div>
          <input 
            type="range" min="0.1" max="4" step="0.1" 
            value={config.intensity} 
            onChange={(e) => setConfig({...config, intensity: parseFloat(e.target.value)})}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trail Length</label>
            <span className="text-xs font-mono text-purple-400">{config.trailLength}</span>
          </div>
          <input 
            type="range" min="1" max="100" step="1" 
            value={config.trailLength} 
            onChange={(e) => setConfig({...config, trailLength: parseInt(e.target.value)})}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gravity (G)</label>
            <span className="text-xs font-mono text-cyan-400">{config.G.toFixed(2)}</span>
          </div>
          <input 
            type="range" min="0" max="50" step="0.1" 
            value={config.G} 
            onChange={(e) => setConfig({...config, G: parseFloat(e.target.value)})}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attractor Weight</label>
            <span className={`text-xs font-mono ${config.mouseStrength >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {config.mouseStrength.toLocaleString()}
            </span>
          </div>
          <input 
            type="range" min="-1000" max="30000" step="100" 
            value={config.mouseStrength} 
            onChange={(e) => setConfig({...config, mouseStrength: parseFloat(e.target.value)})}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Simulation Friction</label>
            <span className="text-xs font-mono text-emerald-400">{(config.friction * 100).toFixed(2)}%</span>
          </div>
          <input 
            type="range" min="0" max="0.05" step="0.0001" 
            value={config.friction} 
            onChange={(e) => setConfig({...config, friction: parseFloat(e.target.value)})}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button 
            onClick={() => setConfig({...config, paused: !config.paused})}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${config.paused ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'}`}
          >
            {config.paused ? 'Resume' : 'Pause'}
          </button>
          <button 
            onClick={() => engineRef.current?.reset()}
            className="px-4 py-3 bg-slate-800 text-slate-400 rounded-xl border border-white/5 hover:bg-slate-700 transition-colors"
          >
            <i className="fas fa-rotate"></i>
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col items-end pointer-events-none font-mono text-[9px] text-slate-600 uppercase tracking-widest">
        <div className="flex items-center gap-4 bg-slate-900/30 px-4 py-2 rounded-full border border-white/5">
            <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                <i className="fas fa-microchip"></i>
                CPU Integrated
            </span>
            <span>60 FPS</span>
        </div>
      </div>
    </div>
  );
};

export default App;
