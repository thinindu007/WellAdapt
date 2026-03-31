import tensorflow as tf
import numpy as np
import pickle
import re
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.layers import Layer

# Define Custom Attention Layer
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
        return tf.keras.backend.sum(x * a, axis=1)

#Load Assets
print("Loading Sinhala Hybrid Model...")
model = tf.keras.models.load_model('best_sinhala_model.h5', custom_objects={'AttentionLayer': AttentionLayer})

with open('tokenizer_si.pkl', 'rb') as f:
    tokenizer = pickle.load(f)
with open('label_encoder_si.pkl', 'rb') as f:
    label_encoder = pickle.load(f)

#Preprocessing

def clean_si(text):
    text = str(text)
    # Remove URLs/Mentions
    text = re.sub(r'http\S+|www\S+|\@\w+|\#','', text)
    # Remove English characters/numbers and keep Sinhala Unicode
    text = re.sub(r'[a-zA-Z0-9]', '', text)
    text = re.sub(r'[^\u0D80-\u0DFF\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def handle_si_negations(text):
    negation_markers = ['නැහැ', 'නැත', 'නොවේ', 'එපා', 'නැති', 'නෑ']
    words = text.split()
    result = []
    i = 0
    while i < len(words):
        if i > 0 and words[i] in negation_markers:
            prev_word = result.pop()
            result.append(prev_word + '_' + words[i])
        else:
            result.append(words[i])
        i += 1
    return ' '.join(result)

def predict_sinhala_emotion(sentence):
    # ML Pipeline
    cleaned = clean_si(sentence)
    negated = handle_si_negations(cleaned)
    
    # print(f"[DEBUG] Model sees: {negated}")

    sequence = tokenizer.texts_to_sequences([negated])
    padded = pad_sequences(sequence, maxlen=100)
    
    prediction = model.predict(padded, verbose=0)
    class_idx = np.argmax(prediction)
    emotion = label_encoder.inverse_transform([class_idx])[0]
    confidence = prediction[0][class_idx] * 100
    
    return emotion, confidence

#Interactive Test
print("\n--- Sinhala Hybrid Emotion Test ---")
print("Type 'quit' to exit.")

test_cases = [
    "මට අද ගොඩක් සතුටුයි", 
    "මට කිසිම සතුටක් දැනෙන්නේ නැහැ", 
    "විභාගය නිසා මම ලොකු පීඩනයක ඉන්නේ",
    "id මට හරිම තනිකමක් දැනෙනවා",
    "මට ජීවිතය එපා වෙලා තියෙන්නේ",
    "මම මේ දේවල් ගැන ගොඩක් බයයි"
]

print("\n--- Running Baseline Tests ---")
for tc in test_cases:
    emo, conf = predict_sinhala_emotion(tc)
    print(f"Input: {tc}\nResult: {emo} ({conf:.2f}%)\n")

while True:
    user_input = input("Enter Sinhala sentence: ")
    if user_input.lower() == 'quit': break
    emo, conf = predict_sinhala_emotion(user_input)
    print(f"Detected: {emo} | Confidence: {conf:.2f}%\n")