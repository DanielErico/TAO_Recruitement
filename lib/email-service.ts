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
  getOfferExtendedHtml,
  getHRNewApplicationHtml,
  getHRInterviewCompletedHtml
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
   * Internal helper to send HTML email (private)
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
   * 2. AI Voice Interview Invitation Email (Plan A)
   */
  public static async sendInterviewInvite(
    to: string, 
    candidateName: string, 
    jobTitle: string, 
    applicationId: string,
    appUrlOrigin?: string
  ): Promise<boolean> {
    const baseUrl = appUrlOrigin || appUrl;
    const actionUrl = `${baseUrl}/candidate/interview/${applicationId}`;
    const html = getInterviewInviteHtml({ candidateName, jobTitle, actionUrl });
    return this.sendEmail(to, `Invitation to Voice Interview — ${jobTitle}`, html);
  }

  /**
   * 2b. Online Assessment Invitation Email (Plan B)
   */
  public static async sendAssessmentInvite(
    to: string,
    candidateName: string,
    jobTitle: string,
    applicationId: string,
    appUrlOrigin?: string
  ): Promise<boolean> {
    const baseUrl = appUrlOrigin || appUrl;
    const actionUrl = `${baseUrl}/candidate/assessment/${applicationId}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="margin-bottom: 24px;">
          <h2 style="color: #0d9488; margin: 0 0 8px 0; font-size: 22px;">Online Assessment Invitation</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0;">The Agriculture Option (TAO) Recruitment</p>
        </div>
        
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Dear <strong>${candidateName}</strong>,</p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
          Thank you for applying for the <strong>${jobTitle}</strong> position. Your resume and application have been successfully received.
        </p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
          As the next stage of our recruitment journey, please complete your position-tailored online recruitment assessment. This assessment consists of 6 structured, written questions designed to evaluate your role understanding, experience, and practical problem-solving.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${actionUrl}" style="background-color: #0d9488; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2);">
            Start Online Assessment Now →
          </a>
        </div>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #64748b; margin: 0 0 4px 0; font-weight: 600;">Assessment Details:</p>
          <ul style="font-size: 12px; color: #475569; margin: 0; padding-left: 18px; line-height: 1.5;">
            <li>Format: Form-based written questions (no audio or video required)</li>
            <li>Estimated time: 15–20 minutes</li>
            <li>Draft answers are automatically saved to your browser</li>
          </ul>
        </div>
        
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          If the button above does not work, copy and paste this link into your browser:<br/>
          <a href="${actionUrl}" style="color: #0d9488; word-break: break-all;">${actionUrl}</a>
        </p>
        
        <p style="font-size: 13px; color: #475569; margin-top: 24px;">
          Warm regards,<br/>
          <strong>TAO Recruitment Team</strong>
        </p>
      </div>
    `;
    return this.sendEmail(to, `Invitation to Online Assessment — ${jobTitle}`, html);
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

  /**
   * 6. HR New Application Notification
   * Fires whenever a candidate submits an application. Notifies HR instantly.
   */
  public static async sendHRNewApplication(
    hrEmail: string,
    candidateName: string,
    candidateEmail: string,
    jobTitle: string,
    fitScore: number,
    applicationStatus: string,
    applicationId: string,
    appUrlOrigin?: string
  ): Promise<boolean> {
    const baseUrl = appUrlOrigin || appUrl;
    const applicationUrl = `${baseUrl}/recruiter/applications/${applicationId}`;
    const html = getHRNewApplicationHtml({
      candidateName,
      candidateEmail,
      jobTitle,
      fitScore,
      applicationStatus,
      applicationUrl,
    });
    return this.sendEmail(hrEmail, `New Application: ${candidateName} → ${jobTitle}`, html);
  }

  /**
   * 7. HR Interview Completed Notification
   * Notifies HR instantly when a candidate concludes their voice interview.
   */
  public static async sendHRInterviewCompleted(
    hrEmail: string,
    candidateName: string,
    candidateEmail: string,
    jobTitle: string,
    overallScore: number,
    technicalScore: number,
    communicationScore: number,
    experienceScore: number,
    problemSolvingScore: number,
    cultureFitScore: number,
    recommendation: string,
    switchedTabs: boolean,
    applicationId: string,
    appUrlOrigin?: string
  ): Promise<boolean> {
    const baseUrl = appUrlOrigin || appUrl;
    const applicationUrl = `${baseUrl}/recruiter/applications/${applicationId}`;
    const html = getHRInterviewCompletedHtml({
      candidateName,
      candidateEmail,
      jobTitle,
      overallScore,
      technicalScore,
      communicationScore,
      experienceScore,
      problemSolvingScore,
      cultureFitScore,
      recommendation,
      switchedTabs,
      applicationUrl,
    });
    return this.sendEmail(hrEmail, `Interview Concluded: ${candidateName} — ${jobTitle}`, html);
  }
  /**
   * 8. Plan B — Assessment Submission Confirmation
   * Sent to candidates when their online assessment is received.
   */
  public static async sendAssessmentConfirmation(
    to: string,
    candidateName: string,
    jobTitle: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0d9488;">Assessment Received</h2>
        <p>Dear ${candidateName},</p>
        <p>Thank you for completing your online recruitment assessment for the <strong>${jobTitle}</strong> position at The Agriculture Option (TAO).</p>
        <p>Your responses, application, and CV have been safely recorded and submitted to our recruitment team for review.</p>
        <p>We will keep you updated on the progress of your application via email.</p>
        <br/>
        <p>Warm regards,<br/><strong>TAO Recruitment Team</strong></p>
      </div>
    `;
    return this.sendEmail(to, `Assessment Received — ${jobTitle}`, html);
  }
}
export default EmailService;
