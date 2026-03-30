import os
import stripe
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

if __name__ == "__main__":
    app.run(port=3000, debug=True)
