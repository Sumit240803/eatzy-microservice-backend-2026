import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import config from "../config/env";

/**
 * Real Stripe is used when a secret key (sk_...) is configured. Otherwise the
 * service runs in a local "mock" mode that simulates Stripe so the whole flow
 * (create intent, webhook, refund) is runnable without external credentials.
 * Drop a Stripe test key into STRIPE_SECRET_KEY to switch to real Stripe.
 */
const secret_key = config.stripe.secret_key;
const stripe : Stripe | null = secret_key.startsWith("sk_") ? new Stripe(secret_key) : null;

export const provider_mode : "stripe" | "mock" = stripe ? "stripe" : "mock";

export interface CreateIntentParams {
    amount : number;
    currency : string;
    metadata : Record<string, string>;
}

export interface IntentResult {
    id : string;
    client_secret : string;
    status : string;
}

export interface WebhookEvent {
    type : string;
    object : Record<string, any>;
}

function mock_id(prefix : string){
    return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Creates a payment intent for the given amount.
 */
export async function create_payment_intent(params : CreateIntentParams) : Promise<IntentResult> {
    if(stripe){
        const intent = await stripe.paymentIntents.create({
            amount : params.amount,
            currency : params.currency,
            metadata : params.metadata,
            automatic_payment_methods : { enabled : true }
        });
        return { id : intent.id, client_secret : intent.client_secret ?? "", status : intent.status };
    }
    const id = mock_id("pi_mock");
    return { id, client_secret : `${id}_secret_${randomUUID().slice(0, 8)}`, status : "requires_payment_method" };
}

/**
 * Refunds a payment intent, optionally a partial amount.
 */
export async function create_refund(payment_intent_id : string, amount? : number) : Promise<{ id : string; status : string }> {
    if(stripe){
        const refund = await stripe.refunds.create({
            payment_intent : payment_intent_id,
            ...(amount !== undefined ? { amount } : {})
        });
        return { id : refund.id, status : refund.status ?? "succeeded" };
    }
    return { id : mock_id("re_mock"), status : "succeeded" };
}

/**
 * Verifies and parses an incoming webhook. In real mode the Stripe signature is
 * validated against the raw body; in mock mode the JSON body is trusted as-is.
 */
export function construct_webhook_event(raw_body : Buffer, signature : string | undefined) : WebhookEvent {
    if(stripe){
        const event = stripe.webhooks.constructEvent(raw_body, signature ?? "", config.stripe.webhook_secret);
        return { type : event.type, object : event.data.object as Record<string, any> };
    }
    const parsed = JSON.parse(raw_body.toString("utf8"));
    return { type : parsed.type, object : parsed?.data?.object ?? {} };
}
