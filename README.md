# 🧞 OrderGenie

**AI-powered food ordering platform with face recognition login, GPT-driven recommendations, and a conversational ordering assistant.**

OrderGenie lets a customer walk up to a kiosk, get recognized by their face, receive personalized dish recommendations generated from their real order history, chat with an AI assistant to build their cart, and earn royalty points — all without typing a password.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🙂 **Face Recognition Login** | Register and log in with your face using DeepFace (Facenet512 + RetinaFace). No passwords. |
| 🤖 **AI Recommendations** | OpenAI GPT analyzes past orders to build a preference profile and suggest dishes, with caching for speed. |
| 💬 **Conversational Ordering** | Chat naturally ("I'm craving something spicy") and the assistant suggests items and adds them to the cart. |
| 🛒 **Full Commerce Flow** | Products, categories, cart, checkout, payment selection, order history, order status tracking. |
| 🎁 **Royalty Points** | Points earned per item on every order, tracked via a transaction ledger. |
| 🖥️ **Kiosk Mode** | Dedicated large-screen kiosk ordering flow for in-store use. |
| 👨‍💼 **Admin & Employee Panels** | Manage products, categories, orders, profiles, employees, and recommendations. |
| 📱 **Mobile App** | Flutter app with camera-based face registration/recognition and the complete ordering experience. |

---

## 🏗️ Architecture

OrderGenie is a microservices system with two backends and three clients.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Next.js Web │   │ Flutter App  │   │  Kiosk (Web) │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
                 ┌────────────────────┐
                 │  Node.js / Express │  ← API gateway, business logic,
                 │   (TypeScript)     │    Prisma ORM, caching, auth
                 └─────┬────────┬─────┘
                       │        │
              ┌────────▼──┐  ┌──▼──────────────────┐
              │ PostgreSQL│  │  Python / FastAPI   │  ← all AI/ML
              │  (Neon)   │  │  DeepFace + OpenAI  │
              └───────────┘  └──────────┬──────────┘
                                        ▼
                                 ┌─────────────┐
                                 │ OpenAI API  │
                                 └─────────────┘
```

**Why two backends?** Node handles orchestration, persistence and API surface; Python owns everything ML — face embeddings, preference analysis and GPT calls. They talk over HTTP.

---

## 🧰 Tech Stack

**Frontend (Web)** — Next.js 16, React 19, TypeScript, Tailwind CSS v4, Zustand, dnd-kit, lucide-react

**Mobile** — Flutter (Dart 3.10), camera, image_picker, http

**Node Backend** — Node.js, Express 4, TypeScript, Prisma 5, PostgreSQL, Cloudinary, Multer, Helmet

**Python Backend** — FastAPI, DeepFace (Facenet512 / RetinaFace), OpenCV, NumPy, OpenAI, asyncpg

**Database** — PostgreSQL (Neon)

---

## 📁 Project Structure

```
ai-order/
├── web_frontend/          # Next.js customer + admin + kiosk web app
│   └── src/
│       ├── app/           # routes: products, cart, checkout, kiosk, admin, employee...
│       ├── components/    # ui, products, chat, face, checkout, recommendations...
│       ├── stores/        # zustand: cart, product, chat, recommendation
│       ├── context/       # Auth, Cart, Kiosk, Employee contexts
│       └── lib/           # api clients, normalizers, utils
│
├── node_backend/          # Express API gateway
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/        # face, profiles, products, categories, orders,
│       │                  # recommendations, points, employees, embeddings
│       ├── controllers/   # request handling
│       ├── services/      # prisma, cloudinary, python-client, points, recommendation
│       └── middleware/    # admin, employee, upload
│
├── python_backend/        # FastAPI AI service
│   ├── main.py
│   └── app/
│       ├── routers/       # health, face, recommendations, chat
│       └── services/      # deepface, openai, recommendation, chat, database
│
├── ai_dashboard_frontend/ # Flutter mobile app
│   └── lib/               # pages, models, services, widgets, chat, admin
│
├── designs/               # UI design references (HTML + screenshots)
└── dev-docs/              # API.md, chatbot.md, recommendation-working.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Flutter SDK 3.10+ (only for the mobile app)
- A PostgreSQL database (Neon works great)
- An OpenAI API key
- A Cloudinary account (for product/profile images)

### 1. Clone

```bash
git clone https://github.com/<your-username>/ai-order.git
cd ai-order
```

### 2. Python Backend (AI service)

```bash
cd python_backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install "uvicorn[standard]" python-multipart tf-keras
```

Create `python_backend/.env`:

```env
HOST=0.0.0.0
PORT=8000
DEBUG=true
MODEL_NAME=Facenet512
DETECTOR_BACKEND=retinaface
DATABASE_URL=postgresql://user:password@host/dbname
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
```

Run it:

```bash
python main.py          # http://localhost:8000  (docs at /docs)
```

> First run downloads the DeepFace model weights — give it a minute.

### 3. Node Backend (API gateway)

```bash
cd node_backend
npm install
```

