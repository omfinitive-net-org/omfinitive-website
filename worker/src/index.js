import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';

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
        care: 'OMFiNiTiVE Care',
        hr: 'OMFiNiTiVE HR',
        procurement: 'OMFiNiTiVE Procurement',
        all: 'Full Platform',
      };

      const interestLabel = interestMap[interest] || 'Not specified';

      const msg = createMimeMessage();
      msg.setSender({ name: 'OMFiNiTiVE Website', addr: 'noreply@omfinitive.net' });
      msg.setRecipient('hello@omfinitive.net');
      msg.setHeader('Reply-To', email);
      msg.setSubject(`Website Enquiry from ${name}`);

      msg.addMessage({
        contentType: 'text/plain',
        data: [
          `New enquiry from the OMFiNiTiVE website:`,
          ``,
          `Name: ${name}`,
          `Email: ${email}`,
          `Organisation: ${organisation || 'Not provided'}`,
          `Interested In: ${interestLabel}`,
          ``,
          `Message:`,
          message,
        ].join('\n'),
      });

      msg.addMessage({
        contentType: 'text/html',
        data: `
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
          </div>`,
      });

      const emailMessage = new EmailMessage('noreply@omfinitive.net', 'hello@omfinitive.net', msg.asRaw());
      await env.EMAIL.send(emailMessage);

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
