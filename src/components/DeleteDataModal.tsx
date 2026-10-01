import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteDataModal: React.FC<DeleteDataModalProps> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const { deleteMyData } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== 'delete') return;
    setLoading(true);
    const success = await deleteMyData();
    setLoading(false);
    if (success) {
      if (onDeleted) onDeleted();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0B2545]/50 backdrop-blur-xs"
        />

        <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_rgba(11,37,69,0.18)] border border-white/80 p-6 sm:p-8 z-10 text-left my-auto"
          >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-[#627D98] hover:text-[#0B2545] hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>

          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/60 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  Irreversible Action
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B2545] tracking-tight mt-1">
                Delete all your resume data
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-[#334E68] leading-relaxed">
              This action immediately purges your uploaded resume files, match scores, keyword gap audits, and tailored outputs from our servers.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#0B2545] mb-1.5">
                Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[#0B2545] text-xs font-mono focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 placeholder:text-[#8DA9C4] transition-colors"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-xl text-xs font-semibold text-[#334E68] border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText.toLowerCase() !== 'delete' || loading}
                className="w-1/2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {loading ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </AnimatePresence>
  );
};
