import type { ArchitectureSnapshot, Scenario } from '../../../shared/types/learning';
import { registerScenario } from './registry';

const threeTierInitialArchitecture: ArchitectureSnapshot = {
  name: 'Three-Tier Learning Scenario',
  version: '1',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
};

const threeTierCheckpointNetworkOnly: ArchitectureSnapshot = {
  name: 'Three-Tier Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scn3tier-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: [],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
  ],
  blocks: [],
  connections: [],
  externalActors: [],
};

const threeTierCheckpointWithSubnets: ArchitectureSnapshot = {
  name: 'Three-Tier Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scn3tier-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: ['plate-scn3tier-public', 'plate-scn3tier-private'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-scn3tier-public',
      name: 'Public Subnet',
      type: 'subnet',
      subnetAccess: 'public',
      parentId: 'plate-scn3tier-vnet',
      children: [],
      position: { x: -3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'plate-scn3tier-private',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'plate-scn3tier-vnet',
      children: [],
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ],
  blocks: [],
  connections: [],
  externalActors: [],
};

const threeTierCheckpointWithBlocks: ArchitectureSnapshot = {
  name: 'Three-Tier Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scn3tier-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: ['plate-scn3tier-public', 'plate-scn3tier-private'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-scn3tier-public',
      name: 'Public Subnet',
      type: 'subnet',
      subnetAccess: 'public',
      parentId: 'plate-scn3tier-vnet',
      children: ['block-scn3tier-gateway', 'block-scn3tier-compute'],
      position: { x: -3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'plate-scn3tier-private',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'plate-scn3tier-vnet',
      children: ['block-scn3tier-database'],
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ],
  blocks: [
    {
      id: 'block-scn3tier-gateway',
      name: 'Gateway',
      category: 'gateway',
      placementId: 'plate-scn3tier-public',
      position: { x: -1.2, y: 0.5, z: -1.8 },
      metadata: {},
    },
    {
      id: 'block-scn3tier-compute',
      name: 'Compute',
      category: 'compute',
      placementId: 'plate-scn3tier-public',
      position: { x: 1.2, y: 0.5, z: 1.2 },
      metadata: {},
    },
    {
      id: 'block-scn3tier-database',
      name: 'Database',
      category: 'database',
      placementId: 'plate-scn3tier-private',
      position: { x: 0, y: 0.5, z: 0 },
      metadata: {},
    },
  ],
  connections: [],
  externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
};

