import html
import json
import os
import re
import urllib.error
import urllib.request
import resend

from flask import jsonify, request

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def register_email_routes(app):
    @app.route('/api/email/booking-summary', methods=['POST'])
    def booking_summary_email():
        api_key = os.getenv('RESEND_API_KEY')
        from_addr = os.getenv('RESEND_FROM')
        if not api_key or not from_addr:
            return jsonify({
                'error': 'Email is not configured (set RESEND_API_KEY and RESEND_FROM on the server).',
            }), 500

        data = request.get_json(silent=True)
        assert data is not None, 'Data does not exists, error'
        form = data.get('form')
        assert form is not None, 'Form data does not exists, error'
        
        to_email = form.get('email').strip()

        if not to_email or not _EMAIL_RE.match(to_email):
            return jsonify({'error': 'A valid email is required in your booking details.'}), 400

        selected_iso = str(data.get('selectedTimeIso') or '')
        timezone = str(data.get('timezone') or '')

        fn = html.escape(str(form.get('firstName') or ''))
        ln = html.escape(str(form.get('lastName') or ''))
        co = html.escape(str(form.get('company') or ''))
        notes = html.escape(str(form.get('notes') or ''))
        referral = html.escape(str(form.get('referral') or ''))
        has_iv = html.escape(str(form.get('hasInterviewSoon') or ''))
        exp = html.escape(str(form.get('experienceLevel') or ''))
        qtype = html.escape(str(form.get('questionType') or ''))

        safe_to = html.escape(to_email)
        safe_when = html.escape(f'{selected_iso} ({timezone})' if timezone else selected_iso)

        notify_bcc = os.getenv('RESEND_NOTIFY_TO', '').strip()
        to_list = [to_email, "yiyanhuang0523@gmail.com"]

        subject = 'Your mock interview session details'
        html_body = f"""\
<!DOCTYPE html>
<html><body>
<h2>Booking summary</h2>
<p>Hi {fn} {ln},</p>
<p>Here is a summary of the session you are scheduling.</p>
<ul>
  <li><strong>Selected time (ISO):</strong> {safe_when}</li>
  <li><strong>Email:</strong> {safe_to}</li>
  <li><strong>Interview soon:</strong> {has_iv}</li>
  <li><strong>Company:</strong> {co or '—'}</li>
  <li><strong>Experience:</strong> {exp or '—'}</li>
  <li><strong>Question type:</strong> {qtype or '—'}</li>
  <li><strong>Notes:</strong> {notes or '—'}</li>
  <li><strong>Referral:</strong> {referral or '—'}</li>
</ul>
<p>Complete payment in the checkout window when you are ready.</p>
</body></html>"""

        resend.api_key = api_key

        try:
            r = resend.Emails.send({
                "from": from_addr,
                "to": to_email, # find a way to send to multiple emails
                "subject": subject,
                "html": html_body
            })
            return jsonify({'id': r.id})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
