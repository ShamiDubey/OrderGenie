/**
 * Utility functions for the web frontend
 */

/**
 * Format points for display (e.g., 1.1K for 1100+)
 */
export function formatPoints(points: number): string {
  if (points >= 1000) {
    const formatted = (points / 1000).toFixed(1);
    // Remove trailing .0
    return formatted.endsWith('.0')
      ? `${Math.floor(points / 1000)}K`
      : `${formatted}K`;
  }
  return points.toString();
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Get payment method display label
 */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    PAY_ON_COUNTER: 'Pay on Counter',
    CREDIT_CARD: 'Credit Card',
    DEBIT_CARD: 'Debit Card',
    UPI: 'UPI',
    APPLE_PAY: 'Apple Pay',
    GOOGLE_PAY: 'Google Pay',
    UPI_APPS: 'UPI Apps',
  };
  return labels[method] || method;
}