const threeTierScenario: Scenario = {
  id: 'scenario-three-tier',
  name: 'Build a Three-Tier Web Application',
  description:
    'Learn cloud architecture fundamentals by building a classic three-tier web application with gateway, compute, database, and storage.',
  difficulty: 'beginner',
  category: 'web-application',
  tags: ['three-tier', 'beginner', 'gateway', 'compute', 'database'],
  estimatedMinutes: 10,
  initialArchitecture: threeTierInitialArchitecture,
  steps: [
    {
      id: 'step-three-tier-create-network',
      order: 1,
      title: 'Create the Network',
      instruction: 'Create a Network plate as the foundation for your cloud architecture.',
      hints: [
        'A Network plate represents a Virtual Network (VNet) - the isolated network boundary for your cloud resources.',
        'Click the Network plate button in the Command Card to add one to the canvas.',
      ],
      validationRules: [{ type: 'plate-exists', plateType: 'region' }],
    },
    {
      id: 'step-three-tier-add-subnets',
      order: 2,
      title: 'Add Subnets',
      instruction: 'Add a Public Subnet and a Private Subnet inside your Network.',
      hints: [
        'Subnets divide your network into public-facing and private zones.',
        'Public subnets host internet-facing resources like gateways. Private subnets host sensitive resources like databases.',
        'Add both a Public and Private subnet from the Command Card.',
      ],
      validationRules: [
        { type: 'plate-exists', plateType: 'subnet', subnetAccess: 'public' },
        { type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' },
      ],
      checkpoint: threeTierCheckpointNetworkOnly,
    },
    {
      id: 'step-three-tier-place-resources',
      order: 3,
      title: 'Place Your Resources',
      instruction:
        'Place a Gateway on the Public Subnet, and a Compute and Database on the appropriate subnets.',
      hints: [
        'Gateways must be on a Public Subnet - they are the entry point for internet traffic.',
        'Databases must be on a Private Subnet - they should not be directly exposed to the internet.',
        'Compute blocks can be on any subnet.',
      ],
      validationRules: [
        {
          type: 'block-exists',
          category: 'gateway',
          onPlateType: 'subnet',
          onSubnetAccess: 'public',
        },
        { type: 'block-exists', category: 'compute' },
        {
          type: 'block-exists',
          category: 'database',
          onPlateType: 'subnet',
          onSubnetAccess: 'private',
        },
      ],
      checkpoint: threeTierCheckpointWithSubnets,
    },
    {
      id: 'step-three-tier-connect-flow',
      order: 4,
      title: 'Connect the Data Flow',
      instruction: 'Connect Internet -> Gateway -> Compute -> Database to establish the request flow.',
      hints: [
        'Use Connect mode to draw connections between resources.',
        'The data flow represents request direction: Internet -> Gateway -> Compute -> Database.',
        'Click the source block first, then click the target block to create a connection.',
      ],
      validationRules: [
        { type: 'connection-exists', sourceCategory: 'internet', targetCategory: 'gateway' },
        { type: 'connection-exists', sourceCategory: 'gateway', targetCategory: 'compute' },
        { type: 'connection-exists', sourceCategory: 'compute', targetCategory: 'database' },
      ],
      checkpoint: threeTierCheckpointWithBlocks,
    },
    {
      id: 'step-three-tier-validate',
      order: 5,
      title: 'Validate Your Architecture',
      instruction: 'Ensure your architecture passes all validation rules.',
      hints: [
        'Open the Validation panel to see any errors.',
        'All blocks must be on valid plates, and all connections must follow the allowed flow rules.',
      ],
      validationRules: [{ type: 'architecture-valid' }],
    },
  ],
};

const serverlessApiInitialArchitecture: ArchitectureSnapshot = {
  name: 'Serverless API Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scnsls-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: [],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
  ],
  blocks: [],
  connections: [],
  externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
};

const serverlessApiCheckpointWithSubnets: ArchitectureSnapshot = {
  name: 'Serverless API Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scnsls-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: ['plate-scnsls-public', 'plate-scnsls-private'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-scnsls-public',
      name: 'Public Subnet',
      type: 'subnet',
      subnetAccess: 'public',
      parentId: 'plate-scnsls-vnet',
      children: [],
      position: { x: -3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
    {
      id: 'plate-scnsls-private',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'plate-scnsls-vnet',
      children: [],
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ],
  blocks: [],
  connections: [],
  externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
};

const serverlessApiScenario: Scenario = {
  id: 'scenario-serverless-api',
  name: 'Serverless HTTP API',
  description: 'Build a serverless API architecture using functions, gateway, and managed data services.',
  difficulty: 'intermediate',
  category: 'serverless',
  tags: ['serverless', 'function', 'api', 'intermediate'],
  estimatedMinutes: 8,
  initialArchitecture: serverlessApiInitialArchitecture,
  steps: [
    {
      id: 'step-serverless-api-network-zones',
      order: 1,
      title: 'Set Up Network Zones',
      instruction: 'Add a Public Subnet for the gateway and a Private Subnet for data services.',
      hints: [
        'Even in serverless architectures, you need network boundaries.',
        'The gateway lives in the public subnet, while databases and storage stay private.',
      ],
      validationRules: [
        { type: 'plate-exists', plateType: 'subnet', subnetAccess: 'public' },
        { type: 'plate-exists', plateType: 'subnet', subnetAccess: 'private' },
      ],
    },
    {
      id: 'step-serverless-api-deploy-components',
      order: 2,
      title: 'Deploy Serverless Components',
      instruction:
        'Place a Gateway on the public subnet, a Function on the network plate, and a Database on the private subnet.',
      hints: [
        'Functions are serverless compute - they run on the Network plate, not a specific subnet.',
        'The Gateway receives HTTP requests and routes them to your Function.',
        'Place the Database on the Private Subnet for security.',
      ],
      validationRules: [
        {
          type: 'block-exists',
          category: 'gateway',
          onPlateType: 'subnet',
          onSubnetAccess: 'public',
        },
        { type: 'block-exists', category: 'function', onPlateType: 'region' },
        {
          type: 'block-exists',
          category: 'database',
          onPlateType: 'subnet',
          onSubnetAccess: 'private',
        },
      ],
      checkpoint: serverlessApiCheckpointWithSubnets,
    },
    {
      id: 'step-serverless-api-wire-flow',
      order: 3,
      title: 'Wire the API Flow',
      instruction: 'Connect Internet -> Gateway -> Function -> Database.',
      hints: [
        'The serverless flow: HTTP request hits the Gateway, triggers a Function, which queries the Database.',
        'Functions can connect to databases, storage, and queues.',
      ],
      validationRules: [
        { type: 'connection-exists', sourceCategory: 'internet', targetCategory: 'gateway' },
        { type: 'connection-exists', sourceCategory: 'gateway', targetCategory: 'function' },
        { type: 'connection-exists', sourceCategory: 'function', targetCategory: 'database' },
      ],
    },
    {
      id: 'step-serverless-api-validate',
      order: 4,
      title: 'Validate',
      instruction: 'Check that your serverless architecture is valid.',
      hints: [
        'Make sure all placements and connections follow the rules.',
        'Use the Validation panel to quickly identify any remaining placement or flow errors.',
      ],
      validationRules: [{ type: 'architecture-valid' }],
    },
  ],
};

const eventPipelineInitialArchitecture: ArchitectureSnapshot = {
  name: 'Event Pipeline Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scnevt-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: ['plate-scnevt-private'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-scnevt-private',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'plate-scnevt-vnet',
      children: [],
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ],
  blocks: [],
  connections: [],
  externalActors: [],
};

