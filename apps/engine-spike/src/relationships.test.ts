import { describe, expect, it } from 'vitest';
import { spikeFixture } from './fixture';
import { connectedBlockIds, relationships, relationshipsForBlock } from './relationships';

describe('relationship inspection', () => {
  it('preserves every typed and directed connection in the fixture', () => {
    expect(relationships).toHaveLength(spikeFixture.connections.length);
    expect(relationships.map((item) => [item.sourceName, item.targetName, item.semantic])).toEqual([
      ['Internet', 'Front Door', 'http'],
      ['Front Door', 'App Gateway', 'http'],
      ['App Gateway', 'App Service', 'http'],
      ['App Service', 'SQL Database', 'data'],
      ['App Service', 'Key Vault', 'data'],
      ['Functions', 'SQL Database', 'data'],
    ]);
  });

  it('shows only adjacent links with a unique set of affected blocks', () => {
    expect(relationshipsForBlock('app').map((item) => item.id)).toEqual([
      'gateway-app',
      'app-sql',
      'app-vault',
    ]);
    expect(connectedBlockIds('app')).toEqual(['gateway', 'app', 'sql', 'vault']);
    expect(relationshipsForBlock('vnet')).toEqual([]);
  });
});
