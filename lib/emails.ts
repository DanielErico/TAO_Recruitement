/**
 * TAO Recruit AI — Email Templates
 * ============================================================
 * Production-ready HTML email templates styled with TAO's
 * corporate design system (deep green #046C44, purple #7356BF,
 * and high text readability).
 * ============================================================
 */

interface TemplateData {
  candidateName: string;
  jobTitle: string;
  actionUrl?: string;
}

/**
 * Standard visual wrapper for all emails, ensuring consistency.
 */
function wrapTemplate(title: string, bodyContent: string, actionButton?: { label: string; url: string }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="background-color: #f8faf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; margin: 0; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 560px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8e5; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Brand Header -->
          <div style="font-size: 20px; font-weight: bold; color: #0D1F17; margin-bottom: 28px; display: flex; align-items: center; gap: 8px;">
            <span style="color: #0D1F17;">TAO</span>
            <span style="background-color: #E8F5EE; color: #046C44; font-size: 13px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; margin-left: 6px;">Recruit AI</span>
          </div>

          <!-- Main Content Title -->
          <h2 style="font-size: 22px; font-weight: 800; color: #0D1F17; margin: 0 0 20px 0; letter-spacing: -0.01em;">
            ${title}
          </h2>
          
          <!-- Email Body -->
          <div style="font-size: 15px; line-height: 1.6; color: #6B7C75; margin-bottom: 24px;">
            ${bodyContent}
          </div>

          <!-- Action Button -->
          ${
            actionButton
              ? `
            <div style="text-align: center; margin: 32px 0 28px 0;">
              <a href="${actionButton.url}" target="_blank" style="background-color: #046C44; border-radius: 8px; color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block; padding: 12px 28px; box-shadow: 0 4px 6px -1px rgba(4, 108, 68, 0.15);">
                ${actionButton.label}
              </a>
            </div>
            `
              : ""
          }

          <hr style="border: 0; border-top: 1px solid #e2e8e5; margin: 28px 0;" />

          <!-- Support & Branding Footer -->
          <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6; margin: 0;">
            This is an automated notification from the TAO Recruit AI Platform.<br />
            Have questions or need support? Contact us at 
            <a href="mailto:info@tao.com.ng" style="color: #046C44; text-decoration: underline;">info@tao.com.ng</a>.<br />
            <span style="display: block; margin-top: 8px; font-size: 11px; color: #BDC3C7;">
              © ${new Date().getFullYear()} The Agriculture Option. All rights reserved.
            </span>
          </p>

        </div>
      </body>
    </html>
  `;
}

/**
 * 1. Application Received Template
 */
export function getApplicationReceivedHtml({ candidateName, jobTitle }: TemplateData): string {
  const body = `
    Dear ${candidateName},<br/><br/>
    We have successfully received your application for the <strong>${jobTitle}</strong> position at TAO.<br/><br/>
    Our hiring team is using TAO Recruit AI to evaluate candidates. Our screening process consists of an initial CV credentials analysis followed by a conversational voice interview. We will keep you updated via email on your status.
  `;
  return wrapTemplate(`Application Received`, body);
}

/**
 * 2. Invitation to Voice Interview Template
 */
export function getInterviewInviteHtml({ candidateName, jobTitle, actionUrl }: Required<TemplateData>): string {
  const body = `
    Dear ${candidateName},<br/><br/>
    Great news! Your application for the <strong>${jobTitle}</strong> position has passed our initial CV credentials review.<br/><br/>
    We would love to invite you to the next stage: the **AI-powered voice screening interview**. This is a realistic, conversational audio assessment where questions adapt in real-time based on your background.<br/><br/>
    <strong>Requirements:</strong><br/>
    - A quiet room with a stable internet connection.<br/>
    - A working headset/microphone (answers must be spoken verbally; typing is disabled).<br/>
    - Approximately 10-15 minutes of uninterrupted time.
  `;
  return wrapTemplate(`Invitation to Voice Interview`, body, {
    label: "Start Screening Interview",
    url: actionUrl,
  });
}

/**
 * 3. Shortlisted Update Template
 */
export function getShortlistHtml({ candidateName, jobTitle }: TemplateData): string {
  const body = `
    Dear ${candidateName},<br/><br/>
    We are pleased to inform you that you have been <strong>shortlisted</strong> for the <strong>${jobTitle}</strong> role at TAO.<br/><br/>
    Our HR team is currently coordinating the final selection rounds. We will contact you soon with the schedule and instructions.
  `;
  return wrapTemplate(`Application Shortlisted`, body);
}

/**
 * 4. Application Rejection Template
 */
export function getRejectionHtml({ candidateName, jobTitle }: TemplateData): string {
  const body = `
    Dear ${candidateName},<br/><br/>
    Thank you for your interest in the <strong>${jobTitle}</strong> position and for taking the time to apply and participate in our screening assessments.<br/><br/>
    We received many competitive applications, and after careful review, we regret to inform you that we are not moving forward with your candidacy at this time. We will keep your resume on file for future agricultural opportunities that align with your background.<br/><br/>
    We wish you the very best in your professional endeavors.
  `;
  return wrapTemplate(`Update on your Application`, body);
}

/**
 * 5. Offer Extended Template
 */
export function getOfferExtendedHtml({ candidateName, jobTitle }: TemplateData): string {
  const body = `
    Dear ${candidateName},<br/><br/>
    Congratulations! We are absolutely thrilled to offer you the position of <strong>${jobTitle}</strong> at TAO.<br/><br/>
    Our hiring team was incredibly impressed by your background, credentials, and performance during the AI voice screening interview. We believe your skills and passion will be a fantastic addition to our agricultural operations.<br/><br/>
    Our HR representative will contact you shortly with the formal offer letter and details regarding compensation, benefits, and start dates.<br/><br/>
    Welcome aboard!
  `;
  return wrapTemplate(`Job Offer Extended`, body);
}

