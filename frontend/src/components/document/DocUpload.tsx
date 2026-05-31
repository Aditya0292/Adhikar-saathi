import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, FileText, Image, X, AlertCircle, Lightbulb } from 'lucide-react';

interface DocUploadProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
}

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
const MAX_SIZE_MB = 20;

function getFileIcon(type: string) {
  if (type === 'application/pdf') return <FileText size={18} className="text-red-500" />;
  return <Image size={18} className="text-blue-500" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocUpload({ onUpload, isUploading, uploadProgress }: DocUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback((file: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF, JPEG, or PNG file.');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum ${MAX_SIZE_MB}MB allowed.`);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  }, [validateAndSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      validateAndSelect(e.target.files[0]);
    }
    // Reset so re-selecting same file works
    e.target.value = '';
  }, [validateAndSelect]);

  const handleSubmit = () => {
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Selected View */}
      <AnimatePresence>
        {selectedFile && !isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-black/8 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                {getFileIcon(selectedFile.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-nyaya-text-dark truncate">
                  {selectedFile.name.length > 35 
                    ? selectedFile.name.slice(0, 32) + '...' 
                    : selectedFile.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatSize(selectedFile.size)} · {selectedFile.type.split('/')[1]?.toUpperCase()}
                </p>
              </div>
              <button
                onClick={clearFile}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <button
              onClick={handleSubmit}
              className="mt-4 w-full py-3 bg-nyaya-green hover:bg-nyaya-green-mid text-white font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              Scan Document
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/8 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-nyaya-green/10 rounded-xl flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                >
                  <Upload size={18} className="text-nyaya-green-bright" />
                </motion.div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-nyaya-text-dark">
                  {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{uploadProgress}%</p>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #2D6A4F, #52B788)' }}
                initial={{ width: '0%' }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Area (shown when no file selected and not uploading) */}
      {!selectedFile && !isUploading && (
        <>
          {/* Mobile: Two buttons */}
          <div className="flex md:hidden flex-col gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-3 p-5 bg-nyaya-green hover:bg-nyaya-green-mid text-white font-semibold rounded-2xl shadow-sm transition-colors cursor-pointer"
            >
              <Camera size={22} />
              <span>Take Photo of Document</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleFileChange}
              />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Upload size={20} />
              <span>Upload Saved File</span>
            </button>
          </div>

          {/* Desktop: Drag & Drop */}
          <div
            className={`hidden md:flex flex-col items-center justify-center w-full min-h-[280px] border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${
              isDragging
                ? 'border-nyaya-green-bright bg-nyaya-green-bright/5 scale-[1.01]'
                : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-nyaya-green-mid'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <motion.div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                isDragging ? 'bg-nyaya-green-bright/10' : 'bg-slate-100'
              }`}
              animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <FileText size={28} className={isDragging ? 'text-nyaya-green-bright' : 'text-slate-400'} />
            </motion.div>
            <p className="text-lg font-semibold text-nyaya-text-dark mb-1">
              {isDragging ? 'Drop to scan' : 'Drop your legal document here'}
            </p>
            <p className="text-sm text-slate-500 mb-4">or click to browse from your computer</p>
            <p className="text-xs text-slate-400">Supports PDF, JPEG, PNG · up to {MAX_SIZE_MB}MB</p>
          </div>

          {/* Hidden file input (shared between mobile upload and desktop) */}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp,image/jpeg,image/png,application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </>
      )}

      {/* Tips Panel */}
      {!selectedFile && !isUploading && (
        <motion.div
          className="bg-amber-50/60 border border-amber-200/50 rounded-2xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Tips for better results</span>
          </div>
          <ul className="space-y-2 text-sm text-amber-800/80">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
              Ensure the document is flat and well-lit
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
              Include all pages — especially the last page with signatures
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
              Hindi and regional language documents are supported
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
              Handwritten documents may have lower accuracy
            </li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}
