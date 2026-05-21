export type InviteEmailContent = {
  acceptUrl: string;
  logoUrl: string;
  logoAlt: string;
  heading: string;
  intro: string;
  cta: string;
  expiry: string;
  footer: string;
};

// Inline-styled, table-based HTML matching the OTP email. The CTA is the first <a href> so the
// dev/e2e mail-capture extractor records the accept link (see capture.ts).
export function buildInviteEmailHtml(content: InviteEmailContent): string {
  const { acceptUrl, logoUrl, logoAlt, heading, intro, cta, expiry, footer } = content;
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="${logoAlt}" width="180" style="display:block;width:180px;max-width:62%;height:auto;margin:0 auto;" />`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-style:italic;color:#1d2733;">Nach<span style="font-style:normal;font-weight:600;letter-spacing:0.04em;">KLANG</span></span>`;
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f1e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e8;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;background:#fffdf8;border:1px solid #e7ddc9;border-radius:16px;">
        <tr><td align="center" style="padding:32px 32px 8px;">${logo}</td></tr>
        <tr><td style="padding:16px 32px 0;font-family:Georgia,'Times New Roman',serif;color:#1d2733;font-size:21px;line-height:1.3;">
          <p style="margin:0;">${heading}</p>
        </td></tr>
        <tr><td style="padding:12px 32px 0;font-family:Arial,Helvetica,sans-serif;color:#1d2733;font-size:16px;line-height:1.5;">
          <p style="margin:0;">${intro}</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px;">
          <a href="${acceptUrl}" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#fffdf8;background:#1d2733;border-radius:12px;padding:14px 26px;text-decoration:none;">${cta}</a>
        </td></tr>
        <tr><td style="padding:0 32px;font-family:Arial,Helvetica,sans-serif;color:#5b6675;font-size:14px;line-height:1.5;">
          <p style="margin:0;">${expiry}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <div style="border-top:1px solid #e7ddc9;padding-top:16px;font-family:Arial,Helvetica,sans-serif;color:#8a93a0;font-size:12px;line-height:1.5;">${footer}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
