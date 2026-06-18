/**
 * TAO Recruit AI — Email Notification Service
 * ============================================================
 * Centralized service to send transactional emails to candidates.
 *
 * Safe-guards:
 * - If RESEND_API_KEY is missing, it will gracefully log emails
 *   to the server console, allowing development and local usage
 *   without breaking application workflows.
 * ============================================================
 */

import { Resend } from "resend";
import { 
  getApplicationReceivedHtml, 
  getInterviewInviteHtml, 
  getShortlistHtml, 
  getRejectionHtml,
  getOfferExtendedHtml
} from "./emails";

const apiKey = process.env.RESEND_API_KEY;
// If using the Resend Sandbox, default sender is onboarding@resend.dev
const defaultFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let resend: Resend | null = null;

if (apiKey) {
  try {
    resend = new Resend(apiKey);
    console.log("[EmailService] Resend client initialized successfully.");
  } catch (err: any) {
    console.error("[EmailService] Error initializing Resend:", err.message);
  }
} else {
  console.warn(
    "[EmailService] WARNING: RESEND_API_KEY is missing from environment. " +
    "Emails will be printed to server console instead of being delivered."
  );
}

export class EmailService {
  /**
   * Helper to send HTML email
   */
  private static async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!resend) {
      console.log(
        `\n[EmailService Mock Send] 📬\n` +
        `  To: ${to}\n` +
        `  Subject: ${subject}\n` +
        `  From: ${defaultFrom}\n` +
        `  HTML Preview Size: ${html.length} chars\n` +
        `  [RESEND_API_KEY is unconfigured]\n`
      );
      return true;
    }

    try {
      if (defaultFrom === "onboarding@resend.dev") {
        console.warn(
          `[EmailService] WARNING: Sending email to ${to} using default 'onboarding@resend.dev'. ` +
          `This will only succeed if the recipient matches your registered Resend account owner email. ` +
          `To send to others, configure RESEND_FROM_EMAIL with your verified domain.`
        );
      }

      const { data, error } = await resend.emails.send({
        from: `TAO Recruit AI <${defaultFrom}>`,
        to,
        subject,
        html,
      });

      if (error) {
        console.error(`[EmailService] Failed to send email to ${to}:`, error);
        return false;
      }

      console.log(`[EmailService] Email sent successfully to ${to}. ID: ${data?.id}`);
      return true;
    } catch (err: any) {
      console.error(`[EmailService] Uncaught error sending email to ${to}:`, err.message);
      return false;
    }
  }

  /**
   * 1. Application Received Email
   */
  public static async sendApplicationReceived(to: string, candidateName: string, jobTitle: string): Promise<boolean> {
    const html = getApplicationReceivedHtml({ candidateName, jobTitle });
    return this.sendEmail(to, `Application Received — ${jobTitle}`, html);
  }

  /**
   * 2. AI Voice Interview Invitation Email
   */
  public static async sendInterviewInvite(to: string, candidateName: string, jobTitle: string, applicationId: string): Promise<boolean> {
    const actionUrl = `${appUrl}/candidate/interview/${applicationId}`;
    const html = getInterviewInviteHtml({ candidateName, jobTitle, actionUrl });
    return this.sendEmail(to, `Invitation to Voice Interview — ${jobTitle}`, html);
  }

  /**
   * 3. Shortlisted Email
   */
  public static async sendShortlisted(to: string, candidateName: string, jobTitle: string): Promise<boolean> {
    const html = getShortlistHtml({ candidateName, jobTitle });
    return this.sendEmail(to, `Application Shortlisted — ${jobTitle}`, html);
  }

  /**
   * 4. Rejection Email
   */
  public static async sendRejection(to: string, candidateName: string, jobTitle: string): Promise<boolean> {
    const html = getRejectionHtml({ candidateName, jobTitle });
    return this.sendEmail(to, `Update on your application — ${jobTitle}`, html);
  }

  /**
   * 5. Offer Extended Email
   */
  public static async sendOfferExtended(to: string, candidateName: string, jobTitle: string): Promise<boolean> {
    const html = getOfferExtendedHtml({ candidateName, jobTitle });
    return this.sendEmail(to, `Job Offer Extended — ${jobTitle}`, html);
  }
}
export default EmailService;
