from flask import Flask, request, jsonify
import requests
import re
import json

app = Flask(__name__)

def get_view_count(youtube_url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(youtube_url, headers=headers, timeout=10)
        if response.status_code != 200:
            return {"error": f"Sayfa yüklenemedi: {response.status_code}"}

        html = response.text

        match = re.search(r'ytInitialPlayerResponse\s*=\s*({.+?});', html)
        if not match:
            return {"error": "Veri bulunamadı."}

        data = json.loads(match.group(1))
        view_count = data['videoDetails']['viewCount']
        return {"url": youtube_url, "views": int(view_count)}

    except Exception as e:
        return {"error": str(e)}

@app.route("/api/views", methods=["GET"])
def get_views_api():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "URL parametresi eksik"}), 400

    result = get_view_count(url)
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