Create `node_backend/.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host/dbname
PYTHON_BACKEND_URL=http://localhost:8000
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
ADMIN_TOKEN=your-admin-token
FACE_MAX_DISTANCE=0.6
FACE_MIN_SIMILARITY=0.4
```

Set up the database and start:

```bash
npm run db:generate
npm run db:push
npm run dev             # http://localhost:3000
```

### 4. Web Frontend

```bash
cd web_frontend
npm install
```

Create `web_frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

```bash
npm run dev             # http://localhost:3000 (use another port if Node API is on 3000)
```

### 5. Flutter App (optional)

```bash
cd ai_dashboard_frontend
flutter pub get
```

Point `lib/config/api_config.dart` → `baseUrl` at your Node backend (use ngrok or your LAN IP for a physical device), then:

```bash
flutter run
```

---

## 📡 API Overview

### Node Backend — `http://localhost:3000/api`

| Route | Purpose |
|---|---|
| `/face` | Detect and recognize faces |
| `/profiles` | Register users, manage face profiles |
| `/embeddings` | Face embedding management |
| `/products` | Product catalog (public reads, admin writes) |
| `/categories` | Category management |
| `/orders` | Place, list and track orders |
| `/recommendations` | Personalized AI recommendations |
| `/points` | Royalty points balance and history |
| `/employees` | Employee auth and management |
| `/health` | Health check |

Admin endpoints require the `x-admin-token` header.

### Python Backend — `http://localhost:8000`

| Endpoint | Purpose |
|---|---|
| `POST /api/detect` | Detect faces in an image |
| `POST /api/represent` | Generate a face embedding |
| `POST /api/analyze` | Analyze facial attributes |
| `POST /api/verify` | Verify two faces match |
| `POST /api/recommendations/analyze/{profile_id}` | Build a preference profile from order history |
| `POST /api/recommendations/generate/{profile_id}` | Generate AI recommendations |
| `GET  /api/recommendations/trending` | Trending items |
| `GET  /api/recommendations/similar/{product_id}` | Similar items |
| `POST /api/chat/message` | Send a message to the AI ordering assistant |
| `POST /api/chat/confirm` | Confirm items suggested in chat |

📖 Full reference: [`dev-docs/API.md`](dev-docs/API.md) · [`dev-docs/chatbot.md`](dev-docs/chatbot.md) · [`dev-docs/recommendation-working.md`](dev-docs/recommendation-working.md)

---

## 🗄️ Data Model

Key Prisma models: `FaceProfile`, `FaceEmbedding`, `DetectionLog`, `Category`, `Product`, `Order`, `OrderItem`, `UserPreference`, `RecommendationCache`, `GlobalAnalytics`, `Employee`, `PointsTransaction`.

---

## 🔄 How the AI Flows Work

**Face login:** image → Node (`/api/face/recognize`) → Python generates an embedding → Node compares it against stored embeddings using cosine distance thresholds → matched profile returned and session started.

**Recommendations:** Node pulls the profile's order history → Python summarizes it into a preference profile → GPT generates ranked suggestions → results cached in `RecommendationCache` so repeat visits are instant.

**Chat ordering:** message + optional profile ID + conversation history → GPT with the live product catalog in context → assistant replies with suggested products → user confirms → items go straight into the cart.

---

## 🔐 Environment Variables

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | Node, Python | PostgreSQL connection string |
| `PYTHON_BACKEND_URL` | Node | URL of the FastAPI service |
| `CLOUDINARY_URL` | Node | Cloudinary credentials for image uploads |
| `ADMIN_TOKEN` | Node | Token required by admin routes |
| `FACE_MAX_DISTANCE` | Node | Max embedding distance for a match (default `0.6`) |
| `FACE_MIN_SIMILARITY` | Node | Min similarity for a match (default `0.4`) |
| `OPENAI_API_KEY` | Python | OpenAI key |
| `OPENAI_MODEL` | Python | Model name (default `gpt-3.5-turbo`) |
| `MODEL_NAME` | Python | DeepFace model (default `Facenet512`) |
| `DETECTOR_BACKEND` | Python | Face detector (default `retinaface`) |
| `NEXT_PUBLIC_API_URL` | Web | Node backend base URL |

> ⚠️ Never commit `.env` files. They're gitignored — keep it that way.

---

## 📜 Scripts

**Node backend**
```bash
npm run dev          # dev server with hot reload
npm run build        # compile TypeScript
npm start            # run compiled build
npm run db:generate  # generate Prisma client
npm run db:push      # push schema to database
npm run db:migrate   # create a migration
npm run db:studio    # open Prisma Studio
```

**Web frontend**
```bash
npm run dev / build / start / lint
```

---

## 🤝 Contributing

1. Fork the repo
2. `git checkout -b feature/your-feature`
3. Commit your changes
4. Push and open a Pull Request

---

## 📄 License

This project is currently unlicensed. Add a `LICENSE` file if you plan to open-source it.

---

<p align="center">Built with ☕ and a lot of face embeddings.</p>
