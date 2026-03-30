import os
import re
import pickle
import numpy as np
import tensorflow as tf
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.layers import Layer

# --- 0. Initialize Environment & GPU ---
load_dotenv()

# Prevent TensorFlow from consuming all GPU VRAM at once
# This allows your Node.js and LLaMA 3 to share the 4GB RTX 3050 Ti
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print("✅ GPU Memory Growth Enabled")
    except RuntimeError as e:
        print(f"⚠️ GPU Config Error: {e}")

app = FastAPI(title="WellAdapt ML API - Final Production Version")

# --- 1. Custom Attention Layer ---
# This must exist to load models trained with the custom 'AttentionLayer'
class AttentionLayer(Layer):
    def __init__(self, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)

    def build(self, input_shape):
        self.W = self.add_weight(name="att_weight", shape=(input_shape[-1], 1), initializer="normal")
        self.b = self.add_weight(name="att_bias", shape=(input_shape[1], 1), initializer="zeros")
        super(AttentionLayer, self).build(input_shape)

    def call(self, x):
        e = tf.keras.backend.tanh(tf.keras.backend.dot(x, self.W) + self.b)
        a = tf.keras.backend.softmax(e, axis=1)
        output = x * a
        return tf.keras.backend.sum(output, axis=1)

# --- 2. Load Wellness Assets ---
print("🚀 Loading English & Sinhala Models into VRAM...")

try:
    # English Assets
    en_model = tf.keras.models.load_model('best_english_model.h5', custom_objects={'AttentionLayer': AttentionLayer})
    with open('tokenizer_en.pkl', 'rb') as f: en_tokenizer = pickle.load(f)
    with open('label_encoder_en.pkl', 'rb') as f: en_le = pickle.load(f)

    # Sinhala Assets
    si_model = tf.keras.models.load_model('best_sinhala_model.h5', custom_objects={'AttentionLayer': AttentionLayer})
    with open('tokenizer_si.pkl', 'rb') as f: si_tokenizer = pickle.load(f)
    with open('label_encoder_si.pkl', 'rb') as f: si_le = pickle.load(f)
    
    print("✅ All Models Loaded Successfully.")
except Exception as e:
    print(f"❌ Error Loading Assets: {e}")

# --- 3. Preprocessing Functions (Logic-Matched to Training) ---

def preprocess_english(text):
    # Cleaning Phase
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+|\@\w+|\#', '', text)
    
    # Normalize Contractions (Ensures 'don't' becomes 'dont' for the negation handler)
    contractions = {
        "don't": "dont", "can't": "cant", "won't": "wont",
        "wasn't": "wasnt", "haven't": "havent", "isn't": "isnt",
        "doesn't": "doesnt", "didn't": "didnt", "couldn't": "couldnt",
        "wouldn't": "wouldnt", "shouldn't": "shouldnt", "i'm": "im",
        "i've": "ive", "i'll": "ill", "i'd": "id"
    }
    for c, r in contractions.items():
        text = text.replace(c, r)
    
    text = re.sub(r"[^a-z\s]", '', text).strip()
    
    # Negation Handling Phase (Underscore joining)
    negation_set = {'not', 'no', 'never', 'nothing', 'dont', 'cant', 'wont', 'wasnt', 'havent'}
    words = text.split()
    result = []
    i = 0
    while i < len(words):
        if words[i] in negation_set and i + 1 < len(words):
            result.append(f"{words[i]}_{words[i+1]}")
            i += 2
        else:
            result.append(words[i])
            i += 1
    return ' '.join(result)

def preprocess_sinhala(text):
    # Cleaning Phase (Remove English tags like 'id' and numbers)
    text = str(text)
    text = re.sub(r'[a-zA-Z0-9]', '', text)
    text = re.sub(r'[^\u0D80-\u0DFF\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Negation Handling Phase (Join adjective with negation marker)
    neg_markers = ['නැහැ', 'නැත', 'නොවේ', 'එපා', 'නැති', 'නෑ']
    words = text.split()
    result = []
    i = 0
    while i < len(words):
        if i > 0 and words[i] in neg_markers:
            prev_word = result.pop()
            result.append(f"{prev_word}_{words[i]}")
        else:
            result.append(words[i])
        i += 1
    return ' '.join(result)

# --- 4. API Definition ---

class ChatRequest(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {"status": "WellAdapt ML Server is Online"}

@app.post("/predict/english")
async def predict_english(request: ChatRequest):
    try:
        processed = preprocess_english(request.text)
        seq = en_tokenizer.texts_to_sequences([processed])
        padded = pad_sequences(seq, maxlen=100)
        
        pred = en_model.predict(padded, verbose=0)
        idx = np.argmax(pred)
        return {"emotion": en_le.inverse_transform([idx])[0], "confidence": float(pred[0][idx])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/sinhala")
async def predict_sinhala(request: ChatRequest):
    try:
        processed = preprocess_sinhala(request.text)
        seq = si_tokenizer.texts_to_sequences([processed])
        padded = pad_sequences(seq, maxlen=100)
        
        pred = si_model.predict(padded, verbose=0)
        idx = np.argmax(pred)
        return {"emotion": si_le.inverse_transform([idx])[0], "confidence": float(pred[0][idx])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Use .env values with safe defaults
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)