const eventPipelineCheckpointAfterStep2: ArchitectureSnapshot = {
  name: 'Event Pipeline Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scnevt-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: ['plate-scnevt-private', 'block-scnevt-event', 'block-scnevt-queue'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-scnevt-private',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'plate-scnevt-vnet',
      children: [],
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ],
  blocks: [
    {
      id: 'block-scnevt-event',
      name: 'Event Source',
      category: 'event',
      placementId: 'plate-scnevt-vnet',
      position: { x: -3, y: 0.5, z: -2.5 },
      metadata: {},
    },
    {
      id: 'block-scnevt-queue',
      name: 'Queue',
      category: 'queue',
      placementId: 'plate-scnevt-vnet',
      position: { x: -3, y: 0.5, z: 1.5 },
      metadata: {},
    },
  ],
  connections: [],
  externalActors: [],
};

const eventPipelineCheckpointWithAllBlocks: ArchitectureSnapshot = {
  name: 'Event Pipeline Learning Scenario',
  version: '1',
  plates: [
    {
      id: 'plate-scnevt-vnet',
      name: 'VNet',
      type: 'region',
      parentId: null,
      children: [
        'plate-scnevt-private',
        'block-scnevt-event',
        'block-scnevt-queue',
        'block-scnevt-fn-event',
        'block-scnevt-fn-batch',
        'block-scnevt-timer',
      ],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    },
    {
      id: 'plate-scnevt-private',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'plate-scnevt-vnet',
      children: ['block-scnevt-storage'],
      position: { x: 3, y: 0.3, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    },
  ],
  blocks: [
    {
      id: 'block-scnevt-event',
      name: 'Event Source',
      category: 'event',
      placementId: 'plate-scnevt-vnet',
      position: { x: -3.5, y: 0.5, z: -2.5 },
      metadata: {},
    },
    {
      id: 'block-scnevt-queue',
      name: 'Queue',
      category: 'queue',
      placementId: 'plate-scnevt-vnet',
      position: { x: -3.5, y: 0.5, z: 1.5 },
      metadata: {},
    },
    {
      id: 'block-scnevt-fn-event',
      name: 'Event Processor',
      category: 'function',
      placementId: 'plate-scnevt-vnet',
      position: { x: 0, y: 0.5, z: -1.5 },
      metadata: {},
    },
    {
      id: 'block-scnevt-fn-batch',
      name: 'Batch Processor',
      category: 'function',
      placementId: 'plate-scnevt-vnet',
      position: { x: 0, y: 0.5, z: 2 },
      metadata: {},
    },
    {
      id: 'block-scnevt-timer',
      name: 'Scheduled Event',
      category: 'event',
      placementId: 'plate-scnevt-vnet',
      position: { x: 3.5, y: 0.5, z: -0.2 },
      metadata: {},
    },
    {
      id: 'block-scnevt-storage',
      name: 'Storage',
      category: 'storage',
      placementId: 'plate-scnevt-private',
      position: { x: 0, y: 0.5, z: 0 },
      metadata: {},
    },
  ],
  connections: [],
  externalActors: [],
};

const eventPipelineScenario: Scenario = {
  id: 'scenario-event-pipeline',
  name: 'Event-Driven Data Pipeline',
  description: 'Design an event-driven data processing pipeline using events, queues, functions, and storage.',
  difficulty: 'advanced',
  category: 'data-pipeline',
  tags: ['event-driven', 'pipeline', 'queue', 'advanced'],
  estimatedMinutes: 12,
  initialArchitecture: eventPipelineInitialArchitecture,
  steps: [
    {
      id: 'step-event-pipeline-add-sources',
      order: 1,
      title: 'Add Event Sources',
      instruction: 'Place an Event source and a Queue on the Region plate.',
      hints: [
        'Events and Queues are serverless resources that live on the Region plate.',
        'Events trigger functions when something happens. Queues buffer messages for processing.',
      ],
      validationRules: [
        { type: 'block-exists', category: 'event', onPlateType: 'region' },
        { type: 'block-exists', category: 'queue', onPlateType: 'region' },
      ],
    },
    {
      id: 'step-event-pipeline-add-functions',
      order: 2,
      title: 'Add Processing Functions',
      instruction:
        'Place two Function blocks on the Region plate - one for event processing and one for batch processing.',
      hints: [
        'You need at least two functions: one triggered by events and one for batch processing.',
        'Functions run on the Region plate, not in subnets.',
      ],
      validationRules: [{ type: 'min-block-count', category: 'function', count: 2 }],
      checkpoint: eventPipelineCheckpointAfterStep2,
    },
    {
      id: 'step-event-pipeline-add-timer-storage',
      order: 3,
      title: 'Add an Event Trigger and Storage',
      instruction: 'Place an Event trigger on the Region plate and a Storage block on the Private Subnet.',
      hints: [
        'Event triggers can drive scheduled or asynchronous processing workflows.',
        'Storage in the private subnet keeps your data secure.',
      ],
      validationRules: [
        { type: 'block-exists', category: 'event', onPlateType: 'region' },
        {
          type: 'block-exists',
          category: 'storage',
          onPlateType: 'subnet',
          onSubnetAccess: 'private',
        },
      ],
    },
    {
      id: 'step-event-pipeline-connect',
      order: 4,
      title: 'Connect the Pipeline',
      instruction: 'Wire: Event -> Function, Queue -> Function, Event -> Function, and Functions -> Storage.',
      hints: [
        'Events and Queues trigger Functions for processing.',
        'Functions process data and write results to Storage.',
        'Each trigger type connects to its designated processing function.',
      ],
      validationRules: [
        { type: 'connection-exists', sourceCategory: 'event', targetCategory: 'function' },
        { type: 'connection-exists', sourceCategory: 'queue', targetCategory: 'function' },
        { type: 'connection-exists', sourceCategory: 'function', targetCategory: 'storage' },
      ],
      checkpoint: eventPipelineCheckpointWithAllBlocks,
    },
    {
      id: 'step-event-pipeline-final-validate',
      order: 5,
      title: 'Final Validation',
      instruction: 'Validate your event-driven pipeline architecture.',
      hints: [
        'All serverless blocks must be on the Region plate.',
        'Ensure at least 2 functions are present for the dual-processing pattern.',
      ],
      validationRules: [
        { type: 'architecture-valid' },
        { type: 'min-block-count', category: 'function', count: 2 },
        { type: 'min-plate-count', plateType: 'region', count: 1 },
      ],
    },
  ],
};

export function registerBuiltinScenarios(): void {
  registerScenario(threeTierScenario);
  registerScenario(serverlessApiScenario);
  registerScenario(eventPipelineScenario);
}
