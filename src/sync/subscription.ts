/**
 * Subscription represents an active subscription that can be cancelled.
 */
export interface Subscription {
  /**
   * unsubscribe cancels the subscription.
   */
  unsubscribe(): void | Promise<void>;
}
