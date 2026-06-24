import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, RotateCw, Move, Palette, Heart, Brain, Sparkles, Target, Grid, Eye, Camera, Layers, Settings, Plus, Search, Filter, BookOpen, Wand2, Leaf, Flower, RefreshCw, Trash2, ZoomIn, ZoomOut, Lock, Unlock, Save } from 'lucide-react';

// Blueprint Data (sample)
const SAMPLE_BLUEPRINT = {
  metadata: {
    designId: "WB-2025-001",
    title: "Grandmother's Garden Memory",
    subtitle: "Therapeutic Memorial Wreath"
  },
  specifications: {
    canvas: {
      displayDimensions: { width: 600, height: 600 },
      centerPoint: { x: 300, y: 300 }
    }
  },
  components: [
    {
      id: "base-001",
      name: "Natural Grapevine Foundation",
      type: "base",
      position: { x: 300, y: 300, clockPosition: "center" },
      transform: { rotation: 0, scale: 1.0, zIndex: 1 },
      product: { code: "BASE-GV-18", cost: 45.00 },
      emotional: { symbolism: "Strong foundation for growth" }
    },
    {
      id: "grn-001", 
      name: "Silver Eucalyptus Spray",
      type: "greenery",
      position: { x: 235, y: 195, clockPosition: "11:00" },
      transform: { rotation: 25, scale: 0.85, zIndex: 3 },
      product: { code: "GRN-EU-SLV-08", cost: 18.00 },
      emotional: { symbolism: "Cleansing the pain, preserving the love" }
    },
    {
      id: "flr-001",
      name: "White Garden Rose 'Patience'",
      type: "florals", 
      position: { x: 300, y: 180, clockPosition: "12:00" },
      transform: { rotation: 10, scale: 1.1, zIndex: 6 },
      product: { code: "FLR-RS-WHT-PAT", cost: 18.00 },
      emotional: { symbolism: "Pure love that transcends time" }
    },
    {
      id: "flr-002",
      name: "Cream Peony 'Sarah Bernhardt'", 
      type: "florals",
      position: { x: 420, y: 300, clockPosition: "3:00" },
      transform: { rotation: -15, scale: 1.0, zIndex: 7 },
      product: { code: "FLR-PN-CRM-SB", cost: 25.00 },
      emotional: { symbolism: "The abundance of her love" }
    }
  ]
};

interface WreathComponent {
  id: string;
  name: string;
  type: 'base' | 'greenery' | 'florals' | 'berries' | 'accents';
  position: { x: number; y: number; clockPosition?: string };
  transform: { rotation: number; scale: number; zIndex: number };
  product: { code: string; cost: number };
  emotional: { symbolism: string };
  imageUrl?: string;
  imageFile?: File;
  opacity?: number;
  locked?: boolean;
}

