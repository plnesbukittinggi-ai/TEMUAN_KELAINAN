
import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Pencil, Square, Circle as CircleIcon, RotateCcw, Trash2, Check, X, MousePointer2 } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [tool, setTool] = useState<'pencil' | 'rect' | 'circle' | 'select'>('pencil');
  const [color, setColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(5);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isMounted = true;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth > 500 ? 500 : window.innerWidth - 40,
      height: 500,
      backgroundColor: '#f8fafc',
    });

    fabricCanvasRef.current = canvas;

    fabric.Image.fromURL(imageUrl, (img: fabric.Image) => {
      if (!isMounted || !canvas) return;
      
      // Scale image to fit canvas
      const canvasWidth = canvas.width || 500;
      const canvasHeight = canvas.height || 500;
      
      const scaleX = canvasWidth / (img.width || 1);
      const scaleY = canvasHeight / (img.height || 1);
      const scale = Math.min(scaleX, scaleY);

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: (canvasWidth - (img.width || 0) * scale) / 2,
        top: (canvasHeight - (img.height || 0) * scale) / 2,
        selectable: false,
        evented: false,
      });

      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    }, { crossOrigin: 'anonymous' });

    // Set initial tool
    updateBrush(canvas, 'pencil');

    return () => {
      isMounted = false;
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [imageUrl]);

  const updateBrush = (canvas: fabric.Canvas, currentTool: string) => {
    canvas.isDrawingMode = currentTool === 'pencil';
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    }
  };

  useEffect(() => {
    if (fabricCanvasRef.current) {
      updateBrush(fabricCanvasRef.current, tool);
    }
  }, [tool, color, brushSize]);

  const handleMouseDown = (options: fabric.IEvent) => {
    if (tool === 'pencil' || tool === 'select' || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(options.e);
    const startX = pointer.x;
    const startY = pointer.y;

    let shape: fabric.Object;

    if (tool === 'rect') {
      shape = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: color,
        strokeWidth: brushSize,
        selectable: true,
      });
    } else {
      shape = new fabric.Circle({
        left: startX,
        top: startY,
        radius: 0,
        fill: 'transparent',
        stroke: color,
        strokeWidth: brushSize,
        selectable: true,
      });
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);

    const onMouseMove = (moveOptions: fabric.IEvent) => {
      const movePointer = canvas.getPointer(moveOptions.e);
      if (tool === 'rect') {
        (shape as fabric.Rect).set({
          width: Math.abs(startX - movePointer.x),
          height: Math.abs(startY - movePointer.y),
          left: Math.min(startX, movePointer.x),
          top: Math.min(startY, movePointer.y),
        });
      } else {
        const radius = Math.sqrt(Math.pow(startX - movePointer.x, 2) + Math.pow(startY - movePointer.y, 2)) / 2;
        (shape as fabric.Circle).set({
          radius: radius,
          left: Math.min(startX, movePointer.x),
          top: Math.min(startY, movePointer.y),
        });
      }
      canvas.renderAll();
    };

    const onMouseUp = () => {
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
      setTool('select');
    };

    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
  };

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.on('mouse:down', handleMouseDown);
      return () => {
        canvas.off('mouse:down', handleMouseDown);
      };
    }
  }, [tool, color, brushSize]);

  const handleUndo = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();
    if (objects.length > 1) { // Keep the background image
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  };

  const handleClear = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();
    // Remove everything except the first object (background image)
    for (let i = objects.length - 1; i > 0; i--) {
      canvas.remove(objects[i]);
    }
    canvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvasRef.current) return;
    // Export with high quality
    const dataUrl = fabricCanvasRef.current.toDataURL({
      format: 'jpeg',
      quality: 0.8,
    });
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[2000] flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Edit Foto Temuan</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Tandai objek yang bermasalah</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-all shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 bg-slate-200/50 overflow-hidden">
          <div className="shadow-2xl rounded-lg overflow-hidden bg-white">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button 
              onClick={() => setTool('select')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${tool === 'select' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              title="Pilih Objek"
            >
              <MousePointer2 size={20} />
            </button>
            <button 
              onClick={() => setTool('pencil')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${tool === 'pencil' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              title="Pensil"
            >
              <Pencil size={20} />
            </button>
            <button 
              onClick={() => setTool('rect')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${tool === 'rect' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              title="Kotak"
            >
              <Square size={20} />
            </button>
            <button 
              onClick={() => setTool('circle')}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${tool === 'circle' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              title="Lingkaran"
            >
              <CircleIcon size={20} />
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1" />
            <button 
              onClick={handleUndo}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
              title="Urungkan"
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={handleClear}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:bg-red-100 transition-all"
              title="Hapus Semua"
            >
              <Trash2 size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warna:</p>
              <div className="flex gap-2">
                {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ffffff', '#000000'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-125 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ukuran:</p>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 accent-slate-900"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Selesai & Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
