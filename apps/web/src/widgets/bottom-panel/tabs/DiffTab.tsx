import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { useUIStore } from '../../../entities/store/uiStore';
import { DiffPanelContent } from '../../diff-panel/DiffPanel';
import '../../diff-panel/DiffPanel.css';

export function DiffTab() {
  const diffDelta = useUIStore((s) => s.diffDelta);
  const diffBaseArchitecture = useUIStore((s) => s.diffBaseArchitecture);
  const workspaceName = useArchitectureStore((s) => s.workspace.name);

  if (!diffDelta) {
    return (
      <div className="diff-panel bottom-dock-diff">
        <div className="diff-no-changes">No diff data. Use Compare with GitHub to generate a diff.</div>
      </div>
    );
  }

  return (
    <div className="bottom-dock-diff">
      <DiffPanelContent
        diffDelta={diffDelta}
        diffBaseArchitecture={diffBaseArchitecture}
        workspaceName={workspaceName}
        onClose={() => {}}
        showHeader={false}
      />
    </div>
  );
}
