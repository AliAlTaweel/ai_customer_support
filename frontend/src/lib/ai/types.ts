export interface ConversationState {
  pending_confirmation?: string | null;
  pending_order_summary?: string | null;
  [key: string]: unknown;
}
