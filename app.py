import os
import logging
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables (override existing to always pick up .env changes)
load_dotenv(override=True)

# Model config
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Try to import Groq SDK
try:
    from groq import Groq
    SDK_AVAILABLE = True
    logger.info("Groq SDK is available.")
except ImportError:
    SDK_AVAILABLE = False
    logger.warning("Groq SDK not found. Will use HTTP requests fallback.")

def convert_history(chat_history):
    """
    Converts frontend history format to Groq/OpenAI messages format.
    Frontend format: [{"role": "user"/"model", "text": "..."}]
    Groq format:     [{"role": "user"/"assistant", "content": "..."}]
    """
    messages = []
    for msg in chat_history:
        role = "user" if msg.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": msg.get("text", "")})
    return messages

def call_groq_sdk(api_key, message, chat_history=None):
    """
    Calls Groq API using the official groq Python SDK.
    """
    client = Groq(api_key=api_key)
    
    messages = convert_history(chat_history or [])
    messages.append({"role": "user", "content": message})
    
    logger.info(f"Sending request to Groq SDK with model: {GROQ_MODEL}")
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=4096,
    )
    return completion.choices[0].message.content

def call_groq_requests(api_key, message, chat_history=None):
    """
    Fallback: Calls Groq API directly via HTTP requests (OpenAI-compatible endpoint).
    """
    import requests as req
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    messages = convert_history(chat_history or [])
    messages.append({"role": "user", "content": message})
    
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096,
    }
    
    logger.info(f"Sending request to Groq HTTP API with model: {GROQ_MODEL}")
    response = req.post(url, json=payload, headers=headers, timeout=30)
    
    if response.status_code != 200:
        logger.error(f"Groq API request failed: {response.text}")
        try:
            error_msg = response.json().get("error", {}).get("message", "Unknown API error")
        except Exception:
            error_msg = response.text
        raise Exception(f"Groq API Error: {error_msg}")
    
    return response.json()["choices"][0]["message"]["content"]

@app.route("/")
def index():
    """Serves the main application page."""
    return render_template("index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Chat endpoint: receives message + history, returns AI response from Groq.
    """
    data = request.get_json() or {}
    message = data.get("message")
    chat_history = data.get("history", [])
    
    if not message:
        return jsonify({"error": "Message is required"}), 400
    
    # Get API key: 1) from request header (client override), 2) from server .env
    api_key = request.headers.get("X-Groq-API-Key") or os.environ.get("GROQ_API_KEY")
    
    if not api_key:
        return jsonify({
            "error": "Groq API Key chưa được cấu hình. Vui lòng thiết lập GROQ_API_KEY trong file .env hoặc qua phần Cài đặt trên giao diện."
        }), 400
    
    try:
        if SDK_AVAILABLE:
            try:
                reply = call_groq_sdk(api_key, message, chat_history)
            except Exception as sdk_err:
                logger.warning(f"SDK call failed: {sdk_err}. Using HTTP fallback...")
                reply = call_groq_requests(api_key, message, chat_history)
        else:
            reply = call_groq_requests(api_key, message, chat_history)
        
        return jsonify({"response": reply})
    
    except Exception as e:
        logger.error(f"Chat execution failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/check_key", methods=["POST"])
def check_key():
    """
    Validates a Groq API Key by sending a minimal test request.
    """
    data = request.get_json() or {}
    api_key = data.get("api_key") or os.environ.get("GROQ_API_KEY")
    
    if not api_key:
        return jsonify({"valid": False, "error": "Không có API key nào được cấu hình"}), 400
    
    try:
        import requests as req
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 5,
        }
        response = req.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return jsonify({"valid": True})
        else:
            try:
                error_msg = response.json().get("error", {}).get("message", "API Key không hợp lệ")
            except Exception:
                error_msg = f"HTTP {response.status_code}"
            return jsonify({"valid": False, "error": error_msg})
    
    except Exception as e:
        return jsonify({"valid": False, "error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
