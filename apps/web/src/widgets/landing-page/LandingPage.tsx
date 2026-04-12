import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { syncWorkspaceUI } from '../../entities/store/uiSync';
import { listTemplates } from '../../features/templates/registry';
import type { ArchitectureTemplate } from '../../shared/types/template';
import { LandingNavbar } from '../landing-navbar/LandingNavbar';
import './LandingPage.css';

export function LandingPage() {
  const activeProvider = useUIStore((s) => s.activeProvider);
  const goToBuilder = useUIStore((s) => s.goToBuilder);
  const loadFromTemplate = useArchitectureStore((s) => s.loadFromTemplate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const templates = listTemplates();

  const handleStartBuilding = () => {
    goToBuilder();
  };

  const handleUseTemplate = (template: ArchitectureTemplate) => {
    loadFromTemplate(template, activeProvider);
    syncWorkspaceUI({ fitToContent: true });
    saveToStorage();
    goToBuilder();
  };

  return (
    <div className="landing-page" data-theme="workshop">
      <LandingNavbar />
      <main className="landing-main" id="main-content">
        <section className="landing-hero">
          <h1 className="landing-hero-title">
            Start from guided templates. Learn by editing. Export Terraform starter code.
          </h1>
          <p className="landing-hero-subtitle">
            CloudBlocks is a visual cloud learning tool for beginners — pick a template, understand
            the architecture pattern, and export Terraform starter code. No cloud account required.
          </p>
          <div className="landing-hero-badges">
            <span className="landing-hero-badge">Guided templates</span>
            <span className="landing-hero-badge">Guided learning scenarios</span>
            <span className="landing-hero-badge">Terraform starter export</span>
          </div>
          <button type="button" className="landing-hero-cta" onClick={handleStartBuilding}>
            Get Started
          </button>
        </section>

        <section className="landing-how-it-works">
          <h2 className="landing-how-title">How It Works</h2>
          <div className="landing-how-steps">
            <div className="landing-how-step">
              <div className="landing-how-step-number">1</div>
              <h3 className="landing-how-step-title">Pick a Guided Template</h3>
              <p className="landing-how-step-desc">
                Choose from built-in architecture patterns — each one teaches a common cloud design
                with step-by-step guidance.
              </p>
            </div>
            <div className="landing-how-step">
              <div className="landing-how-step-number">2</div>
              <h3 className="landing-how-step-title">Learn by Editing</h3>
              <p className="landing-how-step-desc">
                Follow guided scenarios that walk you through each component. Drag blocks, make
                connections, and see validation feedback in real time.
              </p>
            </div>
            <div className="landing-how-step">
              <div className="landing-how-step-number">3</div>
              <h3 className="landing-how-step-title">Export Terraform Starter Code</h3>
              <p className="landing-how-step-desc">
                Generate Terraform starter code from your architecture — ready to learn from or use
                as a starting point for real infrastructure.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-templates" id="templates">
          <h2 className="landing-templates-title">Start from a Template</h2>
          <div className="landing-templates-grid">
            {templates.map((template) => (
              <div key={template.id} className="landing-template-card">
                <div className="landing-template-card-body">
                  <h3 className="landing-template-card-name">{template.name}</h3>
                  <p className="landing-template-card-desc">{template.description}</p>
                  <div className="landing-template-card-tags">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="landing-template-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="landing-template-card-btn"
                  onClick={() => handleUseTemplate(template)}
                >
                  Use This Template
                </button>
              </div>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-links">
            <a
              href="https://github.com/yeongseon/cloudblocks"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-link"
            >
              GitHub
            </a>
            <span className="landing-footer-sep">&middot;</span>
            <a
              href="https://github.com/yeongseon/cloudblocks/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-link"
            >
              Docs
            </a>
            <span className="landing-footer-sep">&middot;</span>
            <a
              href="https://github.com/yeongseon/cloudblocks/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-link"
            >
              Apache 2.0
            </a>
          </div>
          <p className="landing-footer-text">
            &copy; {new Date().getFullYear()} CloudBlocks &mdash; visual cloud learning tool for
            beginners
          </p>
        </footer>
      </main>
    </div>
  );
}
