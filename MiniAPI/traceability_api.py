from flask import Blueprint, request, jsonify
import json
import time

traceability_api = Blueprint('traceability_api', __name__)

TRACES_DB = "data/trace_records.json"
LABS_DB = "data/lab_results.json"
DOCUMENTS_DB = "data/uploaded_docs.json"

def _load_json(filename):
    try:
        with open(filename) as f:
            return json.load(f)
    except Exception:
        return []

def _save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f)

@traceability_api.route("/traceability/traces", methods=["GET"])
def get_all_traces():
    # Returns all trace records (chain of custody, sample, etc)
    records = _load_json(TRACES_DB)
    return jsonify(records)

@traceability_api.route("/traceability/trace/<string:trace_id>", methods=["GET"])
def get_trace(trace_id):
    records = _load_json(TRACES_DB)
    for r in records:
        if r["traceId"] == trace_id:
            return jsonify(r)
    return jsonify({"error": "Trace not found"}), 404

@traceability_api.route("/traceability/trace", methods=["POST"])
def create_trace():
    data = request.json
    records = _load_json(TRACES_DB)
    data["traceId"] = "TRC-" + str(int(time.time()))
    data["createdAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    records.append(data)
    _save_json(TRACES_DB, records)
    return jsonify({"status": "OK", "traceId": data["traceId"]}), 201

@traceability_api.route("/traceability/chain/<string:trace_id>", methods=["GET"])
def get_chain(trace_id):
    records = _load_json(TRACES_DB)
    for r in records:
        if r["traceId"] == trace_id:
            return jsonify(r.get("events", []))
    return jsonify([])

@traceability_api.route("/traceability/upload-docs", methods=["POST"])
def upload_doc():
    data = request.json
    docs = _load_json(DOCUMENTS_DB)
    data["uploadedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    docs.append(data)
    _save_json(DOCUMENTS_DB, docs)
    return jsonify({"status": "OK"})

@traceability_api.route("/traceability/lab-results/<string:trace_id>", methods=["GET"])
def get_lab_results(trace_id):
    labs = _load_json(LABS_DB)
    results = [l for l in labs if l["traceId"] == trace_id]
    return jsonify(results)

@traceability_api.route("/traceability/lab-results", methods=["POST"])
def upload_lab_results():
    # AI processed lab data, connect with ML pipeline if needed
    data = request.json
    labs = _load_json(LABS_DB)
    data["uploadedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    labs.append(data)
    _save_json(LABS_DB, labs)
    return jsonify({"status": "OK"})