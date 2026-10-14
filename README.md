# DealerDesk — B2B Automotive Spare Parts & AI Dealer Assistant

> **Assignment Track**: `aiml` (AI / ML Track)  
> **Video Walkthrough**: [https://youtu.be/2cmcUrVs8Ok](https://youtu.be/2cmcUrVs8Ok)

---

## 1. Executive Summary

**DealerDesk** is a production-grade B2B dealer ordering and inventory management platform built for an automotive spare parts distributor headquartered in Bengaluru, Karnataka. The distributor manages a catalogue of 600 spare parts and supplies 25 authorized dealerships across South India (Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, and Telangana).

For the **AI/ML Track**, this repository delivers:
1. **Core Relational Backend**: Fully aligned PostgreSQL models for Products, Inventory, Dealers, and Orders with strict Decimal GST calculations and idempotency.
2. **AI-Powered Dealer Assistant**: A GenAI agent powered by Google Gemini (`gemini-2.5-flash`) utilizing multi-turn ReAct tool calling to search the database catalogue, verify live warehouse stock, and create authoritative wholesale `DRAFT` orders.
3. **Interactive Dealer Portal**: A full frontend portal (`http://localhost:8000/`) allowing dealers to browse catalogue parts, inspect live stock indicators, manage purchase carts, and chat with the AI assistant in real time.

---

## 2. LLM Provider & Architecture

* **Primary Provider**: **Google Gemini** (`gemini-2.5-flash`) via `GEMINI_API_KEY`.
* **Endpoint Architecture**: Uses Google's OpenAI-compatible API endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`) to provide unified function-calling schemas and deterministic JSON parsing.
* **Multi-Provider Fallback Layer**: Implemented in [`assistant/provider.py`](assistant/provider.py). Automatically detects and hot-swaps to any available environment key:
  - **Groq** (`GROQ_API_KEY`) &rarr; `llama-3.3-70b-versatile`
  - **OpenAI** (`OPENAI_API_KEY`) &rarr; `gpt-4o-mini`
  - **Anthropic** (`ANTHROPIC_API_KEY`) &rarr; `claude-3-5-haiku-20241022`
* **Zero-Cost Mock Handler**: For automated tests, an internal mock handler (`assistant_client.set_mock_handler`) isolates testing from paid API tokens and external network latency.

---

## 3. Quickstart & Setup Guide

### Prerequisites
* Python 3.11+ (Python 3.13 tested)
* PostgreSQL 14+ running locally or remotely

### Step 1: Clone Repository & Create Virtual Environment
```bash
git clone https://github.com/Rithika-Gurusamy/vikmo.git
cd vikmo

# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` contains your PostgreSQL credentials and Gemini API key:
```ini
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,testserver
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/vikmo
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 4: Run Migrations & Seed Data
```bash
# Apply PostgreSQL database schema
python manage.py migrate

# Seed 600 catalogue products, 600 inventory ledgers, and 25 dealers (Idempotent)
python manage.py seed_data
```

### Step 5: Start Development Server
```bash
python manage.py runserver 0.0.0.0:8000
```
Open **`http://localhost:8000/`** in your browser to access the Dealer Portal and Assistant.

---

## 4. How to Run Tests

### Unit & Integration Tests (Built-in Django Test Runner)
All tests run with isolated in-memory test databases and mock handlers (zero API tokens used):

```bash
# Run all project test suites
python manage.py test

# Run AI Dealer Assistant test suite specifically (14 tests covering tools, memory, citations, & prompt injections)
python manage.py test assistant.tests

# Run core inventory and model tests
python manage.py test inventory.tests
```

### Contract Smoke Test
Run the official assignment contract validation script against your local server:

```bash
# Test Core APIs and Dealer Assistant contract endpoints
python smoke_test.py --base-url http://localhost:8000 --track aiml
```

---

## 5. Optional Parts Attempted

1. **Interactive Full-Stack Web Portal (`http://localhost:8000/`)**:
   - Built a complete B2B ordering interface featuring:
     - Real-time catalogue search and category pill filtering directly bound to PostgreSQL.
     - Live warehouse stock status badges (`In Stock`, `Low Stock`, `Out of Stock`).
     - Persistent shopping cart drawer with client-side 18% GST estimate.
     - Order history view displaying real database consignment snapshots.
     - Embedded chat interface with demo prompt chips and live tool execution badges.
2. **Multi-Provider Dynamic LLM Engine**:
   - Engineered [`assistant/provider.py`](assistant/provider.py) to dynamically inspect runtime environment variables and seamlessly switch between Gemini, Groq, OpenAI, and Anthropic.
3. **Automated Error Resilience**:
   - Custom exception handler ([`dealerdesk/exceptions.py`](dealerdesk/exceptions.py)) standardizing all DRF errors into the exact contract JSON structure: `{"error": {"code": "...", "message": "...", "details": []}}`.

---

## 6. Key Engineering Assumptions

1. **Single Central Warehouse Distribution**:
   - All 600 catalogue products are stored at and dispatched from a single central distributor facility in Bengaluru, modeled as a strict `1:1` relationship between `Product` and `Inventory`.
2. **Statutory 18% GST Calculation**:
   - Automotive spare parts in India fall under standard GST brackets. Calculations use high-precision Python `Decimal` arithmetic rounded to 2 decimal places using `ROUND_HALF_UP` (`line_tax = (line_subtotal * Decimal("0.18")).quantize(Decimal("0.01"))`).
3. **Database Grounding for Alphanumeric Spare Parts**:
   - Dense vector embeddings frequently smooth out fine-grained alphanumeric distinctions (e.g. confusing `BRK-1044` with `BRK-1045`). We implemented a two-stage hybrid retrieval strategy: indexed database `Q` filtering followed by domain-weighted scoring (+200 for exact SKU, +70 for vehicle fitment) to eliminate hallucinated part numbers.
4. **Untrusted External Data Guardrails**:
   - Supplier descriptions and catalogue texts are treated strictly as read-only data, never instructions. The assistant tool-calling loop isolates database writes exclusively to `create_draft_order`, which enforces `status="DRAFT"`.
5. **Bounded Session Memory**:
   - Dialogue history in [`assistant/memory.py`](assistant/memory.py) is capped at 24 messages (~12 conversation turns) per `session_id` using a thread-safe deque. Re-accessing a session with a different `dealer_id` purges memory to eliminate cross-dealer data leakage.

---

## 7. Project Directory Structure

```
vikmo/
├── .env.example                       # Documented environment variables template
├── .gitignore                         # Git exclusion rules (.env, venv, cache)
├── requirements.txt                   # Production dependencies (Django, DRF, psycopg, openai)
├── manage.py                          # Django management CLI entry point
├── README.md                          # Repository documentation & guide
├── DECISIONS.md                       # Detailed answers to the 8 AI/ML track architectural questions
├── smoke_test.py                      # Contract compliance test runner
│
├── data/                              # Provided dataset files (CSV)
│   ├── catalogue.csv                  # 600 automotive spare parts
│   ├── dealers.csv                    # 25 authorized South India dealers
│   ├── sales_history.csv              # Historical transaction records
│   ├── lead_times.csv                 # Supplier fulfillment lead times
│   ├── festival_calendar.csv          # Regional South Indian festival dates
│   └── promo_calendar.csv             # Marketing promotional schedules
│
├── dealerdesk/                        # Django Project Configuration
│   ├── settings.py                    # App configuration, PostgreSQL DB backend, DRF settings
│   ├── urls.py                        # Root URL routing & Swagger UI endpoints
│   ├── exceptions.py                  # Contract-compliant custom API exception handler
│   └── wsgi.py                        # WSGI server entry point
│
├── inventory/                         # Core Inventory, Catalogue & Order Engine
│   ├── models.py                      # Models: Product, Inventory, Dealer, Order, OrderItem
│   ├── views.py                       # REST API Views: /api/products/, /api/inventory/, /api/orders/
│   ├── serializers.py                 # DRF Serializers with field-level validators
│   ├── urls.py                        # Endpoint route mappings
│   ├── tests.py                       # Model integrity and API endpoint tests
│   └── management/commands/
│       └── seed_data.py               # Idempotent CSV database seeder
│
├── assistant/                         # GenAI Dealer Assistant Module (§9)
│   ├── views.py                       # API View: POST /api/assistant/chat/
│   ├── service.py                     # System prompt, guardrails, and citation verification
│   ├── provider.py                    # Multi-turn ReAct tool execution loop & Gemini provider
│   ├── tools.py                       # Tools: search_parts, check_stock, create_draft_order
│   ├── memory.py                      # Thread-safe in-memory session history store
│   ├── serializers.py                 # Request and response contract schemas
│   └── tests.py                       # 14 unit tests covering ReAct loop, tools, & security
│
├── templates/dealer/                  # Dealer Portal Presentation Layer
│   └── index.html                     # Responsive single-page application dashboard
│
└── static/dealer/                     # Portal Static Assets
    ├── css/styles.css                 # Custom CSS design system (dark sidebar, modern typography)
    └── js/app.js                      # Vanilla JavaScript frontend controller & live API bindings
```
