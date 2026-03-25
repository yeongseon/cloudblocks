import { useState } from 'react';
import { useIsMobile } from '../shared/hooks/useIsMobile';
import './MobileGuard.css';

const MOBILE_BANNER_KEY = 'cloudblocks:mobile-banner-dismissed';

export function MobileGuard() {
  const isMobile = useIsMobile();
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem(MOBILE_BANNER_KEY) === 'true',
  );

  if (!isMobile || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(MOBILE_BANNER_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <div className="mobile-guard" role="status">
      <span className="mobile-guard-text">
        You&rsquo;re viewing CloudBlocks on a small screen. Full editing requires a desktop browser
        — you can still browse architectures and templates.
      </span>
      <button className="mobile-guard-dismiss" onClick={handleDismiss}>
        Dismiss
      </button>
    </div>
  );
}
