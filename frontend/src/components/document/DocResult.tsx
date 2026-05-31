import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Calendar, ChevronDown, ChevronUp,
  Copy, ExternalLink, FileText, Scale, Share2, Shield,
  Users, CheckCircle2, AlertCircle, XCircle, Info
} from 'lucide-react';
import RiskMeter from './RiskMeter';
import { shareDocument } from '../../api/documents';

interface DocResultProps {
  result: any;
  onScanAnother: () => void;
}

const TIER_BANNERS: Record<string, { bg: string; text: string; icon: any; message: string }> = {
  critical: {
    bg: 'bg-red-600',
    text: 'text-white',
    icon: XCircle,
    message: '⚠ HIGH RISK DOCUMENT — Immediate action required',
  },
  high: {
    bg: 'bg-amber-500',
    text: 'text-white',
    icon: AlertTriangle,
    message: '⚠ This document has significant risks',
  },
  medium: {
    bg: 'bg-yellow-400',
    text: 'text-yellow-900',
    icon: AlertCircle,
    message: '⚡ Review these concerns before signing',
  },
  low: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    icon: CheckCircle2,
    message: '✓ This document appears standard',
  },
};

const SEVERITY_ICONS: Record<string, { color: string; emoji: string }> = {
  critical: { color: 'text-red-600', emoji: '🔴' },
  high:     { color: 'text-amber-600', emoji: '🟡' },
  medium:   { color: 'text-orange-500', emoji: '🟠' },
  low:      { color: 'text-green-600', emoji: '🟢' },
};

const IMPORTANCE_COLORS: Record<string, string> = {
  critical:  'bg-red-100 text-red-700',
  important: 'bg-amber-100 text-amber-700',
  standard:  'bg-slate-100 text-slate-600',
};

function getDaysLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 0) return `in ${days} days`;
  if (days === -1) return '1 day ago';
  return `${Math.abs(days)} days ago`;
}

