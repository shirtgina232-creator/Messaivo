// Credit costs per operation — only defined operations consume credits.
// Navigation, viewing, and analytics reads never consume credits.

export const CREDIT_COSTS = {
  // AI-powered operations
  AI_REPLY:                10,
  AI_TEMPLATE_GENERATION:  20,
  AI_SUMMARY:              10,

  // Messaging operations
  SEND_MESSAGE:             1,
  SEND_BROADCAST_MESSAGE:   1,   // per recipient

  // Template operations (non-AI)
  APPLY_TEMPLATE:           0,   // free

  // Sync operations
  PAGE_SYNC:                0,   // free
} as const;

export type CreditOperationKey = keyof typeof CREDIT_COSTS;

// Human-readable labels for credit activity history
export const CREDIT_OPERATION_LABELS: Record<CreditOperationKey, string> = {
  AI_REPLY:               "AI Reply",
  AI_TEMPLATE_GENERATION: "AI Template Generation",
  AI_SUMMARY:             "AI Summary",
  SEND_MESSAGE:           "Message Sent",
  SEND_BROADCAST_MESSAGE: "Broadcast Message",
  APPLY_TEMPLATE:         "Template Applied",
  PAGE_SYNC:              "Page Sync",
};
