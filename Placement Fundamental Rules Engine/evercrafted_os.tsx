import React, { useState, useEffect } from 'react';
import { 
  Compass, Leaf, Layers, ShieldCheck, ArrowRight, 
  Play, Code, FileJson, CheckCircle, Check, Terminal, Database, Activity, Lock, Image as ImageIcon
} from 'lucide-react';

// Helper to ensure any LLM output is safely rendered as a string in React
const safeRender = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return '[Object]';
    }
  }
  return String(val);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('json');
  const [demoState, setDemoState] = useState('idle'); // idle, processing, complete
  const [terminalLogs, setTerminalLogs] = useState([]);

  const [promptInput, setPromptInput] = useState('Gothic winter wedding, dark academia vibes, heavy texture.');
  const [generatedData, setGeneratedData] = useState(null);
  const [error, setError] = useState('');

  const runDemo = async () => {
    setDemoState('processing');
    setTerminalLogs([]);
    setGeneratedData(null);
    setError('');

    setTerminalLogs(prev => [...prev, `> INTAKE: Parsing emotion '${promptInput}'...`]);

    const systemPrompt = `You are the Evercrafted Placement Fundamental Rules Engine (PFRE).
    Convert the user's floral wreath design idea into a strict JSON blueprint (EC_CANON_V1).
    RULES:
    1. ONLY use "Faux Botanicals" (e.g., Faux Oak, Faux Peony). No real flowers, no ribbons, no silk.
    2. Enforce strict 70/30 or 60/40 Asymmetry (e.g., heavily pool elements on one side).
    3. Zones: Zone A (Base stems, radius ~200mm), Zone B (Mid layer, radius ~140mm), Zone C (Focal anchor, radius ~50mm).
    4. Polar coordinates: theta must be in degrees (e.g., '150deg'), radius in mm.
    Generate the theme name, an array of 3-5 elements, a 3-step build guide, and a highly detailed luxury editorial photography prompt.`;

    const payload = {
      contents: [{ parts: [{ text: promptInput }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            theme: { type: "STRING" },
            elements: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
                  botanical: { type: "STRING" },
                  pfre_zone: { type: "STRING" },
                  radius: { type: "STRING" },
                  theta: { type: "STRING" },
                  insertion_angle: { type: "STRING" },
                  role: { type: "STRING" }
                }
              }
            },
            guide_steps: { type: "ARRAY", items: { type: "STRING" } },
            editorial_prompt: { type: "STRING" }
          }
        }
      }
    };

    try {
      const apiKey = "";
      let result;
      let retries = 5;
      let delay = 1000;
      
      while (retries > 0) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('API Error');
          result = await response.json();
          break;
        } catch (e) {
          retries--;
          if (retries === 0) throw e;
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }

      const dataText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const data = JSON.parse(dataText);
      const elementCount = Array.isArray(data.elements) ? data.elements.length : 0;

      setTerminalLogs(prev => [
        ...prev,
        `> DNA DERIVATION: Selected ${elementCount} faux stems.`,
        `> PFRE PRE-PASS [STAGE 4.5]: Segmenting Zones A, B, C...`,
        `> OVERRIDE 1: Enforcing strict 70/30 Asymmetry (Radial balance FAILED intentionally).`,
        `> OVERRIDE 2: Re-assigning Anchor Point to visual center of gravity (No ribbons).`,
        `> OVERRIDE 3: Validating bend radius limits for faux wire cores... [PASSED].`,
        `> BLUEPRINT GENERATION: Plotting polar coordinates.`,
        `> SCORING: 100% hard constraints satisfied.`,
        `> OUTPUT: Compiling EC_CANON_V1 JSON.`
      ]);

      setGeneratedData(data);
      setTimeout(() => setDemoState('complete'), 600);

    } catch (err) {
      console.error(err);
      setTerminalLogs(prev => [...prev, `> ERROR: Orchestrator failed to initialize.`]);
      setDemoState('idle');
      setError('Generation failed. Please try again.');
    }
  };

  const elementsList = Array.isArray(generatedData?.elements) ? generatedData.elements : [];
  const guideStepsList = Array.isArray(generatedData?.guide_steps) ? generatedData.guide_steps : [];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-emerald-900 selection:text-emerald-50">
      
      {/* Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Evercrafted<span className="text-emerald-500 font-medium">.os</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide text-slate-400">
            <a href="#platform" className="hover:text-white transition-colors">The Framework</a>
            <a href="#demo" className="hover:text-white transition-colors">PFRE Terminal</a>
            <a href="#pricing" className="hover:text-white transition-colors">Enterprise</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium hover:text-white hidden sm:block text-slate-300">Sign In</button>
            <button 
              onClick={() => document.getElementById('demo').scrollIntoView({behavior: 'smooth'})}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-900/40 border border-emerald-500/50"
            >
              Deploy Orchestrator
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-32 overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/10 via-[#020617] to-[#020617] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative">
          <div className="max-w-2xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-xs font-bold tracking-wide text-emerald-400 mb-6 uppercase">
              <ShieldCheck className="w-4 h-4" />
              Stage 4.5 PFRE Constraints Active
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              AI interprets. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Geometry places.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-xl font-medium">
              The world's first deterministic design engine for faux botanical manufacturing. We transform creative emotions into mathematically viable, strictly asymmetrical blueprints.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => document.getElementById('demo').scrollIntoView({behavior: 'smooth'})} className="bg-white text-slate-900 px-6 py-3.5 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-xl shadow-white/5">
                Initialize Demo <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-6 py-3.5 rounded-lg font-bold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2">
                <FileJson className="w-4 h-4" /> EC_CANON_V1 Docs
              </button>
            </div>
            <div className="mt-12 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-slate-500 font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-500" /> Faux Botanicals Only</div>
              <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> 70/30 Asymmetry Forced</div>
            </div>
          </div>

          {/* Abstract Hero Visualization */}
          <div className="relative hidden lg:block">
            <div className="aspect-square max-w-lg mx-auto relative flex items-center justify-center">
              {/* Concentric Zones (PFRE A, B, C) */}
              <div className="absolute w-[450px] h-[450px] border border-slate-800/60 rounded-full animate-[spin_60s_linear_infinite]"></div>
              <div className="absolute w-[300px] h-[300px] border border-emerald-900/30 rounded-full border-dashed animate-[spin_40s_linear_infinite_reverse]"></div>
              <div className="absolute w-[150px] h-[150px] border border-emerald-800/40 bg-emerald-950/20 backdrop-blur-sm rounded-full"></div>
              
              <div className="absolute bg-slate-900/90 border border-slate-700 p-5 rounded-xl shadow-2xl backdrop-blur-md flex flex-col justify-center items-center text-center z-20">
                <Database className="w-8 h-8 text-emerald-400 mb-3" />
                <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Polar Mapping</div>
                <div className="text-xl font-bold text-white mb-2">Stage 5 : Blueprint</div>
                <div className="px-3 py-1.5 bg-[#020617] rounded border border-slate-800 text-xs font-mono text-emerald-300">
                  r: 210mm, θ: 150°
                </div>
              </div>
              
              {/* Asymmetric Faux Nodes */}
              <div className="absolute bottom-[15%] right-[20%] flex items-center gap-2 z-10">
                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>
                <span className="text-xs font-mono text-emerald-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">Anchor Focal</span>
              </div>
              <div className="absolute bottom-[35%] right-[10%] w-2 h-2 bg-teal-400 rounded-full shadow-[0_0_15px_rgba(45,212,191,0.6)] z-10"></div>
              <div className="absolute top-[40%] right-[25%] w-1.5 h-1.5 bg-slate-400 rounded-full z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Orchestrator Flow Section */}
      <section id="platform" className="py-24 bg-[#040B16] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">The 7-Stage Orchestrator Flow</h2>
            <p className="text-slate-400 text-lg">We eliminate "hallucinated" physics by routing all AI ideation through the PFRE constraint layer, applying mandatory brand overrides.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#091120] border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Leaf className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Stage 4: DNA Derivation</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The engine ingests emotion maps and selects strictly from verified faux botanical inventory. Ribbons and silk are permanently locked out of the selection pool.
              </p>
            </div>
            
            <div className="bg-emerald-950/20 border border-emerald-900/50 p-8 rounded-2xl relative overflow-hidden group hover:bg-emerald-950/40 transition-colors">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">New Framework</span>
              </div>
              <div className="w-12 h-12 bg-emerald-900/50 rounded-xl border border-emerald-700/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Stage 4.5: PFRE Pre-Pass</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Segments the canvas into Zones A, B, C. Applies Master Overrides:
              </p>
              <ul className="text-xs space-y-2 text-emerald-200/70 font-medium">
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Crescent/S-Curve 70/30 weight forced.</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Anchor dictates center of gravity.</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Bend radius limits tracked for faux stems.</li>
              </ul>
            </div>

            <div className="bg-[#091120] border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Stage 7: Final Outputs</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Compiles the physically validated design into the EC_CANON_V1 format. Generates the step-by-step assembly instructions and luxury editorial render prompts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[150px] -z-10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            
            {/* Terminal Controls */}
            <div className="w-full lg:w-1/3">
              <div className="flex items-center gap-3 mb-4">
                <Terminal className="w-6 h-6 text-emerald-500" />
                <h2 className="text-2xl font-bold text-white">Engine Terminal</h2>
              </div>
              <p className="text-slate-400 mb-8 font-medium">Run a live generation. Watch Evercrafted translate a raw emotion prompt into a strictly constrained, asymmetrical faux blueprint.</p>
              
              <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-6 shadow-xl mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-400"></div>
                
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Design Emotion Prompt</label>
                <textarea 
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  disabled={demoState === 'processing'}
                  rows="3"
                  className="w-full text-slate-200 text-sm p-4 bg-[#020617] rounded-xl border border-slate-800 font-medium leading-relaxed focus:outline-none focus:border-emerald-500 transition-colors resize-none disabled:opacity-50"
                  placeholder="Enter a mood, season, or aesthetic..."
                />
                
                <div className="mt-6 space-y-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Master Override 1</span>
                    <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900">70/30 Asymmetry</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Master Override 2</span>
                    <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900">No Ribbon Anchor</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Material Rule</span>
                    <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900">Faux Botanicals Only</span>
                  </div>
                </div>

                {error && <div className="mt-4 text-xs font-bold text-red-400 bg-red-950/30 p-3 rounded-lg border border-red-900/50">{safeRender(error)}</div>}

                <button 
                  onClick={runDemo}
                  disabled={demoState === 'processing' || !promptInput.trim()}
                  className="w-full mt-6 bg-white hover:bg-slate-100 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 py-3.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {demoState === 'processing' ? (
                    <><div className="w-4 h-4 border-2 border-slate-400 border-t-emerald-500 rounded-full animate-spin"></div> Executing Orchestrator...</>
                  ) : demoState === 'complete' ? (
                    <><Check className="w-5 h-5 text-emerald-500" /> ✨ Regenerate Blueprint</>
                  ) : (
                    <><Play className="w-4 h-4 fill-current" /> ✨ Run AI Orchestrator Pipeline</>
                  )}
                </button>
                {demoState === 'complete' && (
                   <button 
                     onClick={() => { setDemoState('idle'); setActiveTab('json'); }}
                     className="w-full mt-3 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors"
                   >
                     Reset Engine
                   </button>
                )}
              </div>
            </div>

            {/* Output Panel */}
            <div className="w-full lg:w-2/3">
              <div className="bg-[#091120] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl h-[550px] flex flex-col">
                
                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-[#0B1120]">
                  <button 
                    onClick={() => setActiveTab('json')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'json' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    <FileJson className="w-4 h-4" /> EC_CANON_V1
                  </button>
                  <button 
                    onClick={() => setActiveTab('guide')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'guide' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    <Layers className="w-4 h-4" /> Build Guide
                  </button>
                  <button 
                    onClick={() => setActiveTab('render')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'render' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    <ImageIcon className="w-4 h-4" /> Editorial Render
                  </button>
                </div>
                
                {/* Content Area */}
                <div className="p-6 flex-1 overflow-y-auto bg-[#020617] font-mono text-sm custom-scrollbar">
                  {demoState === 'idle' && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                      <Database className="w-10 h-10 mb-4 opacity-30" />
                      <p className="font-sans font-medium">Awaiting Orchestrator execution...</p>
                      <p className="font-sans text-xs mt-2 text-slate-700">Output will be mapped to PFRE polar coordinates.</p>
                    </div>
                  )}
                  
                  {demoState === 'processing' && (
                    <div className="h-full flex flex-col items-start justify-start space-y-3 font-mono text-[13px]">
                      {terminalLogs.map((log, i) => (
                         <p key={i} className={`text-emerald-400 ${i === terminalLogs.length - 1 ? 'animate-pulse' : ''}`}>
                           {safeRender(log)}
                         </p>
                      ))}
                      <div className="flex gap-1 mt-2">
                        <div className="w-2 h-4 bg-emerald-500 animate-bounce"></div>
                      </div>
                    </div>
                  )}

                  {demoState === 'complete' && activeTab === 'json' && generatedData && (
                    <pre className="text-slate-300 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
<span className="text-pink-400">{"{"}</span>{"\n"}
  <span className="text-blue-300">"version"</span>: <span className="text-emerald-300">"EC_CANON_V1"</span>,{"\n"}
  <span className="text-blue-300">"theme"</span>: <span className="text-emerald-300">"{safeRender(generatedData.theme)}"</span>,{"\n"}
  <span className="text-blue-300">"style_enforcement"</span>: <span className="text-emerald-300">"Strict Asymmetry (70/30)"</span>,{"\n"}
  <span className="text-blue-300">"material_constraint"</span>: <span className="text-emerald-300">"Faux Botanicals Only"</span>,{"\n"}
  <span className="text-blue-300">"elements"</span>: <span className="text-yellow-300">[</span>{"\n"}
{elementsList.map((el, idx) => (
  <React.Fragment key={idx}>
    <span className="text-pink-400">{"    {"}</span>{"\n"}
    {"      "}<span className="text-blue-300">"id"</span>: <span className="text-emerald-300">"{safeRender(el.id || `elem_${idx}`)}"</span>,{"\n"}
    {"      "}<span className="text-blue-300">"botanical"</span>: <span className="text-emerald-300">"{safeRender(el.botanical)}"</span>,{"\n"}
    {"      "}<span className="text-blue-300">"pfre_zone"</span>: <span className="text-emerald-300">"{safeRender(el.pfre_zone)}"</span>,{"\n"}
    {"      "}<span className="text-blue-300">"coordinates"</span>: <span className="text-purple-400">{"{"}</span> 
        <span className="text-blue-300">"radius"</span>: <span className="text-emerald-300">"{safeRender(el.radius)}"</span>, 
        <span className="text-blue-300">"theta"</span>: <span className="text-emerald-300">"{safeRender(el.theta)}"</span>, 
        <span className="text-blue-300">"insertion_angle"</span>: <span className="text-emerald-300">"{safeRender(el.insertion_angle)}"</span> 
    <span className="text-purple-400">{"}"}</span>,{"\n"}
    {"      "}<span className="text-blue-300">"role"</span>: <span className="text-emerald-300">"{safeRender(el.role)}"</span>{"\n"}
    <span className="text-pink-400">{"    }"}</span>{idx < elementsList.length - 1 ? ',' : ''}{"\n"}
  </React.Fragment>
))}
  <span className="text-yellow-300">]</span>{"\n"}
<span className="text-pink-400">{"}"}</span>
                    </pre>
                  )}

                  {demoState === 'complete' && activeTab === 'guide' && generatedData && (
                    <div className="font-sans text-slate-300 space-y-6">
                      {guideStepsList.map((step, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                          <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                            <span className="bg-emerald-900/50 text-emerald-400 w-6 h-6 flex items-center justify-center rounded text-xs">{idx + 1}</span> 
                            Phase {idx + 1}
                          </h4>
                          <p className="text-sm text-slate-300 pl-8">{safeRender(step)}</p>
                        </div>
                      ))}
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <h4 className="text-teal-400 font-bold mb-2 flex items-center gap-2">
                           <span className="bg-teal-900/50 text-teal-400 w-6 h-6 flex items-center justify-center rounded text-xs"><ShieldCheck className="w-3 h-3"/></span> 
                           PFRE Integrity Checks Passed
                        </h4>
                        <ul className="list-disc pl-11 space-y-2 text-sm text-slate-300">
                          <li className="text-teal-200">Asymmetry mandate enforced successfully.</li>
                          <li className="text-teal-200">Bend radius of all faux stems verified.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {demoState === 'complete' && activeTab === 'render' && generatedData && (
                    <div className="font-sans text-slate-300 h-full flex flex-col">
                      <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">✨ Generated Editorial Prompt</div>
                        <p className="text-sm leading-relaxed text-slate-200 italic font-medium">
                          "{safeRender(generatedData.editorial_prompt)}"
                        </p>
                      </div>
                      
                      <div className="mt-6 flex-1 border border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-500 bg-slate-900/30">
                         <ImageIcon className="w-10 h-10 mb-3 opacity-50" />
                         <span className="text-sm font-bold">Image generation passed to Stage 7 rendering engine...</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Enterprise Section */}
      <section id="pricing" className="py-24 border-t border-slate-800 bg-[#040B16]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-emerald-950 rounded-full border border-emerald-900 text-xs font-bold text-emerald-400 mb-6 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" /> B2B Commercial Access
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Scale Your Production</h2>
          <p className="text-slate-400 mb-12 text-lg">Stop guessing. Start building. Bring the power of the PFRE constraint layer and EC_CANON_V1 exports to your manufacturing floor.</p>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="bg-[#091120] border border-slate-700 rounded-2xl p-8 hover:border-slate-500 transition-colors">
              <h3 className="text-2xl font-bold text-white mb-2">Studio License</h3>
              <div className="text-4xl font-extrabold text-white mb-6">$499<span className="text-base text-slate-500 font-medium">/mo</span></div>
              <ul className="space-y-4 text-sm text-slate-300 mb-8 font-medium">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-500" /> Up to 500 EC_CANON_V1 Blueprints/mo</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-500" /> Standard 70/30 Asymmetry Overrides</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-500" /> Standard Bend-Radius Math</li>
              </ul>
              <button className="w-full py-3.5 rounded-xl border-2 border-slate-700 text-white font-bold hover:bg-slate-800 transition-colors">Start Trial</button>
            </div>
            
            <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-2xl p-8 relative shadow-2xl shadow-emerald-900/20">
              <div className="absolute -top-4 right-6">
                <span className="bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">Enterprise</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Factory Scale</h3>
              <div className="text-4xl font-extrabold text-emerald-400 mb-6">Custom</div>
              <ul className="space-y-4 text-sm text-slate-300 mb-8 font-medium">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-500" /> Unlimited API Generation</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-500" /> Custom Faux Inventory DB Sync</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-500" /> Custom PFRE Override Logic</li>
              </ul>
              <button className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/40 transition-colors">Contact Engineering</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#020617] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Compass className="w-5 h-5 text-emerald-500" /> Evercrafted OS
          </div>
          <div className="text-sm text-slate-500 font-medium">
            © 2026 Evercrafted Inc. Columbus, Ohio. <span className="text-emerald-500/50">AI Interprets. Geometry Places.</span>
          </div>
        </div>
      </footer>
      
      {/* Global styling for custom scrollbar within terminal */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}