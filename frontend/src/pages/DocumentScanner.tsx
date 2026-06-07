import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, Eye, AlertCircle, RotateCcw, ScanLine, Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import DocUpload from '../components/document/DocUpload';
import DocProgress from '../components/document/DocProgress';
import DocResult from '../components/document/DocResult';
import {
  uploadDocument,
  connectDocumentStatus,
  getDocumentResult,
  getMyDocuments,
  deleteDocument,
} from '../api/documents';
import { getAuthToken } from '../lib/supabase';

type PageState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

const DOC_TYPE_LABELS: Record<string, string> = {
  rental_agreement: 'Rental Agreement',
  employment_contract: 'Employment Contract',
  court_summons: 'Court Summons',
  fir: 'FIR',
  property_deed: 'Property Deed',
  cheque_bounce_notice: 'Cheque Bounce Notice',
  consumer_notice: 'Consumer Notice',
  loan_agreement: 'Loan Agreement',
  power_of_attorney: 'Power of Attorney',
  will: 'Will / Testament',
  police_notice: 'Police Notice',
  government_notice: 'Government Notice',
  other: 'Legal Document',
};

const RISK_TIER_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-amber-100 text-amber-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-emerald-100 text-emerald-700',
};

export default function DocumentScanner() {
  const [state, setState] = useState<PageState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('Starting...');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [myDocuments, setMyDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  // Load user's documents
  const fetchMyDocuments = useCallback(async () => {
    try {
      const data = await getMyDocuments();
      setMyDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchMyDocuments();
  }, [fetchMyDocuments]);

  // Handle file upload
  const handleUpload = async (file: File) => {
    setState('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const result = await uploadDocument(file, (pct) => setUploadProgress(pct));
      setState('processing');
      setProcessingProgress(0);
      setProcessingLabel('Starting...');

      // Connect SSE
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      connectDocumentStatus(
        result.document_id,
        token,
        async (event) => {
          setProcessingProgress(event.progress);
          setProcessingLabel(event.label);

          if (event.status === 'done') {
            try {
              const analysisData = await getDocumentResult(result.document_id);
              setAnalysisResult(analysisData);
              setState('done');
              fetchMyDocuments(); // Refresh history
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to fetch results');
              setState('error');
            }
          } else if (event.status === 'failed') {
            setErrorMessage(event.error || 'Analysis failed. Please try again.');
            setState('error');
          } else if (event.status === 'timeout') {
            setErrorMessage('Processing is taking longer than expected. Please refresh and check again.');
            setState('error');
          }
        },
        () => {
          setErrorMessage('Connection lost. Please try again.');
          setState('error');
        }
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
      setState('error');
    }
  };

  // View a previous document result
  const handleViewDocument = async (docId: string) => {
    setViewingDocId(docId);
    try {
      const data = await getDocumentResult(docId);
      setAnalysisResult(data);
      setState('done');
      setViewingDocId(null);
    } catch (err: any) {
      setViewingDocId(null);
      // Document might still be processing
      if (err.message?.includes('425') || err.message?.includes('processing')) {
        setState('processing');
        setProcessingProgress(50);
        setProcessingLabel('Still processing...');
      }
    }
  };

  // Delete a document
  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument(docId);
      setMyDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Reset to idle
  const resetToIdle = () => {
    setState('idle');
    setUploadProgress(0);
    setProcessingProgress(0);
    setAnalysisResult(null);
    setErrorMessage('');
    setViewingDocId(null);
    fetchMyDocuments();
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        {state !== 'done' && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-nyaya-green/10 rounded-xl flex items-center justify-center">
                <ScanLine size={20} className="text-nyaya-green-bright" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-nyaya-text-dark">
                  Legal Doc Scanner
                </h1>
                <p className="text-nyaya-muted font-sans text-sm">
                  Upload any Indian legal document for instant AI-powered risk analysis
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {/* IDLE: Upload zone */}
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DocUpload
                onUpload={handleUpload}
                isUploading={false}
                uploadProgress={0}
              />
            </motion.div>
          )}

          {/* UPLOADING: Upload progress */}
          {state === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DocUpload
                onUpload={handleUpload}
                isUploading={true}
                uploadProgress={uploadProgress}
              />
            </motion.div>
          )}

          {/* PROCESSING: SSE stepper */}
          {state === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl border border-black/8 p-8 shadow-sm"
            >
              <DocProgress progress={processingProgress} label={processingLabel} />
            </motion.div>
          )}

          {/* DONE: Full result */}
          {state === 'done' && analysisResult && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DocResult result={analysisResult} onScanAnother={resetToIdle} />
            </motion.div>
          )}

          {/* ERROR: Error card */}
          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center max-w-md mx-auto"
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-nyaya-text-dark mb-2">Analysis Failed</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">{errorMessage}</p>
              <button
                onClick={resetToIdle}
                className="inline-flex items-center gap-2 px-6 py-3 bg-nyaya-green text-white font-bold text-sm rounded-xl hover:bg-nyaya-green-mid transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Documents History */}
        {state === 'idle' && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-lg font-serif font-bold text-nyaya-text-dark mb-4">
              Recent Scans
            </h2>

            {loadingDocs && (
              <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
            )}

            {!loadingDocs && myDocuments.length === 0 && (
              <div className="bg-white rounded-2xl border border-black/8 p-8 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} className="text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">No documents scanned yet. Upload your first document above.</p>
              </div>
            )}

            {!loadingDocs && myDocuments.length > 0 && (
              <div className="space-y-2">
                {myDocuments.map((doc) => (
                  <motion.div
                    key={doc.id}
                    className="bg-white rounded-xl border border-black/8 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-slate-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-nyaya-text-dark truncate">
                        {doc.original_filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {doc.document_type && (
                          <span className="text-[10px] font-bold text-nyaya-green-bright bg-nyaya-green/10 px-2 py-0.5 rounded-full uppercase">
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </span>
                        )}
                        {doc.risk_tier && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${RISK_TIER_STYLES[doc.risk_tier] || ''}`}>
                            {doc.risk_tier}
                          </span>
                        )}
                        {doc.processing_status === 'processing' && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                            Processing...
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {doc.processing_status === 'done' && (
                        <button
                          onClick={() => handleViewDocument(doc.id)}
                          disabled={viewingDocId === doc.id}
                          className="p-2 text-slate-400 hover:text-nyaya-green-bright hover:bg-nyaya-green/5 rounded-lg transition-colors cursor-pointer"
                          title="View Report"
                        >
                          {viewingDocId === doc.id ? (
                            <Loader2 size={16} className="animate-spin text-nyaya-green-bright" />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
