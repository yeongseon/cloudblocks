import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { useEffect, useRef } from 'react';
import './PromptDialog.css';

interface PromptDialogProps {
  title: string;
  message: string;
  defaultValue: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

// Internal-only component used by the imperative promptDialog() API below.
// eslint-disable-next-line react-refresh/only-export-components
function PromptDialogContent({
  title,
  message,
  defaultValue,
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  return (
    <div className="confirm-dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-dialog-title"
        aria-describedby="prompt-dialog-message"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onCancel();
          }
        }}
      >
        <h3 id="prompt-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p id="prompt-dialog-message" className="confirm-dialog-message">
          {message}
        </p>
        <input
          ref={inputRef}
          className="prompt-dialog-input"
          type="text"
          defaultValue={defaultValue}
          aria-label={title}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onConfirm(inputRef.current?.value ?? '');
            }
          }}
        />
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn-confirm"
            onClick={() => onConfirm(inputRef.current?.value ?? '')}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function renderDialogPortal(props: PromptDialogProps) {
  return createPortal(<PromptDialogContent {...props} />, document.body);
}

let dialogRoot: Root | null = null;
let dialogHost: HTMLDivElement | null = null;
let resolver: ((value: string | null) => void) | null = null;

function ensureHost(): void {
  if (typeof document === 'undefined' || dialogHost) return;
  dialogHost = document.createElement('div');
  dialogHost.setAttribute('data-prompt-dialog-host', 'true');
  document.body.appendChild(dialogHost);
  dialogRoot = createRoot(dialogHost);
}

function unmountDialog(): void {
  if (!dialogRoot) return;
  dialogRoot.render(null);
}

function settle(value: string | null): void {
  if (resolver) {
    resolver(value);
    resolver = null;
  }
  unmountDialog();
}

export function promptDialog(
  message: string,
  title = 'Prompt',
  defaultValue = '',
): Promise<string | null> {
  ensureHost();

  if (!dialogRoot) {
    return Promise.resolve(null);
  }

  if (resolver) {
    settle(null);
  }

  return new Promise<string | null>((resolve) => {
    resolver = resolve;
    dialogRoot?.render(
      renderDialogPortal({
        title,
        message,
        defaultValue,
        onCancel: () => settle(null),
        onConfirm: (value: string) => settle(value),
      }),
    );
  });
}
