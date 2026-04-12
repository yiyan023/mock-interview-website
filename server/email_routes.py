import html
import json
import os
import re
import urllib.error
import urllib.request
import resend

from flask import jsonify, request
from typing import List

from email_templates import BOOKING_SUMMARY_HTML

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

        selected_iso = data.get('selectedTimeIso')
        assert selected_iso is not None, 'Selected time ISO is not provided, error'
        timezone = data.get('timezone')
        assert timezone is not None, 'Timezone is not provided, error'

        first_name = html.escape(form.get('firstName') or '')
        last_name = html.escape(form.get('lastName') or '')
        co = html.escape(form.get('company') or '')
        notes = html.escape(form.get('notes') or '')
        referral = html.escape(form.get('referral') or '')
        has_iv = html.escape(form.get('hasInterviewSoon') or '')
        exp = html.escape(form.get('experienceLevel') or '')
        qtype = html.escape(form.get('questionType') or '')

        safe_to = html.escape(to_email)
        safe_when = html.escape(f'{selected_iso} ({timezone})' if timezone else selected_iso)
        to_list = [to_email, "yiyanhuang0523@gmail.com"]

        subject = f"{first_name} {last_name} | Mock Interview Confirmation"
        
        html_body = BOOKING_SUMMARY_HTML.format(
            fn=first_name,
            ln=last_name,
            safe_when=safe_when,
            safe_to=safe_to,
            has_iv=has_iv,
            co_display=co or '',
            exp_display=exp or '',
            qtype_display=qtype or '',
            notes_display=notes or '',
            referral_display=referral or '',
        )

        resend.api_key = api_key

        params: List[resend.Emails.SendParams] = [
            {
                "from": "Mock Interview Scheduler <onboarding@resend.dev>",
                "to": "y84huang@uwaterloo.ca",
                "subject": "hello world",
                "html": "<h1>it works!</h1>",
            },
            {
                "from": "Mock Interview Scheduler <onboarding@resend.dev>",
                "to": "y84huang@uwaterloo.ca",
                "subject": subject,
                "html": html_body,
            }
        ]

        try:
            r = resend.Batch.send(params)
            return jsonify({'data': r.data}), 200
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500
