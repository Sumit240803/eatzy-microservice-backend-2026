import { NotificationEventType } from "./events";

export interface RenderedEmail {
    subject : string;
    body : string;
}

/**
 * Renders the email subject/body for an event. `name` is the recipient's name.
 */
export function render_email(type : NotificationEventType, name : string, data : Record<string, unknown>) : RenderedEmail {
    const hi = `Hi ${name},`;
    const order_id = String(data.order_id ?? "");
    const amount = data.amount !== undefined ? String(data.amount) : "";
    const status = String(data.status ?? "");

    switch(type){
        case "ORDER_PLACED":
            return {
                subject : "Your order has been placed",
                body : `${hi}\n\nWe've received your order ${order_id}. The restaurant will confirm it shortly.\n\nThanks for ordering with Eatzy!`
            };
        case "ORDER_STATUS_CHANGED":
            return {
                subject : `Order update: ${status}`,
                body : `${hi}\n\nYour order ${order_id} is now ${status}.\n\nEatzy`
            };
        case "PAYMENT_SUCCEEDED":
            return {
                subject : "Payment received",
                body : `${hi}\n\nWe've received your payment of ${amount} for order ${order_id}.\n\nEatzy`
            };
        case "PAYMENT_REFUNDED":
            return {
                subject : "Refund processed",
                body : `${hi}\n\nA refund of ${amount} for order ${order_id} has been processed.\n\nEatzy`
            };
        case "DELIVERY_ASSIGNED":
            return {
                subject : "A driver is on the way",
                body : `${hi}\n\nA delivery agent has been assigned to your order ${order_id} and will pick it up soon.\n\nEatzy`
            };
        default:
            return {
                subject : "Notification from Eatzy",
                body : `${hi}\n\nYou have a new update.\n\nEatzy`
            };
    }
}
