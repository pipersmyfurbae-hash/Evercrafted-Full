import React, { useState } from 'react';
import { Upload, Eye, Download, Layers, MapPin, Ruler, RotateCcw } from 'lucide-react';

const ChristmasWreathVisualizer = () => {
  const [componentImages, setComponentImages] = useState({
    'evergreen-base': null,
    'noble-fir': null,
    'frosted-pine': null,
    'red-poinsettia': null,
    'burgundy-dahlia': null,
    'white-rose': null,
    'red-berries': null,
    'silver-pinecone': null
  });
  
  const [showGrid, setShowGrid] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAllLayers, setShowAllLayers] = useState(true);

  const componentLabels = {
    'evergreen-base': '24" Evergreen Base (Afloral #14589)',
    'noble-fir': 'Noble Fir Spray (Afloral #13467)',
    'frosted-pine': 'Frosted Pine Spray (Afloral #14223)',
    'red-poinsettia': 'Red Velvet Poinsettia 7" (Afloral #12890)',
    'burgundy-dahlia': 'Burgundy Dahlia 5" (Afloral #13012)',
    'white-rose': 'White Christmas Rose 3" (Afloral #14567)',
    'red-berries': 'Frosted Red Berry Cluster (Afloral #13789)',
    'silver-pinecone': 'Silver Pine Cones (Afloral #14234)'
  };

  const wreathLayers = [
    {
      name: 'Evergreen Base',
      component: 'evergreen-base',
      zIndex: 1,
      positions: [{ x: 300, y: 300, size: 380, rotation: 0, angle: 'Center' }]
    },
    {
      name: 'Foundation Greenery - Noble Fir',
      component: 'noble-fir',
      zIndex: 2,
      positions: [
        { x: 300, y: 120, size: 75, rotation: 0, angle: '12:00', mirror: false },
        { x: 405, y: 165, size: 75, rotation: 45, angle: '1:30', mirror: false },
        { x: 480, y: 300, size: 75, rotation: 90, angle: '3:00', mirror: false },
        { x: 405, y: 435, size: 75, rotation: 135, angle: '4:30', mirror: false },
        { x: 300, y: 480, size: 75, rotation: 180, angle: '6:00', mirror: false },
        { x: 195, y: 435, size: 75, rotation: 225, angle: '7:30', mirror: true },
        { x: 120, y: 300, size: 75, rotation: 270, angle: '9:00', mirror: true },
        { x: 195, y: 165, size: 75, rotation: 315, angle: '10:30', mirror: true }
      ]
    },
    {
      name: 'Accent Greenery - Frosted Pine',
      component: 'frosted-pine',
      zIndex: 3,
      positions: [
        { x: 350, y: 140, size: 70, rotation: 25, angle: '12:30', mirror: false },
        { x: 450, y: 370, size: 70, rotation: 115, angle: '3:30', mirror: false },
        { x: 250, y: 460, size: 70, rotation: 205, angle: '6:30', mirror: true },
        { x: 150, y: 230, size: 70, rotation: 295, angle: '9:30', mirror: true }
      ]
    },
    {
      name: 'Primary Florals - Red Poinsettias',
      component: 'red-poinsettia',
      zIndex: 5,
      positions: [
        { x: 300, y: 150, size: 110, rotation: 0, angle: '12:00 (Top)', mirror: false },
        { x: 430, y: 300, size: 95, rotation: 90, angle: '3:00 (Right)', mirror: false },
        { x: 300, y: 450, size: 110, rotation: 180, angle: '6:00 (Bottom)', mirror: false },
        { x: 170, y: 300, size: 95, rotation: 270, angle: '9:00 (Left)', mirror: true }
      ]
    },
    {
      name: 'Secondary Florals - Burgundy Dahlias',
      component: 'burgundy-dahlia',
      zIndex: 4,
      positions: [
        { x: 400, y: 200, size: 85, rotation: 35, angle: '1:00', mirror: false },
        { x: 420, y: 400, size: 85, rotation: 125, angle: '5:00', mirror: false },
        { x: 200, y: 200, size: 85, rotation: 325, angle: '11:00', mirror: true },
        { x: 180, y: 400, size: 85, rotation: 235, angle: '7:00', mirror: true }
      ]
    },
    {
      name: 'Filler Florals - White Roses',
      component: 'white-rose',
      zIndex: 6,
      positions: [
        { x: 345, y: 120, size: 65, rotation: 15, angle: '1:00', mirror: false },
        { x: 385, y: 145, size: 65, rotation: 30, angle: '2:00', mirror: false },
        { x: 455, y: 340, size: 65, rotation: 120, angle: '4:00', mirror: false },
        { x: 440, y: 380, size: 65, rotation: 150, angle: '5:00', mirror: false },
        { x: 160, y: 380, size: 65, rotation: 210, angle: '7:00', mirror: true },
        { x: 145, y: 340, size: 65, rotation: 240, angle: '8:00', mirror: true },
        { x: 215, y: 145, size: 65, rotation: 330, angle: '10:00', mirror: true },
        { x: 255, y: 120, size: 65, rotation: 345, angle: '11:00', mirror: true }
      ]
    },
    {
      name: 'Berry Accents',
      component: 'red-berries',
      zIndex: 7,
      positions: [
        { x: 320, y: 170, size: 45, rotation: 0, angle: '12:15', mirror: false },
        { x: 380, y: 250, size: 45, rotation: 60, angle: '2:15', mirror: false },
        { x: 430, y: 350, size: 45, rotation: 105, angle: '4:15', mirror: false },
        { x: 350, y: 430, size: 45, rotation: 165, angle: '5:45', mirror: false },
        { x: 250, y: 430, size: 45, rotation: 195, angle: '6:15', mirror: true },
        { x: 170, y: 350, size: 45, rotation: 255, angle: '7:45', mirror: true },
        { x: 220, y: 250, size: 45, rotation: 300, angle: '9:45', mirror: true },
        { x: 280, y: 170, size: 45, rotation: 0, angle: '11:45', mirror: true }
      ]
    },
    {
      name: 'Pine Cone Accents',
      component: 'silver-pinecone',
      zIndex: 8,
      positions: [
        { x: 300, y: 180, size: 55, rotation: 0, angle: '12:00', mirror: false },
        { x: 420, y: 300, size: 55, rotation: 90, angle: '3:00', mirror: false },
        { x: 300, y: 420, size: 55, rotation: 180, angle: '6:00', mirror: false },
        { x: 180, y: 300, size: 55, rotation: 270, angle: '9:00', mirror: true }
      ]
    }
  ];

  const handleImageUpload = (componentType, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setComponentImages(prev => ({
          ...prev,
          [componentType]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const buildWreathByLayers = () => {
    setIsAnimating(true);
    setCurrentLayer(0);
    setShowAllLayers(false);
    
    const interval = setInterval(() => {
      setCurrentLayer(prev => {
        if (prev >= wreathLayers.length - 1) {
          clearInterval(interval);
          setIsAnimating(false);
          setShowAllLayers(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  };

  const downloadBlueprint = () => {
    const blueprintData = {
      name: "Christmas Wreath Blueprint",
      timestamp: new Date().toISOString(),
      layers: wreathLayers.map(layer => ({
        name: layer.name,
        component: componentLabels[layer.component],
        positions: layer.positions.map(pos => ({
          clock_position: pos.angle,
          x_coordinate: pos.x,
          y_coordinate: pos.y,
          rotation_degrees: pos.rotation,
          size_pixels: pos.size,
          mirrored: pos.mirror || false
        }))
      }))
    };
    
    const dataStr = JSON.stringify(blueprintData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `christmas-wreath-blueprint-${Date.now()}.json`);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">Christmas Wreath Blueprint Visualizer</h1>
          <h2 className="text-2xl font-light text-red-700">Precise Afloral.com Product Positioning</h2>
          <p className="text-green-600 mt-2">Upload product images to visualize exact placement with mirroring</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg border border-red-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Afloral Products
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(componentLabels).map(([key, label]) => (
                  <div key={key} className="border border-green-100 rounded-lg p-3 hover:bg-red-50">
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      {label}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(key, e)}
                      className="block w-full text-xs text-green-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                    />
                    {componentImages[key] && (
                      <div className="mt-2">
                        <img 
                          src={componentImages[key]} 
                          alt={label}
                          className="w-12 h-12 object-cover rounded border border-green-200"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">Controls</h3>
              
              <div className="space-y-3">
                <button
                  onClick={buildWreathByLayers}
                  disabled={isAnimating}
                  className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  {isAnimating ? 'Building...' : 'Build by Layers'}
                </button>
                
                <button
                  onClick={() => setShowAllLayers(true)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Show Complete
                </button>
                
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
                >
                  <Ruler className="w-4 h-4 mr-2" />
                  {showGrid ? 'Hide' : 'Show'} Grid
                </button>
                
                <button
                  onClick={() => setShowAngles(!showAngles)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {showAngles ? 'Hide' : 'Show'} Positions
                </button>
                
                <button
                  onClick={downloadBlueprint}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Blueprint
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg border border-red-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-green-800">
                  Christmas Wreath Blueprint
                </h3>
                <div className="text-sm text-red-600">
                  Precise positioning with mirroring
                </div>
              </div>
              
              <div className="relative mx-auto" style={{ width: '600px', height: '600px' }}>
                <div className="w-full h-full relative overflow-visible bg-gradient-to-br from-red-50 to-green-50 rounded-lg">
                  
                  {/* Grid overlay */}
                  {showGrid && (
                    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 100 }}>
                      {/* Clock positions */}
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
                        const radians = (angle - 90) * Math.PI / 180;
                        const x1 = 300 + Math.cos(radians) * 190;
                        const y1 = 300 + Math.sin(radians) * 190;
                        const x2 = 300 + Math.cos(radians) * 210;
                        const y2 = 300 + Math.sin(radians) * 210;
                        return (
                          <line
                            key={angle}
                            x1={x1} y1={y1}
                            x2={x2} y2={y2}
                            stroke="#10b981"
                            strokeWidth="2"
                            opacity="0.5"
                          />
                        );
                      })}
                      <circle cx="300" cy="300" r="190" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3" />
                      <circle cx="300" cy="300" r="95" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3" strokeDasharray="5,5" />
                    </svg>
                  )}
                  
                  {/* Wreath components */}
                  {wreathLayers.map((layer, layerIndex) => {
                    const shouldShow = showAllLayers || layerIndex <= currentLayer;
                    const image = componentImages[layer.component];
                    
                    return shouldShow ? layer.positions.map((pos, posIndex) => (
                      <div key={`${layerIndex}-${posIndex}`}>
                        {/* Placeholder circle if no image */}
                        {!image && (
                          <div
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out"
                            style={{
                              left: pos.x,
                              top: pos.y,
                              width: pos.size,
                              height: pos.size,
                              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
                              zIndex: layer.zIndex,
                              opacity: shouldShow ? 0.8 : 0
                            }}
                          >
                            <div className={`w-full h-full rounded-full border-2 ${
                              layer.component === 'evergreen-base' ? 'bg-green-200 border-green-400' :
                              layer.component.includes('fir') || layer.component.includes('pine') ? 'bg-green-300 border-green-500' :
                              layer.component.includes('poinsettia') ? 'bg-red-300 border-red-500' :
                              layer.component.includes('dahlia') ? 'bg-purple-300 border-purple-500' :
                              layer.component.includes('rose') ? 'bg-pink-200 border-pink-400' :
                              layer.component.includes('berries') ? 'bg-red-400 border-red-600' :
                              'bg-gray-300 border-gray-500'
                            } flex items-center justify-center`}>
                              <span className="text-xs font-semibold text-gray-700">
                                {layer.component.split('-').map(w => w[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Actual image if uploaded */}
                        {image && (
                          <div
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out"
                            style={{
                              left: pos.x,
                              top: pos.y,
                              width: pos.size,
                              height: pos.size,
                              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) ${pos.mirror ? 'scaleX(-1)' : ''}`,
                              zIndex: layer.zIndex,
                              opacity: shouldShow ? 1 : 0
                            }}
                          >
                            <img 
                              src={image}
                              alt={`${layer.name} ${posIndex + 1}`}
                              className="w-full h-full object-contain drop-shadow-lg"
                            />
                            {pos.mirror && (
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Mirrored
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Position labels */}
                        {showAngles && shouldShow && (
                          <div
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                              left: pos.x,
                              top: pos.y,
                              zIndex: 200
                            }}
                          >
                            <div className="bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              {pos.angle}<br/>
                              x:{pos.x} y:{pos.y}<br/>
                              {pos.rotation}°
                            </div>
                          </div>
                        )}
                      </div>
                    )) : null;
                  })}

                  {/* Center crosshair */}
                  <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-60" style={{ zIndex: 150 }}></div>
                </div>

                {/* Layer information */}
                <div className="mt-6 bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3">Layer Information</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {wreathLayers.map((layer, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded ${
                          showAllLayers || index <= currentLayer ? 'bg-white border border-green-300' : 'bg-gray-100 opacity-50'
                        }`}
                      >
                        <span className="text-sm font-medium text-green-700">
                          Layer {index + 1}: {layer.name}
                        </span>
                        <span className="text-xs text-green-600">
                          {layer.positions.length} items
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChristmasWreathVisualizer;