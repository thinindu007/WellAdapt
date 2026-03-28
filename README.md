# 🌊 WellAdapt: A Mental Wellness Ecosystem for University Students

**WellAdapt** is an end-to-end mental health support platform designed specifically for the Sri Lankan university context. It leverages Deep Learning for emotion detection and Generative AI for empathetic counseling, balanced by a deterministic safety layer.

## 🏗️ System Architecture
The project is built as a modular microservices-based ecosystem:

* **Frontend (React/Vite):** A bilingual (EN/SI) interface featuring an SOS Safety Layer and Markdown-based counseling feedback.
* **Backend (Node.js/TypeScript):** The central orchestrator managing user data, chat persistence, and the "Counselor Bridge" PDF reporting engine.
* **ML Server (FastAPI/Python):** A specialized inference engine running a custom-trained **CNN-LSTM** model for English emotion detection.
* **Inference Layer (Ollama/LLaMA 3):** Handles multi-turn counseling dialogue and Sinhala linguistic reasoning.

## 🛡️ Key Innovations
1.  **Safety-First Design:** Implements a hybrid crisis detection system (Regex + AI) to ensure immediate intervention for high-risk users.
2.  **The Counselor Bridge:** Transforms raw chat data into a structured Wellness Summary for clinical professionals.
3.  **Cross-Platform NLP:** Combines traditional Deep Learning (CNN-LSTM) with LLMs to provide a balance of accuracy and empathy.

## 🛠️ Quick Start
1.  **Clone the Repo:** `git clone https://github.com/your-username/WellAdapt.git`
2.  **ML Server:** Navigate to `/welladapt-ml-server`, install `requirements.txt`, and run `uvicorn main:app`.
3.  **Backend:** Navigate to `/welladapt-backend`, run `npm install`, and start with `npm run dev`.
4.  **Frontend:** Navigate to `/welladapt-frontend`, run `npm install`, and start with `npm run dev`.

*Note: Ensure local instances of PostgreSQL and Ollama (LLaMA 3) are running before starting the services.*
