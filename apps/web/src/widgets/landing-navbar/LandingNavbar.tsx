import { useUIStore } from '../../entities/store/uiStore';
import './LandingNavbar.css';

export function LandingNavbar() {
  const goToBuilder = useUIStore((s) => s.goToBuilder);

  return (
    <header className="landing-navbar">
      <div className="landing-navbar-logo">🧱 CloudBlocks</div>
      <button
        type="button"
        className="landing-navbar-cta"
        onClick={goToBuilder}
      >
        Start Building
      </button>
    </header>
  );
}
