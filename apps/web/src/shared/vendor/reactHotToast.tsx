import { resolveValue, toast as headlessToast, useToaster } from 'react-hot-toast/headless';
import type { CSSProperties } from 'react';
import type { ToasterProps } from 'react-hot-toast/headless';

const DEFAULT_GUTTER = 8;
const TOAST_TRANSITION_MS = 180;

const BASE_TOAST_STYLE: CSSProperties = {
  borderRadius: '8px',
  boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
  color: '#f0f0f0',
  fontSize: '0.875rem',
  lineHeight: 1.4,
  maxWidth: 'min(480px, calc(100vw - 24px))',
  pointerEvents: 'auto',
};

function getContainerStyle(position: ToasterProps['position'], customStyle?: CSSProperties): CSSProperties {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    left: 12,
    pointerEvents: 'none',
    position: 'fixed',
    right: 12,
    top: 12,
    zIndex: 9999,
  };

  if (position?.startsWith('bottom')) {
    style.bottom = 12;
    style.top = undefined;
  }

  if (position?.endsWith('left')) {
    style.alignItems = 'flex-start';
  } else if (position?.endsWith('right')) {
    style.alignItems = 'flex-end';
  } else {
    style.alignItems = 'center';
  }

  return {
    ...style,
    ...customStyle,
  };
}

export function Toaster({
  children,
  containerClassName,
  containerStyle,
  gutter = DEFAULT_GUTTER,
  position = 'top-center',
  reverseOrder,
  toastOptions,
  toasterId,
}: ToasterProps) {
  const { handlers, toasts } = useToaster(toastOptions, toasterId);

  return (
    <div
      className={containerClassName}
      onMouseEnter={handlers.startPause}
      onMouseLeave={handlers.endPause}
      style={getContainerStyle(position, containerStyle)}
    >
      {toasts.map((toast) => {
        const offset = handlers.calculateOffset(toast, {
          defaultPosition: position,
          gutter,
          reverseOrder,
        });

        const itemStyle: CSSProperties = {
          opacity: toast.visible ? 1 : 0,
          transform: `translateY(${offset}px) scale(${toast.visible ? 1 : 0.95})`,
          transition: `all ${TOAST_TRANSITION_MS}ms ease`,
          ...BASE_TOAST_STYLE,
          ...toast.style,
        };

        const content = children ? children(toast) : resolveValue(toast.message, toast);

        return (
          <div
            key={toast.id}
            {...toast.ariaProps}
            className={toast.className}
            onTransitionEnd={() => {
              if (!toast.visible) {
                headlessToast.remove(toast.id, toasterId);
              }
            }}
            style={itemStyle}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

export const toast = headlessToast;
export default headlessToast;
