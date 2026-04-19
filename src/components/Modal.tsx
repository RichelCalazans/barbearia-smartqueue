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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              'relative w-full max-h-[90vh] overflow-y-auto md:max-w-md rounded-t-3xl md:rounded-3xl bg-[#111111] border border-[#1E1E1E] shadow-2xl',
              className
            )}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-[#1E1E1E] p-4 md:p-6 bg-[#111111] backdrop-blur-sm z-10">
              <h3 id="modal-title" className="text-lg md:text-xl font-semibold text-[#F1F5F9] flex-1 truncate">{title}</h3>
              <Button variant="ghost" size="icon" onClick={onClose} className="md:h-10 md:w-10 h-9 w-9 ml-2">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 md:p-6">{children}</div>
            {footer && (
              <div className="sticky bottom-0 flex flex-col md:flex-row items-center justify-end gap-2 md:gap-3 border-t border-[#1E1E1E] p-4 md:p-6 bg-[#111111] backdrop-blur-sm">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
