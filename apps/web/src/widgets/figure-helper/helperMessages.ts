export type HelperMessageType = 'error' | 'hint' | 'success';

export interface HelperMessage {
  key: string;
  type: HelperMessageType;
  text: string;
  targetId?: string;
}


export const HINT_EMPTY_CANVAS: Omit<HelperMessage, 'targetId'> = {
  key: 'hint-empty-canvas',
  type: 'hint',
  text: 'Add a block to start building your architecture.',
};

export const HINT_FIRST_BLOCK: Omit<HelperMessage, 'targetId'> = {
  key: 'hint-first-block',
  type: 'hint',
  text: 'Nice! Now connect blocks to define relationships.',
};

export const SUCCESS_VALID: Omit<HelperMessage, 'targetId'> = {
  key: 'success-valid',
  type: 'success',
  text: 'Everything looks good — your architecture is valid!',
};
