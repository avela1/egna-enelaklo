import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';

/**
 * Sends the transactional emails. In development they are caught by Mailpit
 * (SMTP 1025, web UI on 8025).
 *
 * Tokens are never logged. They only ever travel inside the email.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      // Fail fast instead of hanging the request when the SMTP server does
      // not answer. `localhost` can stall on some Windows setups, prefer
      // 127.0.0.1 in the environment.
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      ...(env.SMTP_USER && env.SMTP_PASSWORD
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
        : {}),
    });
  }

  async sendVerifyEmail(to: string, name: string, link: string): Promise<void> {
    await this.send({
      to,
      subject: 'Confirm your email address',
      text: `Hello ${name},\n\nConfirm your email address to finish setting up your egna-enelaklo account:\n${link}\n\nThe link is valid for 24 hours. If you did not create an account you can ignore this email.`,
      html: `<p>Hello ${name},</p><p>Confirm your email address to finish setting up your egna-enelaklo account.</p><p><a href="${link}">Confirm my email address</a></p><p>The link is valid for 24 hours. If you did not create an account you can ignore this email.</p>`,
    });
  }

  async sendPasswordReset(to: string, name: string, link: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your egna-enelaklo password',
      text: `Hello ${name},\n\nChoose a new password here:\n${link}\n\nThe link is valid for 60 minutes and can only be used once. If you did not ask for it you can ignore this email.`,
      html: `<p>Hello ${name},</p><p>Choose a new password here.</p><p><a href="${link}">Set a new password</a></p><p>The link is valid for 60 minutes and can only be used once. If you did not ask for it you can ignore this email.</p>`,
    });
  }

  async sendStaffInvite(to: string, name: string, role: string, link: string): Promise<void> {
    await this.send({
      to,
      subject: 'You have been invited to the egna-enelaklo staff console',
      text: `Hello ${name},\n\nYou have been invited to the egna-enelaklo staff console as ${role}.\n\nSet your password here:\n${link}\n\nThe link is valid for 72 hours.`,
      html: `<p>Hello ${name},</p><p>You have been invited to the egna-enelaklo staff console as <strong>${role}</strong>.</p><p><a href="${link}">Set my password</a></p><p>The link is valid for 72 hours.</p>`,
    });
  }

  private async send(message: {
    html: string;
    subject: string;
    text: string;
    to: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      this.logger.error(
        `Could not send "${message.subject}" to ${message.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
