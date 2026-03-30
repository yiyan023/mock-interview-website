
from app import app 

@app.route('/create-payout', methods=['POST'])
def create_payout():
    data = request.get_json()
    amount = data.get('amount')
    currency = data.get('currency', 'cad') 

    try:
        payout = stripe.Payout.create(
            amount=amount,
            currency=currency,
        )
        return jsonify({"status": "Payout initiated", "payout_id": payout.id})
    except stripe.error.StripeError as e:
        return jsonify({"error": str(e)}), 400
