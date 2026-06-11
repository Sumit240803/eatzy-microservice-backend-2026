/**
 * Shared event contract between the producing services (orders, payments,
 * delivery) and this notifications consumer.
 */

export const NOTIFICATIONS_QUEUE = "notifications";

export type NotificationEventType =
    | "ORDER_PLACED"
    | "ORDER_STATUS_CHANGED"
    | "PAYMENT_SUCCEEDED"
    | "PAYMENT_REFUNDED"
    | "DELIVERY_ASSIGNED";

export interface NotificationEvent {
    type : NotificationEventType;
    user_id : string; // recipient (resolved to an email by this service)
    data : Record<string, unknown>;
}
