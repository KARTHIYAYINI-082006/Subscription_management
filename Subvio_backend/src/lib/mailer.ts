import nodemailer from 'nodemailer';
import { env } from './env';

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465,
  auth: { user: env.email.user, pass: env.email.password },
});

function layout(title: string, body: string) {
  return `
  <div style="background:#FAF8FC;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif;color:#30283A">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #EBE5EF;border-radius:12px;overflow:hidden">
      <div style="background:#281D35;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">Subvio</div>
      <div style="padding:28px">
        <h2 style="margin:0 0 16px;font-size:18px">${title}</h2>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #EBE5EF;color:#81778B;font-size:12px">
        Subscriptions, simplified. Growth, amplified.
      </div>
    </div>
  </div>`;
}

export const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#624477;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">${label}</a>`;

export async function sendMail(to: string, subject: string, title: string, body: string) {
  await transporter.sendMail({ from: env.email.from, to, subject, html: layout(title, body) });
}

/** Fire-and-forget variant for non-critical notifications. */
export function sendMailSafe(to: string, subject: string, title: string, body: string) {
  sendMail(to, subject, title, body).catch((err) => console.error(`Email to ${to} failed:`, err.message));
}
