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

# GPU Memory Growth
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print("GPU Ready and Optimized.")
    except RuntimeError as e:
        print(e)

#Load and Map Dataset
print("Loading dataset...")
df = pd.read_csv('datasets/english_emotions.csv')

# Mapping:
label_map = {0: 'Depression', 1: 'Positive', 2: 'Positive', 3: 'Stress', 4: 'Anxiety', 5: 'Stress'}
df['mapped_label'] = df['label'].map(label_map)
df = df.dropna(subset=['mapped_label'])

#Preprocessing & Selective Oversampling

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    text = re.sub(r'\@\w+|\#', '', text)
    # Normalize contractions before stripping apostrophes
    contractions = {
        "don't": "dont", "can't": "cant", "won't": "wont",
        "wasn't": "wasnt", "haven't": "havent", "isn't": "isnt",
        "doesn't": "doesnt", "didn't": "didnt", "couldn't": "couldnt",
        "wouldn't": "wouldnt", "shouldn't": "shouldnt", "i'm": "im",
        "i've": "ive", "i'll": "ill", "i'd": "id"
    }
    for contraction, replacement in contractions.items():
        text = text.replace(contraction, replacement)
    text = re.sub(r"[^a-z\s]", '', text)  # Safely remove all non-alpha
    return text.strip()

def handle_negations(text):
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

print("Applying Cleaning...")
df['text'] = df['text'].apply(clean_text)

negation_keywords = ['not', 'no', 'nothing', 'never', "dont", "cant", "wont", "wasnt"]

print("Performing Selective Oversampling for Wellness Intelligence...")
mask = (df['text'].str.contains('|'.join(negation_keywords), case=False, na=False)) & \
       (df['mapped_label'].isin(['Depression', 'Anxiety', 'Stress']))

hard_examples = df[mask]
print(f"Oversampling {len(hard_examples)} VALID negative-negations...")

# Tripling the valid negations
df = pd.concat([df, hard_examples, hard_examples], ignore_index=True)

# APPLYING NEGATION JOINING
print("Applying negation handling (underscores)...")
df['text'] = df['text'].apply(handle_negations)

# Strict Class Balancing
print("Applying strict class balancing...")
min_class = df['mapped_label'].value_counts().min()
max_positive = int(min_class * 1.5)

balanced_df = pd.DataFrame()
for label in df['mapped_label'].unique():
    class_subgroup = df[df['mapped_label'] == label]
    if label == 'Positive':
        n_samples = min(len(class_subgroup), max_positive)
        class_subgroup = resample(class_subgroup, replace=False, n_samples=n_samples, random_state=42)
    else:
        n_samples = min_class
        replace = len(class_subgroup) < n_samples
        class_subgroup = resample(class_subgroup, replace=replace, n_samples=n_samples, random_state=42)
    balanced_df = pd.concat([balanced_df, class_subgroup])

df = balanced_df.sample(frac=1).reset_index(drop=True)
print(f"Final Class Distribution:\n{df['mapped_label'].value_counts()}\n")

# Tokenization & Model
max_words = 20000
max_len = 100

tokenizer = Tokenizer(num_words=max_words, lower=True)
tokenizer.fit_on_texts(df['text'].values)
X = pad_sequences(tokenizer.texts_to_sequences(df['text'].values), maxlen=max_len)

le = LabelEncoder()
y = tf.keras.utils.to_categorical(le.fit_transform(df['mapped_label']))

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

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
    # CNN Pattern Detector
    x = Conv1D(filters=64, kernel_size=3, padding='same', activation='relu')(x)
    x = MaxPooling1D(pool_size=2)(x)
    # Contextual Memory
    x = Bidirectional(LSTM(128, return_sequences=True))(x)
    x = Dropout(0.3)(x)
    x = Bidirectional(LSTM(64, return_sequences=True))(x)
    # Focused Attention
    x = AttentionLayer()(x)
    x = Dense(64, activation='relu')(x)
    x = Dropout(0.5)(x)
    outputs = Dense(len(le.classes_), activation='softmax')(x)
    
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(0.0005), loss='categorical_crossentropy', metrics=['accuracy'])
    return model

model = build_model()

#5. Training
callbacks = [
    EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True),
    ModelCheckpoint('best_english_model.h5', monitor='val_accuracy', save_best_only=True)
]

print("\nStarting Hybrid CNN-LSTM Training...")
history = model.fit(X_train, y_train, epochs=15, batch_size=128, validation_split=0.1, callbacks=callbacks)

# 6. Save
model.save('english_emotion_model.h5')
with open('tokenizer_en.pkl', 'wb') as f:
    pickle.dump(tokenizer, f)
with open('label_encoder_en.pkl', 'wb') as f:
    pickle.dump(le, f)
print("\nAll Training Assets Saved Successfully.")