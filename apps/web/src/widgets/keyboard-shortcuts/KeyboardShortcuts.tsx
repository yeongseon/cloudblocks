import { Keyboard } from 'lucide-react';
import { useEffect } from 'react';
import './KeyboardShortcuts.css';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    category: 'General',
    shortcuts: [
      { keys: 'Ctrl+S', description: 'Save workspace' },
      { keys: 'Ctrl+Z', description: 'Undo' },
      { keys: 'Ctrl+Shift+Z', description: 'Redo' },
      { keys: 'Ctrl+Y', description: 'Redo (alternative)' },
      { keys: 'Del / Backspace', description: 'Delete selected element' },
      { keys: 'Escape', description: 'Deselect / Cancel placement' },
      { keys: '?', description: 'Show keyboard shortcuts' },
    ],
  },
  {
    category: 'Canvas',
    shortcuts: [
      { keys: 'Ctrl+=', description: 'Zoom in' },
      { keys: 'Ctrl+-', description: 'Zoom out' },
      { keys: 'Ctrl+0', description: 'Fit to screen' },
      { keys: 'Scroll', description: 'Zoom in/out' },
      { keys: 'Shift+Drag', description: 'Lasso select' },
    ],
  },
  {
    category: 'Panels',
    shortcuts: [{ keys: 'Ctrl+Alt+S', description: 'Toggle sidebar palette' }],
  },
];

function renderKeys(keysStr: string) {
  // Handle special case for "Del / Backspace" (multiple keys separated by " / ")
  if (keysStr.includes(' / ')) {
    const parts = keysStr.split(' / ');
    return (
      <>
        {parts.map((part, index) => (
          <span key={index}>
            {index > 0 && <span className="keyboard-shortcuts-separator"> / </span>}
            <kbd className="keyboard-shortcuts-key">{part.trim()}</kbd>
          </span>
        ))}
      </>
    );
  }

  // Standard case for "Ctrl+Z" style keys
  return (
    <>
      {keysStr.split('+').map((key, i) => (
        <span key={i}>
          {i > 0 && <span className="keyboard-shortcuts-plus">+</span>}
          <kbd className="keyboard-shortcuts-key">{key.trim()}</kbd>
        </span>
      ))}
    </>
  );
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div
        className="keyboard-shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="keyboard-shortcuts-header">
          <h2 className="keyboard-shortcuts-title">
            <Keyboard size={18} />
            Keyboard Shortcuts
          </h2>
          <button
            className="keyboard-shortcuts-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="keyboard-shortcuts-body">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="keyboard-shortcuts-group">
              <h3 className="keyboard-shortcuts-group-title">{group.category}</h3>
              <dl className="keyboard-shortcuts-list">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="keyboard-shortcuts-item">
                    <dt className="keyboard-shortcuts-keys">{renderKeys(shortcut.keys)}</dt>
                    <dd className="keyboard-shortcuts-desc">{shortcut.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