function getDateDotColor(days: number, isCritical: boolean): string {
  if (days < 0 && isCritical) return 'bg-red-500';
  if (days <= 7 && isCritical) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function DocResult({ result, onScanAnother }: DocResultProps) {
  const [shareModal, setShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const banner = TIER_BANNERS[result.risk_tier] || TIER_BANNERS.low;
  const BannerIcon = banner.icon;

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const data = await shareDocument(result.document_id);
      setShareUrl(`${window.location.origin}${data.share_url}`);
      setShareModal(true);
    } catch {
      // Fallback
      setShareUrl(window.location.href);
      setShareModal(true);
    } finally {
      setShareLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-nyaya-green/10 text-nyaya-green text-xs font-bold rounded-lg uppercase tracking-wide">
            {result.document_type_label}
          </div>
          <span className="text-sm text-slate-400 truncate max-w-[200px]">{result.original_filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Share2 size={14} />
            Share with Lawyer
          </button>
          <button
            onClick={onScanAnother}
            className="flex items-center gap-1.5 px-3 py-2 bg-nyaya-green text-white text-xs font-semibold rounded-xl hover:bg-nyaya-green-mid transition-colors cursor-pointer"
          >
            <FileText size={14} />
            Scan Another
          </button>
        </div>
      </div>

      {/* Risk Banner */}
      <motion.div
        className={`${banner.bg} ${banner.text} rounded-xl px-5 py-3 flex items-center gap-3 mb-6 shadow-sm`}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.3 }}
      >
        <BannerIcon size={20} />
        <span className="font-semibold text-sm">{banner.message}</span>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Meter */}
          <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
            <RiskMeter
              score={result.risk_score}
              tier={result.risk_tier}
              summary={result.risk_summary}
            />
          </div>

          {/* Critical Dates */}
          {result.critical_dates?.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-nyaya-text-dark mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-nyaya-green-bright" />
                Important Dates & Deadlines
              </h3>
              <div className="space-y-4">
                {result.critical_dates.map((d: any, i: number) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${getDateDotColor(d.days_until, d.is_critical)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-nyaya-text-dark">{d.date_description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{d.date_value}</span>
                        <span className={`text-xs font-bold ${
                          d.days_until < 0 ? 'text-red-600' :
                          d.days_until <= 7 ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {getDaysLabel(d.days_until)}
                        </span>
                      </div>
                      {d.action_required && (
                        <p className="text-xs text-slate-400 italic mt-1">{d.action_required}</p>
                      )}
                      {d.days_until < 0 && d.is_critical && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-600 font-semibold">
                          <AlertCircle size={12} />
                          This deadline has passed!
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>OCR Confidence</span>
              <span className="font-semibold text-slate-600">{Math.round((result.ocr_confidence || 1) * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Processing Time</span>
              <span className="font-semibold text-slate-600">{((result.processing_time_ms || 0) / 1000).toFixed(1)}s</span>
            </div>
            {result.is_handwritten && (
              <div className="flex items-center gap-1 text-amber-600 font-medium mt-2">
                <AlertCircle size={12} />
                Contains handwritten sections — accuracy may vary
              </div>
            )}
            {result.language && result.language !== 'en' && (
              <div className="flex items-center gap-1 mt-2 bg-blue-50 px-3 py-1.5 rounded-lg text-blue-700 font-medium">
                <Info size={12} />
                Document in {result.language.toUpperCase()} — analysis in English
              </div>
            )}
          </div>
        </div>

        {/* Right Column (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-nyaya-text-dark mb-3 flex items-center gap-2">
              <FileText size={16} className="text-nyaya-green-bright" />
              What this document says
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
          </div>

          {/* Risk Flags */}
          {result.risk_flags?.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-nyaya-text-dark mb-4 flex items-center gap-2">
                <Shield size={16} className="text-red-500" />
                Issues Found ({result.risk_flags.length})
              </h3>
              <div className="space-y-2">
                {[...result.risk_flags]
                  .sort((a: any, b: any) => {
                    const order = { critical: 0, high: 1, medium: 2, low: 3 };
                    return (order[a.severity as keyof typeof order] || 3) - (order[b.severity as keyof typeof order] || 3);
                  })
                  .map((flag: any, i: number) => (
                    <AccordionItem key={i} flag={flag} index={i} />
                  ))}
              </div>
            </div>
          )}

          {/* Key Clauses */}
          {result.key_clauses?.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-nyaya-text-dark mb-4 flex items-center gap-2">
                <Scale size={16} className="text-nyaya-green-bright" />
                Key Clauses Explained
              </h3>
              <div className="space-y-2">
                {result.key_clauses.map((clause: any, i: number) => (
                  <ClauseItem key={i} clause={clause} />
                ))}
              </div>
            </div>
          )}

          {/* Related Laws */}
          {result.legal_references?.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-nyaya-text-dark mb-4 flex items-center gap-2">
                <Scale size={16} className="text-amber-500" />
                Laws that apply to your document
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.legal_references.map((ref: any, i: number) => (
                  <motion.div
                    key={i}
                    className="border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-shadow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <p className="text-sm font-semibold text-nyaya-text-dark">{ref.act_name}</p>
                    {ref.section && (
                      <p className="text-xs text-nyaya-green-bright font-medium mt-0.5">{ref.section}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{ref.plain_description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        ref.source === 'document_cited'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-50 text-slate-500'
                      }`}>
                        {ref.source === 'document_cited' ? 'Referenced in document' : 'Applicable by law'}
                      </span>
                      <a
                        href={`https://indiankanoon.org/search/?formInput=${encodeURIComponent(ref.act_name + (ref.section ? ' ' + ref.section : ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-nyaya-green-bright font-semibold flex items-center gap-1 hover:underline"
                      >
                        Read full section <ExternalLink size={10} />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Lawyer Suggestion */}
          {result.suggest_lawyer && (
            <motion.div
              className="bg-white border-l-4 border-nyaya-green-bright rounded-2xl p-5 shadow-sm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-nyaya-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-nyaya-green-bright" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-nyaya-text-dark">
                    You may benefit from speaking with a lawyer
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {['fir', 'court_summons', 'cheque_bounce_notice', 'police_notice'].includes(result.document_type)
                      ? 'This is a time-sensitive legal matter. We recommend contacting a lawyer today.'
                      : 'Based on the risk analysis, professional legal advice could help protect your rights.'}
                  </p>
                  <a
                    href="/lawyers"
                    className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-nyaya-green-bright hover:underline"
                  >
                    Find lawyers near you →
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-lg font-bold text-nyaya-text-dark mb-2">Share with Lawyer</h3>
              <p className="text-sm text-slate-500 mb-4">
                Share this analysis with your lawyer. Link valid for 48 hours.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 outline-none"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-nyaya-green text-white text-xs font-bold rounded-lg hover:bg-nyaya-green-mid transition-colors cursor-pointer flex items-center gap-1"
                >
                  {copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <button
                onClick={() => setShareModal(false)}
                className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


/* ━━ Accordion Sub-components ━━ */

function AccordionItem({ flag, index }: { flag: any; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const sev = SEVERITY_ICONS[flag.severity] || SEVERITY_ICONS.medium;

  return (
    <motion.div
      className="border border-slate-100 rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
      >
        <span className="text-sm">{sev.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-nyaya-text-dark">{flag.risk_type}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{flag.plain_explanation}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {flag.clause_text && (
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs text-slate-600 leading-relaxed border border-slate-100">
                  "{flag.clause_text}"
                </div>
              )}
              <p className="text-sm text-slate-600 leading-relaxed">{flag.plain_explanation}</p>
              {flag.relevant_law && (
                <a
                  href={`https://indiankanoon.org/search/?formInput=${encodeURIComponent(flag.relevant_law)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-nyaya-green/10 text-nyaya-green-bright text-xs font-semibold rounded-lg hover:bg-nyaya-green/20 transition-colors"
                >
                  {flag.relevant_law} <ExternalLink size={10} />
                </a>
              )}
              {flag.recommendation && (
                <p className="text-xs text-slate-500 italic">💡 {flag.recommendation}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ClauseItem({ clause }: { clause: any }) {
  const [open, setOpen] = useState(false);
  const impClass = IMPORTANCE_COLORS[clause.importance] || IMPORTANCE_COLORS.standard;

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-nyaya-text-dark">{clause.clause_name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${impClass}`}>
              {clause.importance}
            </span>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {clause.original_text && (
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs text-slate-600 leading-relaxed border border-slate-100">
                  "{clause.original_text}"
                </div>
              )}
              <p className="text-sm text-slate-600 leading-relaxed">{clause.plain_explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
