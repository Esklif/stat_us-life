import requests
import sys
import argparse

TOKEN = "8279658211:AAFy-9qiuI93fhWO1U25hhlM88MESIO5zqE"
CHAT_ID = "@neuro_slop_ai"

def publish(text, apk_path):
    url = f"https://api.telegram.org/bot{TOKEN}/sendDocument"
    
    try:
        with open(apk_path, "rb") as f:
            files = {"document": f}
            data = {
                "chat_id": CHAT_ID,
                "caption": text,
                "parse_mode": "Markdown"
            }
            print(f"Publishing to {CHAT_ID}...")
            response = requests.post(url, data=data, files=files)
            
            if response.status_code == 200:
                print("Successfully published!")
            else:
                print("Error publishing:", response.status_code, response.text)
    except Exception as e:
        print("Exception:", str(e))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apk", required=True, help="Path to APK file")
    parser.add_argument("--text", required=True, help="Text message")
    args = parser.parse_args()
    
    # Read text from file if it is a path to a txt file, otherwise use the string
    text = args.text
    if text.endswith(".txt"):
        with open(text, "r", encoding="utf-8") as f:
            text = f.read()
            
    publish(text, args.apk)
