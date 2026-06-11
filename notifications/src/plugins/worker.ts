import fp from "fastify-plugin";
import { Worker } from "bullmq";
import config from "../config/env";
import { NOTIFICATIONS_QUEUE, NotificationEvent } from "../utils/events";
import { fetch_user } from "../utils/auth-client";
import { render_email } from "../utils/templates";
import { send_email, mailer_mode } from "../utils/mailer";

/**
 * Runs the BullMQ worker that consumes notification events published by the
 * other services. For each event it resolves the recipient's email from the
 * auth service, renders an email, persists a Notification row, and sends it.
 */
export default fp(async (fastify) => {
    const redis_url = new URL(config.redis.url);
    const connection = { host : redis_url.hostname, port : Number(redis_url.port) || 6379 };

    const worker = new Worker(NOTIFICATIONS_QUEUE, async (job) => {
        const event = job.data as NotificationEvent;

        const user = await fetch_user(event.user_id);
        if(user === null){
            fastify.log.warn(`notifications: unknown user ${event.user_id} for ${event.type}, skipping`);
            return;
        }

        const { subject, body } = render_email(event.type, user.name, event.data);
        const record = await fastify.prisma.notification.create({
            data : {
                user_id : user.id,
                type : event.type,
                recipient : user.email,
                subject,
                body,
                data : event.data as object
            }
        });

        try {
            const result = await send_email(config.smtp.from, user.email, subject, body);
            await fastify.prisma.notification.update({
                where : { id : record.id },
                data : { status : "SENT", sent_at : new Date() }
            });
            fastify.log.info(`notification ${record.id} (${event.type}) sent to ${user.email} via ${result.mode}${result.previewUrl ? " preview=" + result.previewUrl : ""}`);
        } catch (err) {
            await fastify.prisma.notification.update({
                where : { id : record.id },
                data : { status : "FAILED", error : (err as Error).message }
            });
            fastify.log.error(`notification ${record.id} (${event.type}) failed: ${(err as Error).message}`);
        }
    }, { connection, concurrency : 5 });

    worker.on("ready", async () => {
        fastify.log.info(`notifications worker listening on queue "${NOTIFICATIONS_QUEUE}" (mailer: ${await mailer_mode()})`);
    });
    worker.on("failed", (job, err) => {
        fastify.log.error(`notifications job ${job?.id} failed: ${err.message}`);
    });

    fastify.addHook("onClose", async () => {
        await worker.close();
    });
});
