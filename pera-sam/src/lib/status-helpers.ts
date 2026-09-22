import { CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { createElement } from 'react';

/**
 * Returns Tailwind CSS classes for a given status badge.
 * Used consistently across RequestsPage, DashboardHome, and HistoryPage.
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'normal':
    case 'completed':
      return 'bg-success/10 text-success border-success/20';
    case 'warning':
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'abnormal':
    case 'declined':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'accepted':
      return 'bg-info/10 text-info border-info/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

/**
 * Returns the appropriate icon element for a given status.
 */
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'normal':
    case 'completed':
    case 'accepted':
      return createElement(CheckCircle, { className: 'h-4 w-4' });
    case 'warning':
    case 'pending':
      return createElement(Clock, { className: 'h-4 w-4' });
    case 'abnormal':
      return createElement(AlertTriangle, { className: 'h-4 w-4' });
    case 'declined':
      return createElement(XCircle, { className: 'h-4 w-4' });
    default:
      return createElement(Clock, { className: 'h-4 w-4' });
  }
};

/**
 * Formats a status string for display (capitalizes first letter).
 */
export const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};
