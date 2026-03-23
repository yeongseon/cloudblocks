import './ComingSoonBanner.css';

interface ComingSoonBannerProps {
  message: string;
  className?: string;
}

export function ComingSoonBanner({ message, className }: ComingSoonBannerProps) {
  return (
    <div
      className={`coming-soon-banner${className ? ` ${className}` : ''}`}
      role="status"
    >
      {message}
    </div>
  );
}
