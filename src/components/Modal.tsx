import React, { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'relative w-full max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-[#1E1E1E] bg-[#111111] shadow-2xl sm:max-h-[90dvh] sm:max-w-md sm:rounded-3xl',
              className
            )}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className="sticky top-0 flex items-center justify-between border-b border-[#1E1E1E] p-4 md:p-6 bg-[#111111] backdrop-blur-sm z-10"
              style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
            >
              <h3 id="modal-title" className="text-lg md:text-xl font-semibold text-[#F1F5F9] flex-1 truncate">{title}</h3>
              <Button variant="ghost" size="icon" onClick={onClose} className="md:h-11 md:w-11 h-11 w-11 ml-2" aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 md:p-6">{children}</div>
            {footer && (
              <div
                className="sticky bottom-0 flex flex-col items-stretch justify-end gap-2 border-t border-[#1E1E1E] bg-[#111111] p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-3 sm:p-6"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
