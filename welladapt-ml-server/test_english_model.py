import tensorflow as tf
import numpy as np
import pickle
import re
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.layers import Layer

# --- 1. Define Custom Attention Layer (Required for Loading) ---
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

# --- 2. Load the Saved Components ---
print("Loading Hybrid CNN-LSTM model and assets...")
# We use 'best_english_model.h5' as it's the one with the highest validation accuracy
model = tf.keras.models.load_model('best_english_model.h5', custom_objects={'AttentionLayer': AttentionLayer})

with open('tokenizer_en.pkl', 'rb') as f:
    tokenizer = pickle.load(f)

with open('label_encoder_en.pkl', 'rb') as f:
    label_encoder = pickle.load(f)

# --- 3. Preprocessing Functions (MUST MATCH TRAINING EXACTLY) ---

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    text = re.sub(r'\@\w+|\#', '', text)
    
    # Normalize contractions BEFORE stripping non-alpha
    contractions = {
        "don't": "dont", "can't": "cant", "won't": "wont",
        "wasn't": "wasnt", "haven't": "havent", "isn't": "isnt",
        "doesn't": "doesnt", "didn't": "didnt", "couldn't": "couldnt",
        "wouldn't": "wouldnt", "shouldn't": "shouldnt", "i'm": "im",
        "i've": "ive", "i'll": "ill", "i'd": "id"
    }
    for contraction, replacement in contractions.items():
        text = text.replace(contraction, replacement)
    
    text = re.sub(r"[^a-z\s]", '', text)
    return text.strip()

def handle_negations(text):
    """
    Joins negation words with the following word (e.g., 'not happy' -> 'not_happy').
    This ensures the model recognizes the 'flipping' of the emotion.
    """
    negation_set = {
        'not', 'no', 'never', 'nothing', 'nobody', 'nowhere', 'neither',
        'dont', 'cant', 'wont', 'wasnt', 'havent', 'isnt',
        'doesnt', 'didnt', 'couldnt', 'wouldnt', 'shouldnt'
    }
    words = text.split()
    result = []
    i = 0
    while i < len(words):
        if words[i] in negation_set and i + 1 < len(words):
            result.append(words[i] + '_' + words[i + 1])
            i += 2
        else:
            result.append(words[i])
            i += 1
    return ' '.join(result)

# --- 4. Prediction Logic ---

def predict_emotion(sentence):
    # CRISIS DETECTION: Immediate hardcoded safety check
    crisis_keywords = ['kill myself', 'end my life', 'suicide', 'self harm', 'want to die']
    if any(k in sentence.lower() for k in crisis_keywords):
        return "CRISIS ⚠️", 100.0

    # ML PIPELINE
    cleaned = clean_text(sentence)
    negated = handle_negations(cleaned) # This is the crucial step
    
    # Debug print to see what the model actually "reads"
    # print(f"[DEBUG] Preprocessed: {negated}") 

    sequence = tokenizer.texts_to_sequences([negated])
    padded = pad_sequences(sequence, maxlen=100)
    
    prediction = model.predict(padded, verbose=0)
    class_idx = np.argmax(prediction)
    emotion = label_encoder.inverse_transform([class_idx])[0]
    confidence = prediction[0][class_idx] * 100
    
    return emotion, confidence

# --- 5. Interactive Test Loop ---
print("\n--- Hybrid (CNN + Bi-LSTM + Attention) Emotion Test ---")
print("Pre-processing: Negation Joining (e.g., 'not_happy') Enabled")
print("Type 'quit' to exit.")

# Hard test cases to verify negation logic
test_cases = [
    "I feel like I'm not good at anything.",
    "Nothing makes me happy anymore.",
    "I'm so stressed about my final year project!",
    "I am so happy I passed my exams!",
    "I feel so lonely in this hostel, I miss my home deeply."
]

print("\n--- Running Baseline Tests ---")
for tc in test_cases:
    emo, conf = predict_emotion(tc)
    print(f"Input: {tc}\nResult: {emo} ({conf:.2f}%)\n")

while True:
    user_input = input("Enter your own sentence: ")
    if user_input.lower() == 'quit':
        break
    
    emo, conf = predict_emotion(user_input)
    print(f"Detected Emotion: {emo} | Confidence: {conf:.2f}%\n")