from flask import Blueprint, request, jsonify
import pandas as pd
import json

produce_api = Blueprint('produce_api', __name__)

USDA_PRICES_CSV = "data/usda_prices.csv"

@produce_api.route('/usda/latest_prices', methods=['GET'])
def get_latest_prices():
    # Example: Load from CSV, filter recent, aggregate per commodity
    try:
        df = pd.read_csv(USDA_PRICES_CSV)
    except Exception as e:
        return jsonify({"error": f"File not found or load error: {str(e)}"}), 500

    commodities = request.args.getlist('commodity')
    if commodities:
        df = df[df['commodity_desc'].isin(commodities)]

    # Get latest entry per commodity
    latest_prices = df.sort_values('date', ascending=False).groupby('commodity_desc').first().reset_index()
    return jsonify(latest_prices.to_dict(orient='records'))

@produce_api.route('/usda/trends', methods=['GET'])
def get_price_trends():
    try:
        df = pd.read_csv(USDA_PRICES_CSV)
    except Exception as e:
        return jsonify({"error": f"File not found or load error: {str(e)}"}), 500

    commodity = request.args.get('commodity')
    if commodity:
        df = df[df['commodity_desc'] == commodity]
    trend = df.sort_values('date')[['date', 'price', 'commodity_desc']]
    return jsonify(trend.to_dict(orient='records'))

@produce_api.route('/usda/search', methods=["GET"])
def search_usda_data():
    """Flexible search endpoint for any csv columns and filters."""
    try:
        df = pd.read_csv(USDA_PRICES_CSV)
    except Exception as e:
        return jsonify({"error": f"File not found or load error: {str(e)}"}), 500

    params = request.args
    for k, v in params.items():
        if k not in ["commodity", "start_date", "end_date"]:
            df = df[df[k] == v]
    # Range filtering
    if "start_date" in params:
        df = df[df["date"] >= params["start_date"]]
    if "end_date" in params:
        df = df[df["date"] <= params["end_date"]]
    return jsonify(df.to_dict(orient='records'))