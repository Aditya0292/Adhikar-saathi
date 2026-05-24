import { useState, useRef } from 'react';

interface DocUploadProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

export default function DocUpload({ onUpload, isProcessing }: DocUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {/* Mobile View: Large Buttons */}
      <div className="flex md:hidden flex-col sm:flex-row gap-4 w-full">
        <button 
          disabled={isProcessing}
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center p-6 bg-white border-2 border-primary-200 rounded-xl shadow-sm hover:bg-primary-50 transition-colors min-h-[120px]"
        >
          <span className="text-3xl mb-2">📷</span>
          <span className="font-semibold text-primary-900">Take Photo</span>
          <input type="file" accept="image/*;capture=environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
        </button>
        
        <button 
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors min-h-[120px]"
        >
          <span className="text-3xl mb-2">📄</span>
          <span className="font-semibold text-slate-700">Upload File</span>
          <input type="file" accept=".pdf,image/jpeg,image/png" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </button>
      </div>

      {/* Desktop View: Drag & Drop Zone */}
      <div 
        className={`hidden md:flex flex-col items-center justify-center w-full min-h-[250px] border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${isDragging ? 'border-accent bg-accent/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-primary-400'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <div className="text-5xl text-slate-400 mb-4">📄</div>
        <p className="text-lg font-medium text-slate-700 mb-1">Drag and drop your legal document here</p>
        <p className="text-sm text-slate-500 mb-4">or click to browse from your computer</p>
        <p className="text-xs text-slate-400">Supports PDF, JPG, PNG (Max 10MB)</p>
      </div>

      {isProcessing && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-center text-blue-800">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Scanning document for legal risks...
        </div>
      )}
    </div>
  );
}
