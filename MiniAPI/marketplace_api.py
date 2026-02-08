from flask import Blueprint, request, jsonify
import json
import time

marketplace_api = Blueprint('marketplace_api', __name__)
OFFERS_DB = "data/marketplace_offers.json"
DEMANDS_DB = "data/marketplace_demands.json"

def _load_json(filename):
    try:
        with open(filename) as f:
            return json.load(f)
    except Exception:
        return []

def _save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f)

@marketplace_api.route('/agmarketplace/offers', methods=['GET'])
def get_offers():
    offers = _load_json(OFFERS_DB)
    commodity = request.args.get('commodity')
    region = request.args.get('region')
    if commodity:
        offers = [o for o in offers if o.get('commodity', '').lower() == commodity.lower()]
    if region:
        offers = [o for o in offers if o.get('region', '').lower() == region.lower()]
    return jsonify(offers)

@marketplace_api.route('/agmarketplace/demands', methods=['GET'])
def get_demands():
    demands = _load_json(DEMANDS_DB)
    commodity = request.args.get('commodity')
    region = request.args.get('region')
    if commodity:
        demands = [d for d in demands if d.get('commodity', '').lower() == commodity.lower()]
    if region:
        demands = [d for d in demands if d.get('region', '').lower() == region.lower()]
    return jsonify(demands)

@marketplace_api.route('/agmarketplace/offer', methods=['POST'])
def create_offer():
    offer = request.json
    offer['offerId'] = "OFF-" + str(int(time.time()))
    offer['createdAt'] = time.strftime("%Y-%m-%d %H:%M:%S")
    offers = _load_json(OFFERS_DB)
    offers.append(offer)
    _save_json(OFFERS_DB, offers)
    return jsonify({"status": "OK", "offerId": offer['offerId']}), 201

@marketplace_api.route('/agmarketplace/demand', methods=['POST'])
def create_demand():
    demand = request.json
    demand['demandId'] = "DEM-" + str(int(time.time()))
    demand['createdAt'] = time.strftime("%Y-%m-%d %H:%M:%S")
    demands = _load_json(DEMANDS_DB)
    demands.append(demand)
    _save_json(DEMANDS_DB, demands)
    return jsonify({"status": "OK", "demandId": demand['demandId']}), 201

@marketplace_api.route('/agmarketplace/match', methods=['POST'])
def match_offer_demand():
    # Basic logic: match offers to demands by commodity/region/volume/price
    offers = _load_json(OFFERS_DB)
    demands = _load_json(DEMANDS_DB)
    criteria = request.json
    # Example: commodity, region, price_min/max, volume
    matches = []
    for d in demands:
        for o in offers:
            if (d.get('commodity') == o.get('commodity') and
                (not criteria.get('region') or d.get('region') == o.get('region')) and
                (not criteria.get('min_price') or float(o.get('price',0)) >= float(criteria['min_price'])) and
                (not criteria.get('max_price') or float(o.get('price',0)) <= float(criteria['max_price'])) and
                (not criteria.get('volume') or float(o.get('volume',0)) >= float(criteria['volume']))):
                matches.append({'demand': d, 'offer': o})
    return jsonify(matches)