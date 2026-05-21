export type OtpEmailContent = {
  otp: string;
  logoUrl: string;
  logoAlt: string;
  intro: string;
  expiry: string;
  footer: string;
};

// Inline-styled, table-based HTML so it renders consistently across email clients.
// The OTP stays wrapped in <strong> because the dev/e2e mail-capture extractor keys on it.
export function buildOtpEmailHtml(content: OtpEmailContent): string {
  const { otp, logoUrl, logoAlt, intro, expiry, footer } = content;
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="${logoAlt}" width="180" style="display:block;width:180px;max-width:62%;height:auto;margin:0 auto;" />`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-style:italic;color:#1d2733;">Nach<span style="font-style:normal;font-weight:600;letter-spacing:0.04em;">KLANG</span></span>`;
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f1e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e8;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;background:#fffdf8;border:1px solid #e7ddc9;border-radius:16px;">
        <tr><td align="center" style="padding:32px 32px 8px;">${logo}</td></tr>
        <tr><td style="padding:8px 32px 0;font-family:Arial,Helvetica,sans-serif;color:#1d2733;font-size:16px;line-height:1.5;">
          <p style="margin:0;">${intro}</p>
        </td></tr>
        <tr><td align="center" style="padding:20px 32px;">
          <strong style="display:inline-block;font-family:'Courier New',monospace;font-size:30px;letter-spacing:8px;font-weight:700;color:#1d2733;background:#f0e9da;border-radius:12px;padding:14px 22px;">${otp}</strong>
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
