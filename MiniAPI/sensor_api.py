from flask import Blueprint, request, jsonify
import json
import time

sensor_api = Blueprint('sensor_api', __name__)

SENSORS_DB = "data/iot_sensors.json"

def _load_json(filename):
    try:
        with open(filename) as f:
            return json.load(f)
    except Exception:
        return []

def _save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f)

@sensor_api.route("/sensor/all", methods=["GET"])
def get_all_sensors():
    """Return all registered sensors and recent data."""
    sensors = _load_json(SENSORS_DB)
    return jsonify(sensors)

@sensor_api.route("/sensor/push", methods=["POST"])
def push_sensor_data():
    # Post new sensor data, supports IoT/Telemetry
    data = request.json
    sensors = _load_json(SENSORS_DB)
    data["receivedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    sensors.append(data)
    _save_json(SENSORS_DB, sensors)
    return jsonify({"status": "OK"})

@sensor_api.route("/sensor/{sensor_id}", methods=["GET"])
def get_sensor(sensor_id):
    sensors = _load_json(SENSORS_DB)
    for s in sensors:
        if s.get("sensorId") == sensor_id:
            return jsonify(s)
    return jsonify({"error": "Sensor not found"}), 404