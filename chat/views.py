import os
import json
import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv

# Load env variables
load_dotenv(override=True)

logger = logging.getLogger(__name__)

# Try to import AI SDKs
try:
    import google.generativeai as genai
    GEMINI_SDK_AVAILABLE = True
except ImportError:
    GEMINI_SDK_AVAILABLE = False

try:
    from groq import Groq
    GROQ_SDK_AVAILABLE = True
except ImportError:
    GROQ_SDK_AVAILABLE = False

# Default models
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

def index(request):
    """Renders the main chat page."""
    return render(request, "index.html")

def convert_to_groq_history(chat_history):
    """
    Converts frontend history format to Groq/OpenAI messages format.
    """
    messages = []
    for msg in chat_history:
        role = "user" if msg.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": msg.get("text", "")})
    return messages

def call_groq(api_key, message, chat_history=None):
    """Calls Groq API using SDK or HTTP fallback."""
    if GROQ_SDK_AVAILABLE:
        try:
            client = Groq(api_key=api_key)
            messages = convert_to_groq_history(chat_history or [])
            messages.append({"role": "user", "content": message})
            
            logger.info(f"Sending request to Groq SDK with model: {GROQ_MODEL}")
            completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=4096,
            )
            return completion.choices[0].message.content
        except Exception as sdk_err:
            logger.warning(f"Groq SDK call failed: {sdk_err}. Using HTTP fallback...")
            
    # Fallback to requests
    import requests as req
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    messages = convert_to_groq_history(chat_history or [])
    messages.append({"role": "user", "content": message})
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096,
    }
    response = req.post(url, json=payload, headers=headers, timeout=30)
    if response.status_code != 200:
        try:
            error_msg = response.json().get("error", {}).get("message", "Unknown Groq API error")
        except Exception:
            error_msg = response.text
        raise Exception(f"Groq API Error: {error_msg}")
    return response.json()["choices"][0]["message"]["content"]

def call_gemini(api_key, message, chat_history=None):
    """Calls Gemini API using google-generativeai SDK."""
    if not GEMINI_SDK_AVAILABLE:
        raise Exception("Google Generative AI SDK is not installed on this system.")
    
    genai.configure(api_key=api_key)
    
    # Convert history to Gemini format:
    # [{"role": "user" or "model", "parts": [{"text": "..."}]}]
    gemini_history = []
    if chat_history:
        for msg in chat_history:
            role = "user" if msg.get("role") == "user" else "model"
            # google-generativeai library expects structure with parts containing texts
            gemini_history.append({
                "role": role,
                "parts": [msg.get("text", "")]
            })
            
    logger.info(f"Sending request to Gemini API with model: {GEMINI_MODEL}")
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    # Start chat with history
    chat = model.start_chat(history=gemini_history)
    response = chat.send_message(message)
    return response.text

@csrf_exempt
def chat_api(request):
    """
    POST /api/chat
    Receives user message and chat history, returns AI response.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)
        
    try:
        data = json.loads(request.body)
    except Exception:
        data = {}
        
    message = data.get("message")
    chat_history = data.get("history", [])
    
    if not message:
        return JsonResponse({"error": "Message is required"}, status=400)
        
    # Get custom API key from header, or fallback to .env config
    api_key = request.headers.get("X-Groq-API-Key") or request.headers.get("X-Gemini-API-Key")
    
    # If no key in header, check localStorage name in header or env
    if not api_key:
        # Check env keys
        gemini_key = os.environ.get("GEMINI_API_KEY")
        groq_key = os.environ.get("GROQ_API_KEY")
        
        # Decide which default key to use
        if gemini_key:
            api_key = gemini_key
        elif groq_key:
            api_key = groq_key
            
    if not api_key:
        return JsonResponse({
            "error": "API Key chưa được cấu hình. Vui lòng thiết lập trong file .env hoặc nhập qua phần Cài đặt."
        }, status=400)
        
    # Detect provider based on key prefix
    is_gemini = api_key.startswith("AIzaSy")
    
    try:
        if is_gemini:
            reply = call_gemini(api_key, message, chat_history)
        else:
            reply = call_groq(api_key, message, chat_history)
        return JsonResponse({"response": reply})
    except Exception as e:
        logger.error(f"Chat API execution failed: {e}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def check_key_api(request):
    """
    POST /api/check_key
    Validates the provided API key (either Gemini or Groq).
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)
        
    try:
        data = json.loads(request.body)
    except Exception:
        data = {}
        
    api_key = data.get("api_key")
    
    # Fallback to env if empty
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GROQ_API_KEY")
        
    if not api_key:
        return JsonResponse({"valid": False, "error": "Không có API key nào được cấu hình"}, status=400)
        
    is_gemini = api_key.startswith("AIzaSy")
    
    try:
        if is_gemini:
            if not GEMINI_SDK_AVAILABLE:
                return JsonResponse({"valid": False, "error": "Google Generative AI SDK chưa được cài đặt."})
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(GEMINI_MODEL)
            # Send a simple test query
            response = model.generate_content("Hi", generation_config={"max_output_tokens": 5})
            if response.text:
                return JsonResponse({"valid": True})
            else:
                return JsonResponse({"valid": False, "error": "Không nhận được phản hồi từ Gemini API"})
        else:
            # Check Groq Key via minimal request
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
                return JsonResponse({"valid": True})
            else:
                try:
                    error_msg = response.json().get("error", {}).get("message", "API Key không hợp lệ")
                except Exception:
                    error_msg = f"HTTP {response.status_code}"
                return JsonResponse({"valid": False, "error": error_msg})
                
    except Exception as e:
        return JsonResponse({"valid": False, "error": str(e)}, status=500)
