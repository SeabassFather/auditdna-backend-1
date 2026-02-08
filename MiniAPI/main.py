from flask import Flask
from produce_api import produce_api
from marketplace_api import marketplace_api
from traceability_api import traceability_api
from sensor_api import sensor_api

app = Flask(__name__)
app.register_blueprint(produce_api, url_prefix='/api')
app.register_blueprint(marketplace_api, url_prefix='/api')
app.register_blueprint(traceability_api, url_prefix='/api')
app.register_blueprint(sensor_api, url_prefix='/api')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)