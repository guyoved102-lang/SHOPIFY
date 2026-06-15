import requests
import json

API_KEY = "pk_QSMqNV_10278b2159681589f1365ac70b04825dff"
HEADERS = {
    "Authorization": f"Klaviyo-API-Key {API_KEY}",
    "revision": "2024-02-15",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

BASE_URL = "https://a.klaviyo.com/api"

def email_html(title, body_lines, button_text=None, button_url=None, coupon=None):
    coupon_block = ""
    if coupon:
        coupon_block = f"""
        <div style="background:#1a1a1a;color:#c9a84c;font-family:Helvetica,Arial,sans-serif;
             font-size:22px;font-weight:bold;letter-spacing:4px;text-align:center;
             padding:16px 40px;margin:24px 0;border-radius:4px;">{coupon}</div>
        <p style="text-align:center;font-size:14px;color:#888;margin:0 0 24px;">
          Valid for 7 days from signup</p>
        """

    button_block = ""
    if button_text and button_url:
        button_block = f"""
        <div style="text-align:center;margin-top:32px;">
          <a href="{button_url}" style="background:#c9a84c;color:#000;font-family:Helvetica,Arial,sans-serif;
             font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;
             border-radius:2px;display:inline-block;">{button_text}</a>
        </div>
        """

    body_html = "".join(f'<p style="margin:0 0 16px;">{line}</p>' for line in body_lines)

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f0ede6;">
<!-- TRACKING_PIXEL_TOP -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0ede6;padding:40px 0 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background:#c9a84c;padding:24px;text-align:center;">
        <img src="https://d3k81ch9hvuctc.cloudfront.net/company/Pb3wug/images/b97f400a-3e8f-4547-91f2-cb8c701d76d7.png"
             width="140" alt="SockAcademy" style="display:block;margin:0 auto;"/>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#c9a84c;padding:40px;">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#fff;">
          {body_html}
          {coupon_block}
          {button_block}
        </div>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#1a1a1a;padding:24px;text-align:center;">
        <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#888;margin:0 0 8px;">
          No longer want to receive these emails?&nbsp;
          <a href="{{% unsubscribe_link %}}" style="color:#c9a84c;text-decoration:underline;">Unsubscribe</a>
        </p>
        <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#888;margin:0;">
          {{{{ organization.name }}}} {{{{ organization.full_address }}}}
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
<!-- TRACKING_PIXEL_BOTTOM -->
</body>
</html>"""


emails = [
    {
        "message_id": "WaA9tF",
        "template_id": "XX22Ya",
        "subject": "Welcome to the Sock Academy \U0001f9e6",
        "preview_text": "The world's first sock authority — plus 10% off.",
        "name": "SockAcademy Welcome Email",
        "html": email_html(
            title="Welcome to SockAcademy",
            body_lines=[
                "Hi {{ first_name|default:\"there\" }},",
                "Welcome to <strong>SockAcademy</strong> — the world's first sock authority.",
                "Use the code below for <strong>10% off your first order</strong>. Valid for 7 days.",
            ],
            coupon="WELCOME10",
            button_text="Shop Now",
            button_url="https://sockacademy.store",
        ),
    },
    {
        "message_id": "UUy4er",
        "template_id": "WGXVJU",
        "subject": 'Why "just socks" is the biggest lie in fashion',
        "preview_text": "The right sock changes everything.",
        "name": "SockAcademy - Why Socks Matter",
        "html": email_html(
            title="Why socks matter",
            body_lines=[
                "Hi {{ first_name|default:\"there\" }},",
                'Everyone says socks are an afterthought. <strong>We disagree.</strong>',
                "The right sock changes your stride, your style, and your day.",
                "That's why we built SockAcademy — to give socks the respect they deserve.",
                "— The SockAcademy Team",
            ],
            button_text="Explore the Collection",
            button_url="https://sockacademy.store",
        ),
    },
    {
        "message_id": "YvpPfp",
        "template_id": "Sv787j",
        "subject": "Your 10% expires soon ⏰",
        "preview_text": "48 hours left to use WELCOME10.",
        "name": "SockAcademy - Discount Expiring",
        "html": email_html(
            title="Your discount expires soon",
            body_lines=[
                "Hi {{ first_name|default:\"there\" }},",
                "Your welcome discount expires in <strong>48 hours</strong>.",
                "Use code <strong>WELCOME10</strong> at checkout for 10% off.",
                "Don't miss it.",
                "— The SockAcademy Team",
            ],
            button_text="Shop Before It Expires",
            button_url="https://sockacademy.store",
        ),
    },
]


def update_flow_message(message_id, subject, preview_text, name):
    url = f"{BASE_URL}/flow-messages/{message_id}/"
    payload = {
        "data": {
            "type": "flow-message",
            "id": message_id,
            "attributes": {
                "name": name,
                "content": {
                    "subject": subject,
                    "preview_text": preview_text,
                    "from_email": "hello@sockacademy.store",
                    "from_label": "SockAcademy",
                    "reply_to_email": "hello@sockacademy.store",
                },
            },
        }
    }
    r = requests.patch(url, headers=HEADERS, json=payload)
    return r.status_code, r.text


def update_template(template_id, html):
    url = f"{BASE_URL}/templates/{template_id}/"
    payload = {
        "data": {
            "type": "template",
            "id": template_id,
            "attributes": {"html": html},
        }
    }
    r = requests.patch(url, headers=HEADERS, json=payload)
    return r.status_code, r.text


for i, email in enumerate(emails, 1):
    print(f"\n=== Email {i} ===")

    status, resp = update_flow_message(
        email["message_id"], email["subject"], email["preview_text"], email["name"]
    )
    print(f"  flow-message update: {status}")
    if status not in (200, 204):
        print(f"  ERROR: {resp[:300]}")

    status, resp = update_template(email["template_id"], email["html"])
    print(f"  template update: {status}")
    if status not in (200, 204):
        print(f"  ERROR: {resp[:300]}")

print("\nDone!")
