import { useUIStore } from '../../entities/store/uiStore';
import './LandingNavbar.css';

export function LandingNavbar() {
  const goToBuilder = useUIStore((s) => s.goToBuilder);

  return (
    <header className="landing-navbar">
      <div className="landing-navbar-logo">🧱 CloudBlocks</div>
      <nav className="landing-navbar-links" aria-label="Main navigation">
        <a href="#templates" className="landing-navbar-link">
          Templates
        </a>
        <a
          href="https://github.com/yeongseon/cloudblocks/tree/main/docs"
          className="landing-navbar-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Docs
        </a>
      </nav>
      <button type="button" className="landing-navbar-cta" onClick={goToBuilder}>
        Start Building
      </button>
    </header>
  );
}