const WreathVisualizerApp: React.FC = () => {
  // State Management
  const [components, setComponents] = useState<WreathComponent[]>(
    SAMPLE_BLUEPRINT.components.map(comp => ({
      ...comp,
      opacity: 1,
      locked: false,
      imageUrl: undefined
    }))
  );
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: HTMLImageElement }>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image Upload Handler - FIXED VERSION
  const handleImageUpload = useCallback((componentId: string, file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, GIF)');
      return;
    }

    console.log('Starting upload for component:', componentId);
    setUploadingId(componentId);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      console.log('File read successfully, creating image element...');
      
      // Create and load the image element
      const img = new Image();
      
      img.onload = () => {
        console.log('Image loaded successfully:', img.width, 'x', img.height);
        
        // Store the loaded image
        setLoadedImages(prev => ({
          ...prev,
          [componentId]: img
        }));
        
        // Update component with image URL
        setComponents(prev => prev.map(comp => 
          comp.id === componentId 
            ? { ...comp, imageUrl, imageFile: file }
            : comp
        ));
        
        setUploadingId(null);
        console.log('Upload complete for component:', componentId);
      };
      
      img.onerror = (error) => {
        console.error('Failed to load image:', error);
        alert('Failed to load the image. Please try a different file.');
        setUploadingId(null);
      };
      
      img.src = imageUrl;
    };
    
    reader.onerror = (error) => {
      console.error('Failed to read file:', error);
      alert('Failed to read the file. Please try again.');
      setUploadingId(null);
    };
    
    reader.readAsDataURL(file);
  }, []);

  // Component Position Update
  const updateComponentPosition = useCallback((id: string, updates: Partial<WreathComponent>) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, ...updates } : comp
    ));
  }, []);

  // Canvas Drawing
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 600, 600);

    // Apply zoom
    ctx.save();
    ctx.scale(canvasZoom, canvasZoom);

    // Draw background gradient
    const gradient = ctx.createRadialGradient(300, 300, 0, 300, 300, 300);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.7, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 600);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      for (let i = 0; i <= 600; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 600);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(600, i);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw center point
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(300, 300, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Draw clock markers
    for (let hour = 0; hour < 12; hour++) {
      const angle = (hour * 30 - 90) * (Math.PI / 180);
      const x1 = 300 + 140 * Math.cos(angle);
      const y1 = 300 + 140 * Math.sin(angle);
      const x2 = 300 + 150 * Math.cos(angle);
      const y2 = 300 + 150 * Math.sin(angle);
      
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Hour labels
      const labelX = 300 + 160 * Math.cos(angle);
      const labelY = 300 + 160 * Math.sin(angle);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hour === 0 ? '12' : hour.toString(), labelX, labelY);
    }

    // Draw components in z-index order
    const sortedComponents = [...components].sort((a, b) => a.transform.zIndex - b.transform.zIndex);
    
    sortedComponents.forEach(component => {
      ctx.save();
      
      // Apply transformations
      ctx.translate(component.position.x, component.position.y);
      ctx.rotate(component.transform.rotation * Math.PI / 180);
      ctx.scale(component.transform.scale, component.transform.scale);
      ctx.globalAlpha = component.opacity || 1;

      const loadedImage = loadedImages[component.id];
      
      if (loadedImage) {
        // Draw uploaded image
        const size = component.type === 'base' ? 120 : 80;
        ctx.drawImage(loadedImage, -size/2, -size/2, size, size);
        
        // Add a subtle border for better visibility
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-size/2, -size/2, size, size);
        
      } else {
        // Draw placeholder
        const colors = {
          'base': '#8B4513',
          'greenery': '#22C55E', 
          'florals': '#EC4899',
          'berries': '#DC2626',
          'accents': '#F59E0B'
        };
        
        const size = component.type === 'base' ? 40 : 30;
        ctx.fillStyle = colors[component.type] || '#6B7280';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, 2 * Math.PI);
        ctx.fill();
        
        // Component name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = component.type === 'base' ? '12px Arial' : '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const nameWords = component.name.split(' ');
        ctx.fillText(nameWords[0], 0, -3);
        if (nameWords[1]) {
          ctx.fillText(nameWords[1], 0, 8);
        }
        
        // Upload prompt
        ctx.fillStyle = '#6B7280';
        ctx.font = '8px Arial';
        ctx.fillText('📷 Click to upload', 0, size + 15);
      }

      // Lock indicator
      if (component.locked) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '12px Arial';
        ctx.fillText('🔒', 35, -35);
      }

      ctx.restore();

      // Selection indicator (draw outside of transform context)
      if (selectedComponentId === component.id) {
        ctx.save();
        ctx.translate(component.position.x, component.position.y);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        const selectionSize = (component.type === 'base' ? 70 : 50) * component.transform.scale;
        ctx.strokeRect(-selectionSize, -selectionSize, selectionSize * 2, selectionSize * 2);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Coordinate display
      if (showCoordinates && !loadedImages[component.id]) {
        ctx.fillStyle = '#374151';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `(${Math.round(component.position.x)}, ${Math.round(component.position.y)})`, 
          component.position.x, 
          component.position.y + 60
        );
        if (component.position.clockPosition) {
          ctx.fillText(component.position.clockPosition, component.position.x, component.position.y + 72);
        }
      }
    });

    ctx.restore();
  }, [components, selectedComponentId, showGrid, showCoordinates, canvasZoom, loadedImages]);

  // Canvas Event Handlers
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasZoom;
    const y = (e.clientY - rect.top) / canvasZoom;

    // Find clicked component
    const clickedComponent = components.find(comp => {
      const distance = Math.sqrt(
        Math.pow(comp.position.x - x, 2) + Math.pow(comp.position.y - y, 2)
      );
      return distance < 50;
    });

    if (clickedComponent) {
      if (!clickedComponent.imageUrl) {
        // Trigger image upload
        setSelectedComponentId(clickedComponent.id);
        console.log('Triggering file input for component:', clickedComponent.id);
        fileInputRef.current?.click();
      } else {
        setSelectedComponentId(clickedComponent.id);
      }
    } else {
      setSelectedComponentId(null);
    }
  }, [components, canvasZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!selectedComponentId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasZoom;
    const y = (e.clientY - rect.top) / canvasZoom;

    const component = components.find(c => c.id === selectedComponentId);
    if (component && !component.locked) {
      setDragOffset({
        x: x - component.position.x,
        y: y - component.position.y
      });
      setIsDragging(true);
    }
  }, [selectedComponentId, components, canvasZoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedComponentId || !dragOffset) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasZoom;
    const y = (e.clientY - rect.top) / canvasZoom;

    updateComponentPosition(selectedComponentId, {
      position: {
        x: Math.max(50, Math.min(550, x - dragOffset.x)),
        y: Math.max(50, Math.min(550, y - dragOffset.y))
      }
    });
  }, [isDragging, selectedComponentId, dragOffset, canvasZoom, updateComponentPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset(null);
  }, []);

  // File input handler - FIXED VERSION
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed');
    const file = e.target.files?.[0];
    
    if (file && selectedComponentId) {
      console.log('Processing file:', file.name, 'for component:', selectedComponentId);
      handleImageUpload(selectedComponentId, file);
    } else {
      console.log('No file or no selected component:', { file: !!file, selectedComponentId });
    }
    
    // Reset input value to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  }, [selectedComponentId, handleImageUpload]);

  // Import blueprint function
  const importBlueprint = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const blueprint = JSON.parse(event.target?.result as string);
            if (blueprint.components) {
              setComponents(blueprint.components.map((comp: any) => ({
                ...comp,
                opacity: comp.opacity || 1,
                locked: comp.locked || false,
                imageUrl: undefined // Reset images on import
              })));
              setLoadedImages({}); // Clear loaded images
              alert('Blueprint imported successfully!');
            }
          } catch (error) {
            alert('Error parsing blueprint file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  // Export functionality
  const exportDesign = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `wreath_design_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  // Load blueprint
  const loadBlueprint = useCallback(() => {
    setComponents(SAMPLE_BLUEPRINT.components.map(comp => ({
      ...comp,
      opacity: 1,
      locked: false,
      imageUrl: undefined
    })));
    setLoadedImages({});
    setSelectedComponentId(null);
  }, []);

  // Effects
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Redraw canvas when images load
  useEffect(() => {
    const timer = setTimeout(() => {
      drawCanvas();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadedImages, drawCanvas]);

  const selectedComponent = components.find(c => c.id === selectedComponentId);
  const totalCost = components.reduce((sum, comp) => sum + comp.product.cost, 0);
  const uploadedCount = components.filter(c => c.imageUrl).length;

  return (
    <div className="min-h-screen bg-gray-50 font-['Alegreya']">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center">
                <Flower className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{SAMPLE_BLUEPRINT.metadata.title}</h1>
                <p className="text-gray-600">{SAMPLE_BLUEPRINT.metadata.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={exportDesign}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export PNG</span>
              </button>
              <button 
                onClick={importBlueprint}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Import Blueprint</span>
              </button>
              <button 
                onClick={loadBlueprint}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Load Sample</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Component Library */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-blue-900" />
                Component Library
              </h3>
              
              <div className="space-y-4">
                {Object.entries(
                  components.reduce((acc, comp) => {
                    if (!acc[comp.type]) acc[comp.type] = [];
                    acc[comp.type].push(comp);
                    return acc;
                  }, {} as Record<string, WreathComponent[]>)
                ).map(([type, typeComponents]) => (
                  <div key={type} className="border border-gray-200 rounded-lg p-3">
                    <h4 className="font-semibold text-gray-700 capitalize mb-3 flex items-center">
                      {type}
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                        {typeComponents.length}
                      </span>
                    </h4>
                    
                    <div className="space-y-2">
                      {typeComponents.map(component => (
                        <div
                          key={component.id}
                          onClick={() => setSelectedComponentId(component.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedComponentId === component.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium truncate">{component.name}</h5>
                            {component.locked && <Lock className="w-3 h-3 text-red-500" />}
                          </div>
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Code: {component.product.code}</div>
                            <div>Cost: ${component.product.cost}</div>
                            <div>Position: ({Math.round(component.position.x)}, {Math.round(component.position.y)})</div>
                            {component.position.clockPosition && (
                              <div>Clock: {component.position.clockPosition}</div>
                            )}
                          </div>
                          
                          <div className={`mt-2 w-full h-8 rounded flex items-center justify-center text-xs ${
                            uploadingId === component.id ? 'bg-yellow-100 text-yellow-700' :
                            component.imageUrl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {uploadingId === component.id ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                                <span>Uploading...</span>
                              </div>
                            ) : component.imageUrl ? (
                              '✓ Image Uploaded'
                            ) : (
                              '📷 Click to Upload'
                            )}
                          </div>
                          
                          <div className="mt-2 text-xs italic text-gray-600">
                            "{component.emotional.symbolism}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Upload Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Images Uploaded:</span>
                  <span className="font-semibold text-green-600">
                    {uploadedCount}/{components.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadedCount / components.length) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">
                  {Math.round((uploadedCount / components.length) * 100)}% Complete
                </div>
              </div>
            </div>
          </div>

          {/* Main Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-900" />
                  Wreath Canvas
                </h3>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-2 rounded-lg transition-colors ${
                      showGrid ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowCoordinates(!showCoordinates)}
                    className={`p-2 rounded-lg transition-colors ${
                      showCoordinates ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCanvasZoom(zoom => Math.min(2, zoom + 0.1))}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCanvasZoom(zoom => Math.max(0.5, zoom - 0.1))}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white relative">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="cursor-crosshair block w-full h-auto"
                  style={{ cursor: isDragging ? 'grabbing' : selectedComponentId ? 'grab' : 'crosshair' }}
                />
                
                {/* Zoom indicator */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {Math.round(canvasZoom * 100)}%
                </div>
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-500">
                Blueprint: {SAMPLE_BLUEPRINT.metadata.designId} • Click components to upload images • Drag to reposition
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📷 How to Upload Images:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Click on any component placeholder (circles with "📷 Click to upload")</li>
                  <li>2. Select an image file (JPG, PNG, GIF) from your computer</li>
                  <li>3. The image will automatically appear on the canvas</li>
                  <li>4. Drag uploaded components to reposition them</li>
                  <li>5. Use transform controls to adjust rotation, scale, and other properties</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Transform Controls */}
          <div className="lg:col-span-1 space-y-6">
            {selectedComponent && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-900" />
                  Transform Controls
                </h3>
                
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-1">{selectedComponent.name}</h4>
                    <p className="text-sm text-blue-700">Code: {selectedComponent.product.code}</p>
                    <p className="text-sm text-blue-700">Cost: ${selectedComponent.product.cost}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={Math.round(selectedComponent.position.x)}
                        onChange={(e) => updateComponentPosition(selectedComponent.id, {
                          position: { ...selectedComponent.position, x: parseInt(e.target.value) || 0 }
                        })}
                        disabled={selectedComponent.locked}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        placeholder="X"
                      />
                      <input
                        type="number"
                        value={Math.round(selectedComponent.position.y)}
                        onChange={(e) => updateComponentPosition(selectedComponent.id, {
                          position: { ...selectedComponent.position, y: parseInt(e.target.value) || 0 }
                        })}
                        disabled={selectedComponent.locked}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        placeholder="Y"
                      />
                    </div>
                    {selectedComponent.position.clockPosition && (
                      <div className="mt-1 text-xs text-gray-500">
                        Clock Position: {selectedComponent.position.clockPosition}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rotation ({selectedComponent.transform.rotation}°)
                    </label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selectedComponent.transform.rotation}
                      onChange={(e) => updateComponentPosition(selectedComponent.id, {
                        transform: { ...selectedComponent.transform, rotation: parseInt(e.target.value) }
                      })}
                      disabled={selectedComponent.locked}
                      className="w-full disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scale ({selectedComponent.transform.scale}x)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={selectedComponent.transform.scale}
                      onChange={(e) => updateComponentPosition(selectedComponent.id, {
                        transform: { ...selectedComponent.transform, scale: parseFloat(e.target.value) }
                      })}
                      disabled={selectedComponent.locked}
                      className="w-full disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opacity ({Math.round((selectedComponent.opacity || 1) * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedComponent.opacity || 1}
                      onChange={(e) => updateComponentPosition(selectedComponent.id, {
                        opacity: parseFloat(e.target.value)
                      })}
                      disabled={selectedComponent.locked}
                      className="w-full disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Z-Index</label>
                    <input
                      type="number"
                      value={selectedComponent.transform.zIndex}
                      onChange={(e) => updateComponentPosition(selectedComponent.id, {
                        transform: { ...selectedComponent.transform, zIndex: parseInt(e.target.value) || 1 }
                      })}
                      disabled={selectedComponent.locked}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateComponentPosition(selectedComponent.id, {
                        locked: !selectedComponent.locked
                      })}
                      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        selectedComponent.locked 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {selectedComponent.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      <span>{selectedComponent.locked ? 'Unlock' : 'Lock'}</span>
                    </button>
                    
                    {selectedComponent.imageUrl && (
                      <button
                        onClick={() => {
                          updateComponentPosition(selectedComponent.id, {
                            imageUrl: undefined,
                            imageFile: undefined
                          });
                          setLoadedImages(prev => {
                            const updated = { ...prev };
                            delete updated[selectedComponent.id];
                            return updated;
                          });
                        }}
                        className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <h5 className="font-semibold text-yellow-800 mb-1">Emotional Symbolism</h5>
                    <p className="text-sm text-yellow-700 italic">"{selectedComponent.emotional.symbolism}"</p>
                  </div>

                  {!selectedComponent.imageUrl && (
                    <button
                      onClick={() => {
                        console.log('Manual upload button clicked for:', selectedComponent.id);
                        setSelectedComponentId(selectedComponent.id);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Camera className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-600 font-medium">Upload Component Image</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Design Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Components:</span>
                  <span className="font-semibold">{components.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Images Uploaded:</span>
                  <span className="font-semibold text-green-600">
                    {uploadedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-semibold text-blue-600">${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion:</span>
                  <span className="font-semibold">
                    {Math.round((uploadedCount / components.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Pro Tips</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Click placeholders to upload images</li>
                <li>• Drag uploaded components to move them</li>
                <li>• Use sliders for precise adjustments</li>
                <li>• Lock components to prevent changes</li>
                <li>• Export when complete</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input - FIXED VERSION */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* Upload Progress Overlay */}
      {uploadingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div>
                <h4 className="font-semibold">Uploading Image</h4>
                <p className="text-sm text-gray-600">Processing component image...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
      `}</style>
    </div>
  );
};

export default WreathVisualizerApp;