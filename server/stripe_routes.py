import json
import os

import stripe
from flask import request, jsonify


def register_stripe_routes(app):
    @app.route('/api/stripe/create-checkout-session', methods=['POST'])
    def create_checkout_session():
        data = request.get_json(silent=True) or {}
        price_id = os.getenv('STRIPE_PRICE_ID')

        if not price_id:
            return jsonify({'error': 'STRIPE_PRICE_ID is not configured on the server.'}), 500

        form = data.get('form')
        assert form is not None, 'Form data does not exists, error'

        form_json = json.dumps(form) 

        try:
            session = stripe.checkout.Session.create(
                ui_mode='embedded_page',
                mode='payment',
                redirect_on_completion='never',
                line_items=[{'price': price_id, 'quantity': 1}],
                metadata={
                    'selected_time_iso': str(data.get('selectedTimeIso', ''))[:500],
                    'timezone': str(data.get('timezone', ''))[:500],
                    'form': form_json,
                },
            )

            if not session.client_secret:
                return jsonify({'error': 'Checkout Session has no client_secret.'}), 500
            
            return jsonify({'clientSecret': session.client_secret}), 200
        
        except stripe.error.StripeError as e:
            print(f'[Stripe Error] create-checkout-session failed: {e.user_message} : {e.code} :{e.http_status}')
            return jsonify({'error': e.user_message, 'code': e.code}), e.http_status

# @app.route('/webhook/stripe', methods=['POST'])
# def stripe_webhook():
#     payload = request.get_data()
#     sig_header = request.headers.get('Stripe-Signature')

#     try:
#         event = stripe.Webhook.construct_event(
#             payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
#         )
#     except (ValueError, stripe.error.SignatureVerificationError):
#         return '', 400

#     if event['type'] == 'checkout.session.completed':
#         session = event['data']['object']
#         customer_email = session['customer_details']['email']
#         # mark user as paid in your database

#     return '', 200