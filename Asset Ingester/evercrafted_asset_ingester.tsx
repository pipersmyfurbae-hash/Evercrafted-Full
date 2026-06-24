import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Scissors, Palette, Download, Code, Loader2, CheckCircle2, AlertCircle, Sparkles, PenTool, Flower2, Trash2, ZoomIn, X, ChevronRight, LayoutDashboard, Database, Box, Layers, Check, ArrowRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- Firebase Init ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const apiKey = ""; // Provided by execution environment

// --- Utility Functions ---
const fetchWithRetry = async (url, options, maxRetries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

const removeWhiteBackground = (base64Image) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const tolerance = 230; 

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (r > tolerance && g > tolerance && b > tolerance) {
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            if (luminance > 250) {
               data[i + 3] = 0; 
            } else {
               const alpha = Math.max(0, 255 - ((luminance - tolerance) * (255 / (255 - tolerance))));
               data[i + 3] = alpha;
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = base64Image;
  });
};

const compressImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/webp', 0.8));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

// --- VISUALIZER ENGINE ---
function VisualizerEngine({ inventory }) {
  const [placedItems, setPlacedItems] = useState([]);
  const [sweepAngle, setSweepAngle] = useState(30);
  const ringRadius = 160; 

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const itemData = e.dataTransfer.getData('application/json');
    if (!itemData) return;
    const item = JSON.parse(itemData);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const dx = x - centerX;
    const dy = y - centerY;
    const angleRad = Math.atan2(dy, dx);
    const theta = angleRad * (180 / Math.PI); 

    setPlacedItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      item,
      theta
    }]);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleExportBlueprint = () => {
    if (placedItems.length === 0) return;
    
    // Group up Bill of Materials tracking full stems vs segments
    const billOfMaterials = placedItems.reduce((acc, curr) => {
      const existing = acc.find(i => i.id === curr.item.id);
      const yieldPerStem = curr.item.dimensions?.segment_yield || 1;
      
      if (existing) {
        existing.segments_used += 1;
        existing.full_stems_required = Math.ceil(existing.segments_used / yieldPerStem);
      } else {
        acc.push({ 
          id: curr.item.id, 
          name: curr.item.name, 
          segments_used: 1, 
          segment_yield_per_stem: yieldPerStem,
          full_stems_required: 1,
          segment_length_inches: curr.item.dimensions?.segment_length_inches || curr.item.dimensions?.length_inches || 0,
          palette: curr.item.metadata?.palette || ""
        });
      }
      return acc;
    }, []);

    const totalStemsRequired = billOfMaterials.reduce((sum, item) => sum + item.full_stems_required, 0);
    const estimatedCost = parseFloat((totalStemsRequired * 4.50).toFixed(2));

    // Structure the EC_CANON_V1 JSON export
    const blueprintData = {
      type: "wreath_recipe",
      geometry_config: {
        base_type: "grapevine_24_inch",
        sweep_angle: sweepAngle,
        asymmetric: true // Strict Evercrafted preference
      },
      financials: {
        total_segments_placed: placedItems.length,
        total_full_stems_required: totalStemsRequired,
        estimated_wholesale_cost_usd: estimatedCost
      },
      bill_of_materials: billOfMaterials,
      polar_placements: placedItems.map(placed => ({
        stem_id: placed.item.id,
        stem_name: placed.item.name,
        theta_angle: parseFloat(placed.theta.toFixed(2))
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprintData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `EC_Blueprint_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const bom = placedItems.reduce((acc, curr) => {
    const existing = acc.find(i => i.id === curr.item.id);
    const yieldPerStem = curr.item.dimensions?.segment_yield || 1;
    
    if (existing) {
      existing.segments_used += 1;
      existing.full_stems_required = Math.ceil(existing.segments_used / yieldPerStem);
    } else {
      acc.push({ ...curr.item, segments_used: 1, full_stems_required: 1, segment_yield: yieldPerStem });
    }
    return acc;
  }, []);

  const totalFullStems = bom.reduce((sum, item) => sum + item.full_stems_required, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[750px] animate-in fade-in duration-500">
      {/* Left: Palette */}
      <div className="xl:col-span-3 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col h-full shadow-sm">
         <h3 className="font-bold text-stone-700 mb-4 uppercase text-xs tracking-wider">Live Palette</h3>
         <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {(!inventory || inventory.length === 0) ? (
               <p className="text-stone-400 text-sm italic border-2 border-dashed border-stone-100 p-4 text-center rounded-xl">No items in inventory. Go to the Asset Ingester to add some!</p>
            ) : (
               inventory.map(item => (
                 <div
                   key={item.id}
                   draggable
                   onDragStart={(e) => handleDragStart(e, item)}
                   className="bg-stone-50 border border-stone-200 rounded-xl p-3 cursor-grab hover:border-stone-400 hover:shadow-md transition-all flex items-center gap-3"
                 >
                    <div className="w-12 h-12 rounded-lg bg-white border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                       <img src={item.visualizer_asset} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                       <p className="text-sm font-semibold text-stone-800 truncate">{item.name}</p>
                       <p className="text-xs text-stone-500">{item.dimensions?.segment_length_inches || item.dimensions?.length_inches || 0}" Cut Segment</p>
                    </div>
                 </div>
               ))
            )}
         </div>
      </div>

      {/* Center: Canvas Workspace */}
      <div className="xl:col-span-6 bg-stone-100 border border-stone-200 rounded-2xl flex flex-col relative overflow-hidden h-full shadow-sm">
        <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-stone-200 p-3 rounded-xl flex items-center gap-4 z-20 shadow-sm">
           <label className="text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">Sweep Angle</label>
           <input
             type="range"
             min="0"
             max="90"
             value={sweepAngle}
             onChange={(e) => setSweepAngle(Number(e.target.value))}
             className="flex-1 accent-stone-900"
           />
           <span className="text-xs font-mono bg-stone-100 px-2 py-1 rounded text-stone-600 text-center min-w-[40px]">{sweepAngle}°</span>
        </div>

        <div
          className="flex-1 relative flex items-center justify-center w-full h-full cursor-crosshair"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
           <div
             className="absolute border-[18px] rounded-full shadow-lg z-10"
             style={{
               width: ringRadius * 2,
               height: ringRadius * 2,
               borderColor: '#6b5744', 
               borderStyle: 'dashed' 
             }}
           />
           <div className="absolute text-stone-400 text-sm font-medium z-0 flex flex-col items-center gap-2 pointer-events-none">
             <p>Drag individual segments here</p>
             <span className="text-xs uppercase tracking-widest bg-stone-200/80 text-stone-600 px-2 py-1 rounded font-bold">24" Grapevine Base</span>
           </div>

           {placedItems.map((placed) => {
             const angleRad = placed.theta * (Math.PI / 180);
             const x = Math.cos(angleRad) * ringRadius;
             const y = Math.sin(angleRad) * ringRadius;
             const rotation = placed.theta + 90 + sweepAngle;
             // Use segment length for visual scaling
             const itemHeight = (placed.item.dimensions?.segment_length_inches || placed.item.dimensions?.length_inches || 6) * 15;

             return (
               <div
                 key={placed.id}
                 className="absolute z-20"
                 style={{
                   left: `calc(50% + ${x}px)`,
                   top: `calc(50% + ${y}px)`,
                   transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
                   transformOrigin: 'bottom center', 
                   height: itemHeight,
                   pointerEvents: 'none' 
                 }}
               >
                 <img src={placed.item.visualizer_asset} alt="stem" className="h-full w-auto object-contain drop-shadow-xl" />
               </div>
             );
           })}
        </div>
        
        {placedItems.length > 0 && (
            <div className="absolute bottom-4 right-4 z-30">
              <button
                onClick={() => setPlacedItems([])}
                className="bg-white border border-red-200 text-red-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-50 shadow-sm transition-colors"
              >
                Clear Canvas
              </button>
            </div>
        )}
      </div>

      {/* Right: Recipe BOM */}
      <div className="xl:col-span-3 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col h-full shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 uppercase text-xs tracking-wider flex items-center justify-between">
          Live Recipe (BOM)
          <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{totalFullStems} Stems</span>
        </h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
           {bom.length === 0 ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-stone-100 rounded-xl bg-stone-50 text-center p-4">
                 <p className="text-stone-400 text-sm font-medium">Drop segments to calculate full stems to purchase.</p>
              </div>
           ) : (
             bom.map(item => (
               <div key={item.id} className="flex flex-col py-2 border-b border-stone-100 last:border-0 gap-1">
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-stone-50 border border-stone-200 flex items-center justify-center shrink-0 p-0.5">
                        <img src={item.visualizer_asset} alt="BOM icon" className="max-w-full max-h-full object-contain" />
                      </div>
                      <p className="text-sm text-stone-700 font-bold truncate">{item.name}</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 rounded">Buy: {item.full_stems_required}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 uppercase tracking-wider pl-8">
                     <span>Yield: {item.segment_yield} cuts/stem</span>
                     <span>Used: {item.segments_used} cuts</span>
                  </div>
               </div>
             ))
           )}
        </div>
        {bom.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
             <div className="flex justify-between items-center text-sm px-1">
               <span className="text-stone-500 font-medium">Est. Wholesale Cost</span>
               <span className="font-bold text-stone-800">~${(totalFullStems * 4.50).toFixed(2)}</span>
             </div>
             <button onClick={handleExportBlueprint} className="w-full bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition-colors shadow-sm flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export Blueprint
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- INGESTER TOOL ---
function IngesterTool({ addToInventory }) {
  const [file, setFile] = useState(null);
  const [originalImageBase64, setOriginalImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [botanicalData, setBotanicalData] = useState(null);
  const [mainFullAssetUrl, setMainFullAssetUrl] = useState(null);
  const [mainSegmentAssetUrl, setMainSegmentAssetUrl] = useState(null);
  const [isMainSaved, setIsMainSaved] = useState(false);

  const [marketingCopy, setMarketingCopy] = useState(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [designPairings, setDesignPairings] = useState([]);
  const [isGeneratingPairings, setIsGeneratingPairings] = useState(false);
  
  const [conceptImage, setConceptImage] = useState(null);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setMimeType(selectedFile.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageBase64(reader.result.split(',')[1]);
        resetState();
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const resetState = () => {
    setStatus('idle'); setErrorMsg(''); setBotanicalData(null); 
    setMainFullAssetUrl(null); setMainSegmentAssetUrl(null);
    setMarketingCopy(null); setDesignPairings([]); setConceptImage(null); setIsMainSaved(false);
  };

  const processImage = async () => {
    if (!originalImageBase64) return;
    setStatus('analyzing'); setErrorMsg(''); setIsMainSaved(false);
    try {
      const visionUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const visionPayload = {
        contents: [{
          role: "user",
          parts: [
            { text: "Analyze this faux botanical floral element. You must respond with a JSON object containing EXACTLY these keys: 'name' (string, the common botanical name), 'full_stem_length_inches' (number, estimated total physical length of the un-cut stock stem), 'segment_yield' (number, how many individual usable sprigs/segments a wreath-maker would typically cut this stem into), 'segment_length_inches' (number, the average length of those individual cut pieces), 'color_palette' (string, main colors)." },
            { inlineData: { mimeType: mimeType, data: originalImageBase64 } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { name: { type: "STRING" }, full_stem_length_inches: { type: "NUMBER" }, segment_yield: { type: "NUMBER" }, segment_length_inches: { type: "NUMBER" }, color_palette: { type: "STRING" } }, required: ["name", "full_stem_length_inches", "segment_yield", "segment_length_inches", "color_palette"] } }
      };
      const visionResult = await fetchWithRetry(visionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visionPayload) });
      const parsedData = JSON.parse(visionResult.candidates[0].content.parts[0].text);
      setBotanicalData(parsedData);

      setStatus('painting');
      const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
      
      const fullPayload = { contents: [{ role: "user", parts: [
          { text: `Create a delicate, high-quality watercolor illustration of the ENTIRE FULL LENGTH STOCK STEM of this botanical element. The style must be an elegant botanical textbook illustration. It is CRITICAL that the background is completely, 100% solid pure white (#FFFFFF). Do not include any drop shadows, gradients, or background textures. The edges must be crisp against the pure white background to allow for easy digital masking.` },
          { inlineData: { mimeType: mimeType, data: originalImageBase64 } }
      ]}]};
      
      const segmentPayload = { contents: [{ role: "user", parts: [
          { text: `Create a delicate, high-quality watercolor illustration of ONE SINGLE CUT SPRIG OR SEGMENT of this botanical element. The segment should visually represent a small piece approximately ${parsedData.segment_length_inches} inches long. CRITICAL: Do NOT paint the entire long stem. Only paint a small cut segment. The style must be an elegant botanical textbook illustration. Background MUST BE 100% solid pure white (#FFFFFF). No drop shadows, gradients, or textures.` },
          { inlineData: { mimeType: mimeType, data: originalImageBase64 } }
      ]}]};

      const [fullResult, segmentResult] = await Promise.all([
        fetchWithRetry(imageUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fullPayload) }),
        fetchWithRetry(imageUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(segmentPayload) })
      ]);

      const fullBase64 = fullResult.candidates[0].content.parts.find(p => p.inlineData).inlineData.data;
      const segmentBase64 = segmentResult.candidates[0].content.parts.find(p => p.inlineData).inlineData.data;
      
      setStatus('isolating');
      const [fullTransparentUrl, segmentTransparentUrl] = await Promise.all([
        removeWhiteBackground(`data:image/jpeg;base64,${fullBase64}`),
        removeWhiteBackground(`data:image/jpeg;base64,${segmentBase64}`)
      ]);
      
      setMainFullAssetUrl(fullTransparentUrl);
      setMainSegmentAssetUrl(segmentTransparentUrl);
      setStatus('complete');
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setStatus('error');
    }
  };

  const handleGenerateMarketingCopy = async () => {
    if (!botanicalData) return;
    setIsGeneratingCopy(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const payload = { contents: [{ parts: [{ text: `Write a short, engaging, and elegant product description (1 to 2 sentences max) for a faux botanical stem called '${botanicalData.name}' with a color palette of '${botanicalData.color_palette}'.` }] }] };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setMarketingCopy(result.candidates[0].content.parts[0].text);
    } catch (err) { setMarketingCopy("Failed to generate copy."); } finally { setIsGeneratingCopy(false); }
  };

  const handleGeneratePairings = async () => {
    if (!botanicalData) return;
    setIsGeneratingPairings(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: `You are an expert floral designer. Suggest exactly 3 other specific types of botanical stems or foliage that would pair beautifully in a wreath with a ${botanicalData.name}' that features a '${botanicalData.color_palette}' color palette. For each, estimate the full stock stem length, how many segments it can be cut into (yield), and the average length of those cut segments. Respond with a JSON object containing a "pairings" array.` }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { pairings: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, full_stem_length_inches: { type: "NUMBER" }, segment_yield: { type: "NUMBER" }, segment_length_inches: { type: "NUMBER" }, color_palette: { type: "STRING" } }, required: ["name", "full_stem_length_inches", "segment_yield", "segment_length_inches", "color_palette"] } } } } }
      };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const parsed = JSON.parse(result.candidates[0].content.parts[0].text);
      const initialPairings = parsed.pairings.map(p => ({ ...p, status: 'painting', fullPngUrl: null, segmentPngUrl: null, blueprint: null, isSaved: false }));
      setDesignPairings(initialPairings);
      initialPairings.forEach((p, idx) => generatePairingAsset(p, idx));
    } catch (err) { console.error(err); } finally { setIsGeneratingPairings(false); }
  };

  const generatePairingAsset = async (pairing, index) => {
    try {
      const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
      
      const fullPayload = { contents: [{ role: "user", parts: [{ text: `Create a delicate, high-quality watercolor illustration of the ENTIRE FULL LENGTH STOCK STEM of a botanical element: ${pairing.name}. Colors: ${pairing.color_palette}. Style: elegant botanical textbook illustration. Background MUST BE 100% solid pure white (#FFFFFF). No drop shadows, gradients, or textures.` }] }] };
      
      const segmentPayload = { contents: [{ role: "user", parts: [{ text: `Create a delicate, high-quality watercolor illustration of a SINGLE CUT SPRIG OR SEGMENT of a botanical element: ${pairing.name}. The segment should visually represent a piece approximately ${pairing.segment_length_inches} inches long. Colors: ${pairing.color_palette}. Style: elegant botanical textbook illustration. Background MUST BE 100% solid pure white (#FFFFFF). No drop shadows, gradients, or textures.` }] }] };
      
      const [fullResult, segmentResult] = await Promise.all([
        fetchWithRetry(imageUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fullPayload) }),
        fetchWithRetry(imageUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(segmentPayload) })
      ]);

      const fullBase64 = fullResult.candidates[0].content.parts.find(p => p.inlineData).inlineData.data;
      const segmentBase64 = segmentResult.candidates[0].content.parts.find(p => p.inlineData).inlineData.data;
      
      setDesignPairings(prev => { const next = [...prev]; next[index].status = 'isolating'; return next; });
      
      const [fullTransparentUrl, segmentTransparentUrl] = await Promise.all([
        removeWhiteBackground(`data:image/jpeg;base64,${fullBase64}`),
        removeWhiteBackground(`data:image/jpeg;base64,${segmentBase64}`)
      ]);
      
      const blueprint = { id: `pairing_${pairing.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`, category: "faux_botanical", name: pairing.name, dimensions: { full_stem_length_inches: pairing.full_stem_length_inches, segment_yield: pairing.segment_yield, segment_length_inches: pairing.segment_length_inches }, metadata: { palette: pairing.color_palette } };
      
      setDesignPairings(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'complete', fullPngUrl: fullTransparentUrl, segmentPngUrl: segmentTransparentUrl, blueprint };
        return next;
      });
    } catch (err) {
      setDesignPairings(prev => { const next = [...prev]; next[index].status = 'error'; return next; });
    }
  };

  const handleGenerateConcept = async () => {
    if (!botanicalData || designPairings.length === 0) return;
    setIsGeneratingConcept(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
      const prompt = `A beautiful, photorealistic, editorial-style lifestyle photograph of a completed floral wreath hanging on a tasteful front door. The wreath is made primarily of ${botanicalData.name} (${botanicalData.color_palette}), accented beautifully with ${designPairings.map(p => p.name).join(', ')}. Natural lighting, high-end home decor magazine style.`;
      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const result = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const part = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part) setConceptImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    } catch (err) { console.error(err); } finally { setIsGeneratingConcept(false); }
  };

  const handleSaveMainToInventory = async () => {
    if (!botanicalData || !mainFullAssetUrl || !mainSegmentAssetUrl) return;
    const compressedFullUrl = await compressImage(mainFullAssetUrl);
    const compressedSegmentUrl = await compressImage(mainSegmentAssetUrl);
    
    const item = {
      id: `botanical_${botanicalData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      category: "faux_botanical", 
      name: botanicalData.name, 
      dimensions: { 
        full_stem_length_inches: botanicalData.full_stem_length_inches,
        segment_yield: botanicalData.segment_yield,
        segment_length_inches: botanicalData.segment_length_inches
      },
      visualizer_asset: compressedSegmentUrl, 
      full_stem_asset: compressedFullUrl,
      metadata: { palette: botanicalData.color_palette }, 
      marketingCopy: marketingCopy || ''
    };
    addToInventory(item);
    setIsMainSaved(true);
  };

  const handleSavePairingToInventory = async (pairing, index) => {
    if (!pairing.blueprint || !pairing.fullPngUrl || !pairing.segmentPngUrl) return;
    const compressedFullUrl = await compressImage(pairing.fullPngUrl);
    const compressedSegmentUrl = await compressImage(pairing.segmentPngUrl);
    const item = { ...pairing.blueprint, visualizer_asset: compressedSegmentUrl, full_stem_asset: compressedFullUrl };
    addToInventory(item);
    setDesignPairings(prev => { const next = [...prev]; next[index].isSaved = true; return next; });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4">1. Intake</h2>
            <div onClick={() => fileInputRef.current?.click()} className="relative border-2 border-dashed border-stone-300 rounded-xl p-8 text-center cursor-pointer hover:bg-stone-50 transition-all">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              {file ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden flex items-center justify-center">
                    <img src={`data:${mimeType};base64,${originalImageBase64}`} alt="Thumbnail" className="max-w-full max-h-full object-cover" />
                  </div>
                  <p className="text-sm font-medium text-stone-700 truncate px-4">{file.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center mx-auto"><Upload className="w-6 h-6" /></div>
                  <p className="text-sm font-medium text-stone-700">Drop botanical image here</p>
                </div>
              )}
            </div>
            {file && status === 'idle' && (
              <button onClick={processImage} className="w-full mt-6 bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Process Asset</button>
            )}
            {status !== 'idle' && (
               <div className="mt-6 space-y-3">
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${status === 'analyzing' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-500'}`}><Scissors className="w-4 h-4" /> <span className="text-sm">Extracting DNA</span></div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${status === 'painting' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-500'}`}><Palette className="w-4 h-4" /> <span className="text-sm">Rendering Asset</span></div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${status === 'isolating' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-500'}`}><ImageIcon className="w-4 h-4" /> <span className="text-sm">Isolating BG</span></div>
               </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {(status === 'complete' || (mainFullAssetUrl && mainSegmentAssetUrl)) && (
            <>
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">2. Visualizer Assets</h2>
                  <div className="flex gap-2">
                    <button onClick={handleSaveMainToInventory} disabled={isMainSaved} className="flex items-center gap-2 text-xs font-bold bg-emerald-100 text-emerald-800 py-2 px-4 rounded-lg hover:bg-emerald-200 disabled:opacity-50"><Database className="w-4 h-4" /> {isMainSaved ? 'Saved to Catalog' : 'Save to Catalog'}</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Full Stem</p>
                    <div className="w-full aspect-square rounded-xl border border-stone-200 flex items-center justify-center checker-bg p-4 bg-stone-50 relative group" style={{ backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)', backgroundSize: '10px 10px' }}>
                      <button onClick={() => setLightboxImage(mainFullAssetUrl)} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn className="w-4 h-4 text-stone-700" /></button>
                      <img src={mainFullAssetUrl} alt="Full Asset" className="max-h-full object-contain drop-shadow-md cursor-zoom-in" onClick={() => setLightboxImage(mainFullAssetUrl)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Cut Segment</p>
                    <div className="w-full aspect-square rounded-xl border border-stone-200 flex items-center justify-center checker-bg p-4 bg-stone-50 relative group" style={{ backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)', backgroundSize: '10px 10px' }}>
                      <button onClick={() => setLightboxImage(mainSegmentAssetUrl)} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn className="w-4 h-4 text-stone-700" /></button>
                      <img src={mainSegmentAssetUrl} alt="Segment Asset" className="max-h-full object-contain drop-shadow-md cursor-zoom-in" onClick={() => setLightboxImage(mainSegmentAssetUrl)} />
                    </div>
                  </div>
                </div>
              </div>

              {botanicalData && (
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">3. AI Assistants</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 flex flex-col">
                      <div className="flex items-center gap-2 mb-3 text-stone-700 font-medium text-sm"><PenTool className="w-4 h-4" /> Marketing Copy</div>
                      <p className="text-sm text-stone-600 mb-4 flex-grow italic">{marketingCopy ? `"${marketingCopy}"` : "Generate poetic description."}</p>
                      <button onClick={handleGenerateMarketingCopy} disabled={isGeneratingCopy} className="w-full bg-white border border-stone-200 py-2 rounded-lg text-xs font-medium">{isGeneratingCopy ? 'Working...' : '✨ Generate Copy'}</button>
                    </div>
                    <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 flex flex-col">
                      <div className="flex items-center gap-2 mb-3 text-stone-700 font-medium text-sm"><Flower2 className="w-4 h-4" /> Design Pairings</div>
                      <p className="text-sm text-stone-600 mb-4 flex-grow">Generate complimentary stems.</p>
                      <button onClick={handleGeneratePairings} disabled={isGeneratingPairings} className="w-full bg-white border border-stone-200 py-2 rounded-lg text-xs font-medium">{isGeneratingPairings ? 'Working...' : '✨ Suggest Pairings'}</button>
                    </div>
                  </div>
                </div>
              )}

              {designPairings.length > 0 && (
                <div className="bg-stone-900 rounded-2xl p-6 text-stone-100 shadow-lg space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">4. Suggested Pairings Pipeline</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {designPairings.map((pairing, i) => (
                      <div key={i} className="bg-stone-800 rounded-xl p-4 flex flex-col border border-stone-700">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                           <div className="w-full aspect-square bg-stone-900 rounded-lg flex items-center justify-center p-1 relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)', backgroundSize: '10px 10px' }}>
                             {pairing.status === 'complete' && pairing.fullPngUrl ? (
                               <img src={pairing.fullPngUrl} alt={`${pairing.name} full`} className="max-w-full max-h-full object-contain drop-shadow-md cursor-zoom-in" onClick={() => setLightboxImage(pairing.fullPngUrl)} />
                             ) : (
                               <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                             )}
                           </div>
                           <div className="w-full aspect-square bg-stone-900 rounded-lg flex items-center justify-center p-1 relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)', backgroundSize: '10px 10px' }}>
                             {pairing.status === 'complete' && pairing.segmentPngUrl ? (
                               <img src={pairing.segmentPngUrl} alt={`${pairing.name} segment`} className="max-w-full max-h-full object-contain drop-shadow-md cursor-zoom-in" onClick={() => setLightboxImage(pairing.segmentPngUrl)} />
                             ) : (
                               <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                             )}
                           </div>
                        </div>
                        <p className="text-sm font-bold text-white leading-tight mb-1">{pairing.name}</p>
                        <p className="text-xs text-stone-400 mb-1">{pairing.segment_length_inches}" Cut Segment</p>
                        <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest mb-4">Yield: {pairing.segment_yield} cuts/stem</p>
                        {pairing.status === 'complete' && (
                           <button onClick={() => handleSavePairingToInventory(pairing, i)} disabled={pairing.isSaved} className="mt-auto w-full py-2 bg-emerald-500 text-stone-900 text-xs font-bold rounded-lg hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-1"><Database className="w-3 h-3"/> {pairing.isSaved ? 'Saved' : 'Save'}</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-stone-800 pt-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400"/> Wreath Concept Mockup</h3>
                        <p className="text-xs text-stone-400 mt-1">Visualize this recipe in an editorial lifestyle photo.</p>
                      </div>
                      <button onClick={handleGenerateConcept} disabled={isGeneratingConcept || designPairings.some(p => p.status !== 'complete')} className="bg-white text-stone-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-200 disabled:opacity-50">
                        {isGeneratingConcept ? 'Rendering...' : 'Generate Photo'}
                      </button>
                    </div>
                    {conceptImage && (
                      <div className="w-full aspect-video rounded-xl overflow-hidden border border-stone-700 relative">
                        <img src={conceptImage} alt="Concept Mockup" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLightboxImage(conceptImage)} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-stone-900/90 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-stone-300"><X className="w-8 h-8" /></button>
          <img src={lightboxImage} alt="Enlarged View" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

// --- MAIN APP (Routing & Dashboard) ---
export default function App() {
  const [currentRoute, setCurrentRoute] = useState('marketing');
  const [inventory, setInventory] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const invRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory');
    const unsub = onSnapshot(invRef, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      setInventory(items);
    }, (err) => console.error(err));
    return () => unsub();
  }, [user]);

  const addToInventory = async (item) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', item.id);
      await setDoc(docRef, item);
    } catch (e) { console.error("Failed to save:", e); }
  };

  const deleteFromInventory = async (itemId) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', itemId);
      await deleteDoc(docRef);
    } catch (e) { console.error("Failed to delete:", e); }
  };

  if (currentRoute === 'marketing') {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-200">
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Evercrafted
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentRoute('ingester')} className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Sign In</button>
              <button onClick={() => setCurrentRoute('ingester')} className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm">Start Ingesting</button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" /> The Botanical OS is Here
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-stone-900 leading-tight">
              Digitize your physical <span className="text-emerald-600">botanical inventory.</span>
            </h1>
            <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
              The complete pipeline for faux botanical designers. Upload raw photos, extract dimensional DNA, generate transparent editorial assets, and mathematically design wreaths in our visualizer engine.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button onClick={() => setCurrentRoute('ingester')} className="w-full sm:w-auto bg-stone-900 text-white px-8 py-4 rounded-xl font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Open Workspace <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentRoute('ingester')} className="w-full sm:w-auto bg-white border border-stone-200 text-stone-700 px-8 py-4 rounded-xl font-medium hover:bg-stone-50 transition-colors">
                View Demo
              </button>
            </div>
          </div>
        </section>

        {/* Pipeline/Features Grid */}
        <section className="py-24 bg-white border-y border-stone-200 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">The Deterministic Design Pipeline</h2>
              <p className="text-stone-500 max-w-xl mx-auto text-lg">AI interprets style. Geometry places the stems. A perfect bridge between physical inventory and digital planning.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-white rounded-2xl border border-stone-200 flex items-center justify-center mb-6 shadow-sm">
                  <Database className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">1. AI Asset Ingestion</h3>
                <p className="text-stone-600 leading-relaxed">Upload a standard photo of a faux stem. Our vision models automatically extract its botanical name, estimate its physical length in cm, and isolate the background.</p>
              </div>
              <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-white rounded-2xl border border-stone-200 flex items-center justify-center mb-6 shadow-sm">
                  <Layers className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">2. EC_CANON Blueprints</h3>
                <p className="text-stone-600 leading-relaxed">Every ingested asset is formatted into a strict JSON blueprint containing color palettes, geometry config, and suggested AI pairings to feed the master engine.</p>
              </div>
              <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-white rounded-2xl border border-stone-200 flex items-center justify-center mb-6 shadow-sm">
                  <LayoutDashboard className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Visualizer Engine</h3>
                <p className="text-stone-600 leading-relaxed">Drag and drop your digital assets onto a deterministic canvas. Watch as polar coordinate math perfectly snaps your stems to the geometric wreath curve.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 px-6 bg-stone-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Plans for every studio size</h2>
              <p className="text-stone-500 text-lg">Simple, transparent pricing for independent florists and large-scale botanical operations.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
              {/* Basic Tier */}
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-stone-900 mb-2">Artisan</h3>
                <div className="flex items-baseline gap-1 mb-6"><span className="text-5xl font-bold tracking-tight">$29</span><span className="text-stone-500 font-medium">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  {['Up to 500 catalog items', 'Standard AI ingestion', 'Basic Visualizer Engine', 'Email Support'].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-stone-600 font-medium"><Check className="w-5 h-5 text-emerald-500 flex-shrink-0" /> {f}</li>
                  ))}
                </ul>
                <button onClick={() => setCurrentRoute('ingester')} className="w-full py-3.5 rounded-xl border-2 border-stone-200 font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors">Start Free Trial</button>
              </div>
              
              {/* Pro Tier */}
              <div className="bg-stone-900 p-8 rounded-3xl border border-stone-800 shadow-2xl relative scale-100 md:scale-105 z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-stone-900 text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg">Most Popular</div>
                <h3 className="text-xl font-bold text-white mb-2">Studio</h3>
                <div className="flex items-baseline gap-1 mb-6"><span className="text-5xl font-bold tracking-tight text-white">$79</span><span className="text-stone-400 font-medium">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  {['Unlimited catalog items', 'Priority AI generation', 'AI Pairings & Copywriter', 'Firebase Cloud Sync'].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-stone-300 font-medium"><Check className="w-5 h-5 text-emerald-500 flex-shrink-0" /> {f}</li>
                  ))}
                </ul>
                <button onClick={() => setCurrentRoute('ingester')} className="w-full py-3.5 rounded-xl bg-emerald-500 text-stone-900 font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">Start Free Trial</button>
              </div>

              {/* Enterprise Tier */}
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-stone-900 mb-2">Enterprise</h3>
                <div className="flex items-baseline gap-1 mb-6"><span className="text-5xl font-bold tracking-tight">Custom</span></div>
                <ul className="space-y-4 mb-8">
                  {['White-label Visualizer', 'Custom AI model training', 'API Access', 'Dedicated Account Manager'].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-stone-600 font-medium"><Check className="w-5 h-5 text-emerald-500 flex-shrink-0" /> {f}</li>
                  ))}
                </ul>
                <button onClick={() => setCurrentRoute('ingester')} className="w-full py-3.5 rounded-xl border-2 border-stone-200 font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors">Contact Sales</button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Footer Placeholder */}
        <footer className="bg-stone-900 text-stone-400 py-12 text-center text-sm border-t border-stone-800">
          <div className="flex items-center justify-center gap-2 font-bold text-lg text-stone-300 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-500" /> Evercrafted
          </div>
          <p>© {new Date().getFullYear()} Evercrafted Botanical OS. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row font-sans text-stone-900 selection:bg-emerald-200">
       <aside className="w-full md:w-64 bg-stone-900 text-stone-300 p-6 flex flex-col gap-2 shrink-0">
          <div className="text-white font-bold text-xl mb-8 flex items-center gap-2 cursor-pointer" onClick={() => setCurrentRoute('marketing')}>
             <Sparkles className="text-emerald-500 w-5 h-5" /> Evercrafted
          </div>
          <button onClick={() => setCurrentRoute('ingester')} className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-sm font-medium ${currentRoute === 'ingester' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
             <Box className="w-4 h-4" /> Asset Ingester
          </button>
          <button onClick={() => setCurrentRoute('visualizer')} className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-sm font-medium ${currentRoute === 'visualizer' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
             <LayoutDashboard className="w-4 h-4" /> Visualizer Engine
          </button>
          <button onClick={() => setCurrentRoute('catalog')} className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-sm font-medium ${currentRoute === 'catalog' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
             <Database className="w-4 h-4" /> Inventory Catalog
          </button>
       </aside>

       <main className="flex-1 h-screen overflow-y-auto bg-stone-50 p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
             {currentRoute === 'ingester' && <IngesterTool addToInventory={addToInventory} />}
             {currentRoute === 'visualizer' && <VisualizerEngine inventory={inventory} />}
             {currentRoute === 'catalog' && (
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm animate-in fade-in">
                  <h2 className="text-lg font-bold text-stone-800 mb-6 flex items-center justify-between">
                     Inventory Catalog
                     <span className="text-sm font-medium bg-stone-100 px-3 py-1 rounded-full text-stone-600">{inventory.length} Items</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {inventory.map(item => (
                        <div key={item.id} className="border border-stone-200 rounded-xl p-4 flex flex-col bg-stone-50 group">
                           <div className="grid grid-cols-2 gap-2 mb-3">
                             <div className="w-full aspect-square bg-white border border-stone-200 rounded-lg flex items-center justify-center p-2 checker-bg relative" style={{ backgroundImage: 'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)', backgroundSize: '10px 10px' }}>
                                <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wider text-stone-400 bg-white/80 px-1 rounded">Full</span>
                                <img src={item.full_stem_asset || item.visualizer_asset} alt={item.name} className="max-w-full max-h-full object-contain" />
                             </div>
                             <div className="w-full aspect-square bg-white border border-stone-200 rounded-lg flex items-center justify-center p-2 checker-bg relative" style={{ backgroundImage: 'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)', backgroundSize: '10px 10px' }}>
                                <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wider text-stone-400 bg-white/80 px-1 rounded">Cut</span>
                                <img src={item.visualizer_asset} alt={item.name} className="max-w-full max-h-full object-contain" />
                             </div>
                           </div>
                           <p className="text-sm font-semibold text-stone-800 truncate">{item.name}</p>
                           <p className="text-xs text-stone-500 mb-1">{item.dimensions?.segment_length_inches || item.dimensions?.length_inches || 0}" Cut Segment</p>
                           <p className="text-[10px] text-emerald-600 uppercase tracking-widest mb-3 font-medium">Yield: {item.dimensions?.segment_yield || 1} cuts/stem</p>
                           <button onClick={() => deleteFromInventory(item.id)} className="mt-auto flex items-center justify-center gap-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3 h-3" /> Delete
                           </button>
                        </div>
                     ))}
                     {inventory.length === 0 && (
                        <div className="col-span-full py-16 text-center text-stone-400 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
                           <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                           <p>Your inventory is empty. Start ingesting assets!</p>
                        </div>
                     )}
                  </div>
                </div>
             )}
          </div>
       </main>
    </div>
  );
}