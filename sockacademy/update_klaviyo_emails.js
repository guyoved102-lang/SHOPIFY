const API_KEY = "pk_QSMqNV_10278b2159681589f1365ac70b04825dff";
const BASE_URL = "https://a.klaviyo.com/api";
const HEADERS = {
  Authorization: `Klaviyo-API-Key ${API_KEY}`,
  revision: "2024-02-15",
  "Content-Type": "application/json",
  Accept: "application/json",
};

function emailHtml({ bodyLines, coupon, buttonText, buttonUrl }) {
  const couponBlock = coupon
    ? `<div style="background:#1a1a1a;color:#c9a84c;font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:bold;letter-spacing:4px;text-align:center;padding:16px 40px;margin:24px 0;border-radius:4px;">${coupon}</div>
       <p style="text-align:center;font-size:14px;color:#eee;margin:0 0 24px;">Valid for 7 days from signup</p>`
    : "";

  const buttonBlock =
    buttonText && buttonUrl
      ? `<div style="text-align:center;margin-top:32px;">
           <a href="${buttonUrl}" style="background:#1a1a1a;color:#c9a84c;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:2px;display:inline-block;">${buttonText}</a>
         </div>`
      : "";

  const bodyHtml = bodyLines
    .map((l) => `<p style="margin:0 0 16px;">${l}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f0ede6;">
<!-- TRACKING_PIXEL_TOP -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0ede6;padding:40px 0 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <tr><td style="background:#c9a84c;padding:24px;text-align:center;">
        <img src="https://d3k81ch9hvuctc.cloudfront.net/company/Pb3wug/images/b97f400a-3e8f-4547-91f2-cb8c701d76d7.png"
             width="140" alt="SockAcademy" style="display:block;margin:0 auto;"/>
      </td></tr>

      <tr><td style="background:#c9a84c;padding:40px;">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#fff;">
          ${bodyHtml}
          ${couponBlock}
          ${buttonBlock}
        </div>
      </td></tr>

      <tr><td style="background:#1a1a1a;padding:24px;text-align:center;">
        <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#888;margin:0 0 8px;">
          No longer want to receive these emails?&nbsp;
          <a href="{% unsubscribe_link %}" style="color:#c9a84c;text-decoration:underline;">Unsubscribe</a>
        </p>
        <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#888;margin:0;">
          {{ organization.name }} {{ organization.full_address }}
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
<!-- TRACKING_PIXEL_BOTTOM -->
</body>
</html>`;
}

const emails = [
  {
    messageId: "WaA9tF",
    templateId: "XX22Ya",
    subject: "Welcome to the Sock Academy 🧦",
    previewText: "The world's first sock authority — plus 10% off.",
    name: "SockAcademy Welcome Email",
    html: emailHtml({
      bodyLines: [
        'Hi {{ first_name|default:"there" }},',
        "Welcome to <strong>SockAcademy</strong> — the world's first sock authority.",
        "Use the code below for <strong>10% off your first order</strong>.",
      ],
      coupon: "WELCOME10",
      buttonText: "Shop Now",
      buttonUrl: "https://sockacademy.store",
    }),
  },
  {
    messageId: "UUy4er",
    templateId: "WGXVJU",
    subject: 'Why "just socks" is the biggest lie in fashion',
    previewText: "The right sock changes everything.",
    name: "SockAcademy - Why Socks Matter",
    html: emailHtml({
      bodyLines: [
        'Hi {{ first_name|default:"there" }},',
        'Everyone says socks are an afterthought. <strong>We disagree.</strong>',
        "The right sock changes your stride, your style, and your day.",
        "That's why we built SockAcademy — to give socks the respect they deserve.",
        "— The SockAcademy Team",
      ],
      buttonText: "Explore the Collection",
      buttonUrl: "https://sockacademy.store",
    }),
  },
  {
    messageId: "YvpPfp",
    templateId: "Sv787j",
    subject: "Your 10% expires soon ⏰",
    previewText: "48 hours left to use WELCOME10.",
    name: "SockAcademy - Discount Expiring",
    html: emailHtml({
      bodyLines: [
        'Hi {{ first_name|default:"there" }},',
        "Your welcome discount expires in <strong>48 hours</strong>.",
        "Use code <strong>WELCOME10</strong> at checkout for 10% off.",
        "— The SockAcademy Team",
      ],
      buttonText: "Shop Before It Expires",
      buttonUrl: "https://sockacademy.store",
    }),
  },
];

async function patch(url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

(async () => {
  for (let i = 0; i < emails.length; i++) {
    const e = emails[i];
    console.log(`\n=== Email ${i + 1} ===`);

    // Update subject / preview text
    const msgRes = await patch(`${BASE_URL}/flow-messages/${e.messageId}/`, {
      data: {
        type: "flow-message",
        id: e.messageId,
        attributes: {
          name: e.name,
          content: {
            subject: e.subject,
            preview_text: e.previewText,
            from_email: "hello@sockacademy.store",
            from_label: "SockAcademy",
            reply_to_email: "hello@sockacademy.store",
          },
        },
      },
    });
    console.log(`  flow-message: ${msgRes.status}`);
    if (![200, 204].includes(msgRes.status)) console.log("  ERR:", msgRes.text.slice(0, 300));

    // Update template HTML
    const tplRes = await patch(`${BASE_URL}/templates/${e.templateId}/`, {
      data: {
        type: "template",
        id: e.templateId,
        attributes: { html: e.html },
      },
    });
    console.log(`  template:     ${tplRes.status}`);
    if (![200, 204].includes(tplRes.status)) console.log("  ERR:", tplRes.text.slice(0, 300));
  }
  console.log("\n✓ Done!");
})();
