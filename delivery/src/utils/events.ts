import { Queue } from "bullmq";
import config from "../config/env";

const NOTIFICATIONS_QUEUE = "notifications";

let queue : Queue | null = null;

function get_queue() : Queue {
    if(queue === null){
        const redis_url = new URL(config.redis.url);
        const connection = { host : redis_url.hostname, port : Number(redis_url.port) || 6379 };
        queue = new Queue(NOTIFICATIONS_QUEUE, { connection });
    }
    return queue;
}

/**
 * Publishes a notification event to the shared queue. Fire-and-forget: any
 * failure is swallowed so a notification hiccup can never break the main flow.
 */
export async function publish_event(type : string, user_id : string, data : Record<string, unknown>) : Promise<void> {
    try {
        await get_queue().add(type, { type, user_id, data }, { removeOnComplete : true, removeOnFail : 100 });
    } catch {
        // notifications are best-effort
    }
}
