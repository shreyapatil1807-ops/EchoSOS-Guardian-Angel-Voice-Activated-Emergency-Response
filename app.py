from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime

app = Flask(__name__)
CORS(app)

@app.route('/sos', methods=['POST'])
def sos_alert():
    audio_file_present = 'audio' in request.files
    
    latitude = request.form.get('latitude', 'N/A')
    longitude = request.form.get('longitude', 'N/A')
    google_maps_link = request.form.get('googleMapsLink', 'N/A')

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    print("\n--- SOS ALERT RECEIVED ---")
    print(f"Timestamp: {timestamp}")
    print(f"Location: Lat {latitude}, Lon {longitude}")
    print(f"Google Maps Link: {google_maps_link}")
    print(f"Audio file received: {'Yes' if audio_file_present else 'No'}")
    print("--- End of SOS ---")

    return jsonify({
        "message": "SOS alert received by backend!",
        "received_timestamp": timestamp,
        "audio_received": audio_file_present,
        "location": {"latitude": latitude, "longitude": longitude},
        "map_link": google_maps_link
    }), 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)

