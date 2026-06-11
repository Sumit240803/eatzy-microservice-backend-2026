import nodemailer, { Transporter } from "nodemailer";
import config from "../config/env";

let transporter_promise : Promise<{ transporter : Transporter; mode : string }> | null = null;

/**
 * Builds the transporter once: real SMTP when SMTP_HOST is configured,
 * otherwise an Ethereal test account (real SMTP with a preview URL) so emails
 * are verifiable locally without credentials.
 */
// Keep send attempts snappy so a blocked/slow SMTP host fails fast instead of
// hanging on the default ~minute-long socket timeouts.
const TIMEOUTS = { connectionTimeout : 8000, greetingTimeout : 8000, socketTimeout : 10000 };

async function build(){
    if(config.smtp.host){
        const transporter = nodemailer.createTransport({
            host : config.smtp.host,
            port : config.smtp.port,
            secure : config.smtp.port === 465,
            auth : config.smtp.user ? { user : config.smtp.user, pass : config.smtp.pass } : undefined,
            ...TIMEOUTS
        });
        return { transporter, mode : `smtp:${config.smtp.host}` };
    }
    const test = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
        host : "smtp.ethereal.email",
        port : 587,
        secure : false,
        auth : { user : test.user, pass : test.pass },
        ...TIMEOUTS
    });
    return { transporter, mode : "ethereal" };
}

function get_transporter(){
    if(transporter_promise === null){
        transporter_promise = build();
    }
    return transporter_promise;
}

export interface SendResult {
    messageId : string;
    previewUrl : string | null;
    mode : string;
}

export async function send_email(from : string, to : string, subject : string, body : string) : Promise<SendResult> {
    const { transporter, mode } = await get_transporter();
    const info = await transporter.sendMail({ from, to, subject, text : body });
    return {
        messageId : info.messageId,
        previewUrl : nodemailer.getTestMessageUrl(info) || null,
        mode
    };
}

/** The active mailer mode (e.g. "ethereal" or "smtp:smtp.sendgrid.net"). */
export async function mailer_mode() : Promise<string> {
    return (await get_transporter()).mode;
}
