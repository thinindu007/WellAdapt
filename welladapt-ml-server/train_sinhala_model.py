import pandas as pd
import numpy as np
import tensorflow as tf
import re
import pickle
import matplotlib.pyplot as plt
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.layers import Input, Embedding, LSTM, Bidirectional, Dense, Dropout, Layer, Conv1D, MaxPooling1D
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils import resample

# --- 0. GPU Memory Growth ---
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print("GPU Ready for Sinhala Training.")
    except RuntimeError as e: print(e)

# --- 1. Load and Map Dataset ---
print("Loading Sinhala dataset...")
df = pd.read_csv('datasets/sinhala_emotions.csv')

# Mapping: Same as English
label_map = {0: 'Depression', 1: 'Positive', 2: 'Positive', 3: 'Stress', 4: 'Anxiety', 5: 'Stress'}
df['mapped_label'] = df['mapped_label'] = df['label'].map(label_map)
df = df.dropna(subset=['mapped_label'])

# --- 2. Advanced Sinhala Preprocessing ---

def clean_sinhala_text(text):
    text = str(text).lower()
    # 1. Remove URLs and Mentions
    text = re.sub(r'http\S+|www\S+|https\S+|\@\w+|\#','', text)
    # 2. REMOVE ENGLISH TEXT (a-z) and numbers
    # This specifically removes those 'id' tags and other English garbage
    text = re.sub(r'[a-zA-Z0-9]', '', text)
    # 3. Keep ONLY Sinhala Unicode range (0D80–0DFF) and spaces
    text = re.sub(r'[^\u0D80-\u0DFF\s]', '', text)
    # 4. Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def handle_si_negations(text):
    """
    In Sinhala, negation follows the word: "සතුටක් නැහැ"
    This joins them: "සතුටක්_නැහැ" so the model sees it as one concept.
    """
    negation_markers = ['නැහැ', 'නැත', 'නොවේ', 'එපා', 'නැති', 'නෑ']
    words = text.split()
    result = []
    i = 0
    while i < len(words):
        # Check if the current word is a negation and there is a word before it
        if i > 0 and words[i] in negation_markers:
            prev_word = result.pop()
            result.append(prev_word + '_' + words[i])
        else:
            result.append(words[i])
        i += 1
    return ' '.join(result)

print("Cleaning text and handling negations...")
df['text_sinhala'] = df['text_sinhala'].apply(clean_sinhala_text).apply(handle_si_negations)

# --- 3. Selective Oversampling & Balancing ---

# Boost negations for negative classes to improve intelligence
si_negation_keywords = ['නැහැ', 'නැත', 'නොවේ', 'එපා', 'නැති']
mask = (df['text_sinhala'].str.contains('_', na=False)) & \
       (df['mapped_label'].isin(['Depression', 'Anxiety', 'Stress']))

hard_examples = df[mask]
print(f"Oversampling {len(hard_examples)} Sinhala negation rows...")
df = pd.concat([df, hard_examples, hard_examples], ignore_index=True)

# Balancing classes
min_class = df['mapped_label'].value_counts().min()
max_positive = int(min_class * 1.5)

balanced_df = pd.DataFrame()
for label in df['mapped_label'].unique():
    sub = df[df['mapped_label'] == label]
    n = max_positive if label == 'Positive' else min_class
    balanced_df = pd.concat([balanced_df, resample(sub, n_samples=min(len(sub), n), random_state=42)])

df = balanced_df.sample(frac=1).reset_index(drop=True)

# --- 4. Tokenization ---
max_words = 20000 
max_len = 100

tokenizer = Tokenizer(num_words=max_words)
tokenizer.fit_on_texts(df['text_sinhala'].values)
X = pad_sequences(tokenizer.texts_to_sequences(df['text_sinhala'].values), maxlen=max_len)

le = LabelEncoder()
y = tf.keras.utils.to_categorical(le.fit_transform(df['mapped_label']))

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

# --- 5. Hybrid Architecture (CNN + Bi-LSTM + Attention) ---

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

def build_model():
    inputs = Input(shape=(max_len,))
    x = Embedding(max_words, 128)(inputs)
    
    # CNN Pattern Detector (Critical for phrase pairs like 'සතුටක්_නැහැ')
    x = Conv1D(filters=64, kernel_size=3, padding='same', activation='relu')(x)
    x = MaxPooling1D(pool_size=2)(x)
    
    x = Bidirectional(LSTM(128, return_sequences=True))(x)
    x = Dropout(0.3)(x)
    x = Bidirectional(LSTM(64, return_sequences=True))(x)
    
    x = AttentionLayer()(x)
    
    x = Dense(64, activation='relu')(x)
    x = Dropout(0.5)(x)
    outputs = Dense(len(le.classes_), activation='softmax')(x)
    
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(0.0005), loss='categorical_crossentropy', metrics=['accuracy'])
    return model

model = build_model()

# --- 6. Training ---
callbacks = [
    EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True),
    ModelCheckpoint('best_sinhala_model.h5', monitor='val_accuracy', save_best_only=True)
]

print("Starting Sinhala Hybrid Training...")
history = model.fit(X_train, y_train, epochs=15, batch_size=128, validation_split=0.1, callbacks=callbacks)

# --- 7. Save ---
model.save('sinhala_emotion_model.h5')
with open('tokenizer_si.pkl', 'wb') as f:
    pickle.dump(tokenizer, f)
with open('label_encoder_si.pkl', 'wb') as f:
    pickle.dump(le, f)
print("Sinhala Model Assets Saved Successfully.")