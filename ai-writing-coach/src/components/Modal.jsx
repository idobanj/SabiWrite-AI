import React, { useEffect } from 'react';

/**
 * Reusable accessible modal component.
 * Props:
 *  - isOpen: boolean – whether the modal is visible
 *  - onClose: function – callback to close the modal
 *  - title: string – modal header title
 *  - children: ReactNode – modal body content
 */
export default function Modal({ isOpen, onClose, title, children }) {
  // Close on Escape key and lock body scroll while open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl z-10">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="py-4 text-sm text-gray-700 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
