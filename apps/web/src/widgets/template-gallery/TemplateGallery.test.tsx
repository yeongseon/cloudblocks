import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateGallery } from './TemplateGallery';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { registerBuiltinTemplates } from '../../features/templates/builtin';

describe('TemplateGallery', () => {
  beforeEach(() => {
    useUIStore.setState({ showTemplateGallery: false });
    // Register builtin templates so listTemplates() returns data
    registerBuiltinTemplates();
  });

  it('returns null when showTemplateGallery is false', () => {
    const { container } = render(<TemplateGallery />);
    expect(container.innerHTML).toBe('');
  });

  it('renders template gallery with title when visible', () => {
    useUIStore.setState({ showTemplateGallery: true });
    render(<TemplateGallery />);
    expect(screen.getByText(/Templates/)).toBeInTheDocument();
  });

  it('renders template cards with name, description, and tags', () => {
    useUIStore.setState({ showTemplateGallery: true });
    render(<TemplateGallery />);
    // Should have at least one template card with "Use Template" button
    const useButtons = screen.getAllByText('Use Template');
    expect(useButtons.length).toBeGreaterThan(0);
  });

  it('renders difficulty badges', () => {
    useUIStore.setState({ showTemplateGallery: true });
    render(<TemplateGallery />);
    // Built-in templates should have difficulty text
    const badges = screen.getAllByText(/beginner|intermediate|advanced/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('closes gallery when close button is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showTemplateGallery: true });
    render(<TemplateGallery />);
    const closeBtn = screen.getByText('✕');
    await user.click(closeBtn);
    expect(useUIStore.getState().showTemplateGallery).toBe(false);
  });

  it('loads template, saves current workspace, and closes gallery on use', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showTemplateGallery: true });
    const saveToStorageSpy = vi.fn();
    const loadFromTemplateSpy = vi.fn();
    useArchitectureStore.setState({
      saveToStorage: saveToStorageSpy,
      loadFromTemplate: loadFromTemplateSpy,
    });
    render(<TemplateGallery />);
    const useButtons = screen.getAllByText('Use Template');
    await user.click(useButtons[0]);
    expect(saveToStorageSpy).toHaveBeenCalledOnce();
    expect(loadFromTemplateSpy).toHaveBeenCalledOnce();
    // Gallery should be toggled off
    expect(useUIStore.getState().showTemplateGallery).toBe(false);
  });

  it('renders tags for templates (up to 3)', () => {
    useUIStore.setState({ showTemplateGallery: true });
    render(<TemplateGallery />);
    // Tags are displayed as spans with class template-gallery-tag
    const tagElements = document.querySelectorAll('.template-gallery-tag');
    expect(tagElements.length).toBeGreaterThan(0);
  });
});
