import { AwsClient } from 'aws4fetch';

// Mail goes out through Amazon SES (omfinitive.net is a verified SES identity).
// Cloudflare Email Routing is not used: enabling it would take over the domain's MX records.
const FROM = 'OMFiNiTiVE Website <no-reply@omfinitive.net>';
const TO = 'hello@omfinitive.net';

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://www.omfinitive.net';
    const isAllowed = origin === allowed || origin === 'https://omfinitive-net-org.github.io';
    const headers = corsHeaders(isAllowed ? origin : allowed);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();
      const { name, email, organisation, interest, message, turnstileToken } = body;

      // Validate required fields
      if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: 'Name, email, and message are required.' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Validate Cloudflare Turnstile
      const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET,
          response: turnstileToken,
          remoteip: request.headers.get('CF-Connecting-IP'),
        }),
      });

      const turnstileData = await turnstileResult.json();
      if (!turnstileData.success) {
        return new Response(JSON.stringify({ error: 'Captcha verification failed. Please try again.' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Build email
      const interestMap = {
        'domiciliary-care': 'Domiciliary Care',
        'supported-living': 'Supported Living (Adults)',
        'supported-living-children': 'Supported Living (Children)',
        'care-home': 'Care Home',
        'childrens-home': "Young Children (children's homes)",
        'supported-accommodation-16': 'Supported Accommodation (16+)',
        'healthcare-recruitment': 'Recruitment (temporary staffing)',
        'core-hr': 'Core HR',
        'hr-payroll': 'HR + Payroll',
        'workforce-os': 'Workforce OS',
        'full-stack': 'Full Stack',
        'demo': 'Book a demo',
        'cqc-registration': 'CQC registration support',
        'ofsted-registration': 'Ofsted registration support',
        'data-migration': 'Data import & migration',
        'policy-templates': 'Policy templates',
        'other': 'Something else',
        // older form values
        care: 'OMFiNiTiVE Care',
        hr: 'OMFiNiTiVE HR',
        all: 'Full Platform',
      };

      // The form allows several choices, sent comma-separated.
      const interestLabel = String(interest || '').split(',').map((k) => k.trim()).filter(Boolean)
        .slice(0, 20).map((k) => interestMap[k] || k.slice(0, 60)).join(', ') || 'Not specified';

      const subject = `Website Enquiry from ${name}`;

      const text = [
          `New enquiry from the OMFiNiTiVE website:`,
          ``,
          `Name: ${name}`,
          `Email: ${email}`,
          `Organisation: ${organisation || 'Not provided'}`,
          `Interested In: ${interestLabel}`,
          ``,
          `Message:`,
          message,
        ].join('\n');

      const html = `
          <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #001F3F, #002a57); padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h2 style="color: #ffffff; margin: 0; font-family: 'Montserrat', Arial, sans-serif;">New Website Enquiry</h2>
            </div>
            <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; width: 120px;">Name</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #007BFF;">${escapeHtml(email)}</a></td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Organisation</td><td style="padding: 8px 0; color: #1e293b;">${escapeHtml(organisation || 'Not provided')}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Interested In</td><td style="padding: 8px 0; color: #1e293b;">${escapeHtml(interestLabel)}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
              <p style="color: #64748b; margin: 0 0 8px; font-size: 14px;">Message:</p>
              <p style="color: #1e293b; margin: 0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
            </div>
          </div>`;

      const ses = new AwsClient({
        accessKeyId: env.SES_ACCESS_KEY,
        secretAccessKey: env.SES_SECRET_KEY,
        region: env.SES_REGION || 'eu-west-2',
        service: 'ses',
      });
      const sesRes = await ses.fetch(`https://email.${env.SES_REGION || 'eu-west-2'}.amazonaws.com/v2/email/outbound-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          FromEmailAddress: FROM,
          Destination: { ToAddresses: [TO] },
          ReplyToAddresses: [email],
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: { Text: { Data: text, Charset: 'UTF-8' }, Html: { Data: html, Charset: 'UTF-8' } },
            },
          },
        }),
      });
      if (!sesRes.ok) {
        throw new Error(`SES send failed: ${sesRes.status} ${(await sesRes.text()).slice(0, 300)}`);
      }

      return new Response(JSON.stringify({ success: true, message: 'Your message has been sent successfully.' }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Contact form error:', err);
      return new Response(JSON.stringify({ error: 'Something went wrong. Please try again later.' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  },
};
