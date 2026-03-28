# WellAdapt Frontend

**AI-Powered Mental Wellness Assistant for University Students**

This is the React-based frontend for the WellAdapt platform. It provides a secure, empathetic, and bilingual interface for students to engage with AI counseling, access emergency resources, and track their wellness journey.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React (Vite) |
| State Management | React Hooks (`useState`, `useEffect`, `useRef`) |
| Routing | React Router DOM |
| API Client | Axios (with interceptors for JWT) |
| Styling | Custom CSS3 (modular and responsive) |
| Rich Text | `react-markdown` (for AI response formatting) |

---

## Key Features

**Bilingual Support** — Full UI toggle between English and Sinhala.

**Safety Net Layer** — Real-time client-side crisis detection that triggers an Emergency SOS Modal for high-risk keywords.

**Rich AI Responses** — Structured counseling feedback with formatted text, bullet points, and supportive language.

**Wellness Analytics** — Integration with the backend to export a 30-day PDF Wellness Summary.

**Session Management** — Persistent chat history with the ability to create, load, and delete sessions.

---

## Setup and Installation

### Prerequisites

- Node.js v18.0.0 or higher
- npm or yarn

### Installation

Navigate to the frontend directory and install dependencies:

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the root of the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Folder Structure

```
src/
├── components/        # Reusable UI components (SOSModal, PrivateRoute)
├── pages/             # Main views (Login, Register, Chat)
├── utils/             # Helper modules (crisisDetection, translations)
├── assets/            # Images and icons
├── App.tsx            # Root component and route definitions
└── App.css            # Global styling and theme variables
```

---

## Security and Performance

**JWT Authentication** — Tokens are stored in `localStorage` and transmitted via `Authorization` headers on all API requests.

**Route Guarding** — Private routes ensure the Chat interface is accessible only to authenticated users.

**Blob Handling** — The PDF export feature uses `URL.createObjectURL` to securely handle binary report data without exposing it to the DOM.

---

## Crisis Intervention Logic

The frontend includes a deterministic safety layer that operates independently of the AI backend. Before any message is submitted to the server, it is evaluated by `isCrisisMessage()`. If high-risk language is detected in either English or Sinhala, the application intercepts the request and immediately presents the user with the National Mental Health Helpline number (**1926**).

This ensures that crisis response is guaranteed regardless of server availability or AI model behavior.

---

## Contributing

Please follow the existing code conventions and ensure all new components are accompanied by the appropriate translation keys for both supported languages. Test crisis detection changes carefully before submitting a pull request.