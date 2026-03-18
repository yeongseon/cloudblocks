import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function renderDialogPortal({ title, message, onCancel, onConfirm }: ConfirmDialogProps) {
  return createPortal(
    <div className="confirm-dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="confirm-dialog-message">
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn-confirm"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

let dialogRoot: Root | null = null;
let dialogHost: HTMLDivElement | null = null;
let resolver: ((value: boolean) => void) | null = null;

function ensureHost(): void {
  if (typeof document === 'undefined' || dialogHost) return;
  dialogHost = document.createElement('div');
  dialogHost.setAttribute('data-confirm-dialog-host', 'true');
  document.body.appendChild(dialogHost);
  dialogRoot = createRoot(dialogHost);
}

function unmountDialog(): void {
  if (!dialogRoot) return;
  dialogRoot.render(null);
}

function settle(value: boolean): void {
  if (resolver) {
    resolver(value);
    resolver = null;
  }
  unmountDialog();
}

export function confirmDialog(message: string, title = 'Confirm'): Promise<boolean> {
  ensureHost();

  if (!dialogRoot) {
    return Promise.resolve(false);
  }

  if (resolver) {
    resolver(false);
  }

  return new Promise<boolean>((resolve) => {
    resolver = resolve;
    dialogRoot?.render(
      renderDialogPortal({
        title,
        message,
        onCancel: () => settle(false),
        onConfirm: () => settle(true),
      }),
    );
  });
}
