# WellAdapt ML Server

**Deep Learning Emotion Inference Microservice**

This is the Python-based Machine Learning service for the WellAdapt platform. Built with FastAPI, it serves as a high-performance inference engine that classifies the emotional state of English text using a custom-trained deep learning model.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.9+ |
| Framework | FastAPI (asynchronous API) |
| Deep Learning | TensorFlow and Keras |
| Data Processing | Pandas, NumPy, Scikit-Learn |
| NLP Tools | NLTK, Pickle (for tokenizers) |
| Server | Uvicorn (ASGI) |

---

## Model Architecture

The core of this service is a hybrid CNN-LSTM network. This architecture was chosen for its ability to extract local features from text (CNN) while capturing long-term emotional dependencies and context (LSTM).

**CNN Layer** — Identifies key emotional phrases and patterns within a sentence.

**LSTM Layer** — Understands the sequence and flow of the student's message to differentiate between similar moods, such as distinguishing between "tired" and "depressed".

**Bilingual Scope** — This server handles English sentiment analysis exclusively. Sinhala language processing is offloaded to LLaMA 3 via the backend gateway.

---

## Setup and Installation

### Prerequisites

- Python 3.9 or higher
- A virtual environment tool (recommended)

### 1. Virtual Environment Setup

```bash
# Create the virtual environment
python -m venv venv

# Activate on Windows
.\venv\Scripts\activate

# Activate on Mac/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Running the Inference Server

```bash
uvicorn main:app --reload --port 8000
```

Once running, the interactive API documentation (Swagger UI) is available at `http://localhost:8000/docs`.

---

## Large File Management

To keep the repository lightweight, the following binary files are excluded via `.gitignore`. These files must be placed manually in the project root directory before starting the server.

| File | Description |
|---|---|
| `welladapt_model.h5` | Trained CNN-LSTM neural network weights |
| `tokenizer.pkl` | Fitted tokenizer used for text-to-sequence conversion |
| `label_encoder.pkl` | Encoder used to map numerical predictions back to emotion labels |

---

## API Reference

### POST `/predict/english`

Receives a JSON object containing the student's message and returns the detected emotion with a confidence score.

**Request Body**

```json
{
  "text": "I am feeling very overwhelmed with my final year project and exams."
}
```

**Response**

```json
{
  "status": "success",
  "emotion": "Stress",
  "confidence": 0.89
}
```

---

## Integration and Scalability

**Decoupled Design** — Separating the ML logic into a standalone microservice keeps the main backend lightweight and free from the overhead of model loading.

**Concurrency** — FastAPI's asynchronous architecture allows the server to handle multiple simultaneous inference requests without blocking.

**Safety Sync** — While this service is responsible for emotion detection, the final crisis intervention decision is delegated to the backend gateway to ensure fully deterministic safety net behavior.