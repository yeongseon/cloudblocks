import { useState } from 'react';

const DEMO_BANNER_DISMISSED_KEY = 'cloudblocks:standalone-banner-dismissed';

function getDemoBannerVisibility(): boolean {
  // This should only run client-side
  if (typeof window === 'undefined') {
    return false;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  const isDismissed = localStorage.getItem(DEMO_BANNER_DISMISSED_KEY) === 'true';

  return !apiUrl && !isDismissed;
}

export function DemoBanner() {
  const [isVisible, setIsVisible] = useState(() => getDemoBannerVisibility());

  const handleDismiss = () => {
    localStorage.setItem(DEMO_BANNER_DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        backgroundColor: '#0f0f1e',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: '#e0e0e0',
        fontSize: '14px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span>
        Visual builder, templates, and code generation work instantly — no backend required. Connect
        the backend to unlock AI and GitHub features.
      </span>
      <button
        onClick={handleDismiss}
        style={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: '#e0e0e0',
          padding: '4px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.6)';
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.backgroundColor = 'transparent';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
