import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { listTemplates } from '../../features/templates/registry';
import type { ArchitectureTemplate } from '../../shared/types/template';
import { LandingNavbar } from '../landing-navbar/LandingNavbar';
import './LandingPage.css';

export function LandingPage() {
  const goToBuilder = useUIStore((s) => s.goToBuilder);
  const loadFromTemplate = useArchitectureStore((s) => s.loadFromTemplate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const templates = listTemplates();

  const handleStartBuilding = () => {
    goToBuilder();
  };

  const handleUseTemplate = (template: ArchitectureTemplate) => {
    loadFromTemplate(template);
    saveToStorage();
    goToBuilder();
  };

  return (
    <div className="landing-page" data-theme="workshop">
      <LandingNavbar />
      <main className="landing-main" id="main-content">
        <section className="landing-hero">
          <h1 className="landing-hero-title">
            Start from templates. Edit visually. Validate instantly.
          </h1>
          <p className="landing-hero-subtitle">
            Learn cloud architecture from guided templates — all in your browser, no backend
            required.
          </p>
          <div className="landing-hero-badges">
            <span className="landing-hero-badge">{templates.length} templates</span>
            <span className="landing-hero-badge">Real-time validation</span>
            <span className="landing-hero-badge">No backend required</span>
          </div>
          <button type="button" className="landing-hero-cta" onClick={handleStartBuilding}>
            Start Building
          </button>
        </section>

        <section className="landing-how-it-works">
          <h2 className="landing-how-title">How It Works</h2>
          <div className="landing-how-steps">
            <div className="landing-how-step">
              <div className="landing-how-step-number">1</div>
              <h3 className="landing-how-step-title">Pick a Template</h3>
              <p className="landing-how-step-desc">
                Choose from 6 built-in architecture patterns — three-tier, serverless, event
                pipeline, and more.
              </p>
            </div>
            <div className="landing-how-step">
              <div className="landing-how-step-number">2</div>
              <h3 className="landing-how-step-title">Customize with Blocks</h3>
              <p className="landing-how-step-desc">
                Drag resource blocks, connect components, and adjust properties on the visual
                canvas.
              </p>
            </div>
            <div className="landing-how-step">
              <div className="landing-how-step-number">3</div>
              <h3 className="landing-how-step-title">Validate &amp; Export</h3>
              <p className="landing-how-step-desc">
                Run the validation engine, then export to Terraform, Bicep, or Pulumi — all in the
                browser.
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

        <footer className="landing-footer" role="contentinfo">
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
