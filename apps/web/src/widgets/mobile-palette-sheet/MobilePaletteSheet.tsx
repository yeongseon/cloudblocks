import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SidebarPalette } from '../sidebar-palette';
import './MobilePaletteSheet.css';

interface MobilePaletteSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobilePaletteSheet({ isOpen, onClose }: MobilePaletteSheetProps) {
  // Lock background scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <div
        className="mobile-palette-backdrop"
        data-open={isOpen}
        onClick={onClose}
        role="presentation"
      />
      <div
        className="mobile-palette-sheet"
        data-open={isOpen}
        role="dialog"
        aria-label="Block palette"
        aria-modal="true"
      >
        <div className="mobile-palette-sheet-header">
          <span className="mobile-palette-sheet-title">Add Block</span>
          <button
            type="button"
            className="mobile-palette-sheet-close"
            onClick={onClose}
            aria-label="Close palette"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mobile-palette-sheet-body">
          <SidebarPalette />
        </div>
      </div>
    </>
  );
}
