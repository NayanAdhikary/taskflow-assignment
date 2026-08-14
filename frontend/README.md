# Task Management Kanban Board

A full-stack task management application with a clean Kanban board interface for organizing tasks across workflow stages.

## 🚀 Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 16+

### From a clean clone

#### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn pytest httpx

# Start backend server
python main.py
```

✅ Backend runs on http://localhost:8000

#### 2. Frontend Setup (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend runs on http://localhost:5173

#### 3. Verify Setup

- Visit http://localhost:8000/health → should return `{"status": "healthy"}`
- Visit http://localhost:5173 → should show the Kanban board with sample data
- Run tests: `cd backend && pytest test_main.py -v`

---

## 🏗️ Decisions & Assumptions

### Why Python + FastAPI?

- Fast development: automatic API documentation and type hints speed up development
- Built-in testing: pytest ecosystem provides excellent testing capabilities
- SQLite integration: Python's built-in SQLite support is ideal for this project scope
- Modern Python: async support and Pydantic validation reduce boilerplate code

### Why React?

- Component architecture: makes the UI maintainable and reusable
- Simple state management: React hooks are sufficient for this application size
- Fast development: Vite provides an excellent developer experience with hot reload

### Key Design Decisions

#### Dropdown vs. Drag-and-Drop

I chose a simple dropdown instead of drag-and-drop because:

- Reliability: a working feature is better than a broken advanced feature
- Time priority: drag-and-drop libraries can introduce complex bugs and time constraints
- Accessibility: dropdowns work seamlessly on all devices and input methods
- User experience: clear, immediate feedback when moving tasks

### Database Structure

```text
boards (id, name)
  ↓
columns (id, board_id, title, order_index)
  ↓
tasks (id, column_id, title, description, priority)
```

- Normalized design: separate tables allow future multi-board support
- Data integrity: foreign keys maintain consistency
- Flexibility: `order_index` enables custom column ordering

### Error Handling Strategy

- User-friendly: all errors show clear messages via `alert()`
- Comprehensive: every API call is wrapped in `try/catch`
- Graceful degradation: the app continues working even if operations fail

---

## ⏱️ Time Spent

- Total: ~6 hours
- Backend development: 2.5 hours
- Frontend development: 2.5 hours
- Testing & integration: 1 hour
- Documentation: 0.5 hours

---

## 💡 Learnings

### Most Interesting Discovery

FastAPI's automatic API documentation generation at the `/docs` endpoint creates fully interactive documentation from Python type hints. This eliminated the need for manual API documentation and made frontend development significantly faster. Developers can test endpoints directly in the browser without writing custom test scripts.

### Technical Insight

Implementing proper error handling taught me that user experience is not just about happy paths. Every `fetch()` call is a potential failure point. Wrapping async operations in `try/catch` and providing meaningful error messages (like "Task title cannot be empty") transforms a frustrating experience into a helpful one.

---

## ✨ Features Implemented

### Core Functionality

- ✅ CRUD operations: create, edit, and delete tasks with validation
- ✅ Task movement: move tasks between columns using a dropdown
- ✅ Priority system: low, medium, and high with color coding
- ✅ Filtering: filter tasks by priority level

### User Experience

- ✅ Modal forms: clean task creation and editing interface
- ✅ Error handling: user-friendly error messages for all scenarios
- ✅ Responsive design: works on desktop and mobile devices
- ✅ Loading states: visual feedback during async operations

### Technical Features

- ✅ Input validation: both client-side and server-side validation
- ✅ CORS support: proper frontend-backend communication
- ✅ Auto database setup: automatic schema and seed data creation
- ✅ Comprehensive tests: 8 test cases covering all scenarios

---

## 📡 API Endpoints

- `GET /api/board` - Get complete board with columns and tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/{id}` - Update an existing task
- `DELETE /api/tasks/{id}` - Delete a task
- `GET /api/queries/task-counts` - Get task counts by column (GROUP BY demo)
- `GET /api/queries/priority/{priority}` - Filter tasks by priority
- `GET /health` - Health check endpoint

---

## 🧪 Testing

Run the test suite:

```bash
cd backend
pytest test_main.py -v
```

### Test Coverage

- Empty title validation (returns 400 Bad Request)
- Task movement between columns updates the database
- Task count queries return accurate results
- Error handling for invalid requests
- Database operations and data integrity

---

## 🚀 Future Enhancements

Given more time, potential improvements include:

- Drag-and-drop: implement `react-beautiful-dnd` for intuitive task movement
- Real-time collaboration: WebSocket support for multi-user live updates
- User authentication: user accounts with task ownership
- Due dates: calendar integration and deadline tracking
- File attachments: document upload capability

---

## 📁 Project Structure

```text
taskflow-assignment/
├── README.md
├── backend/
│   ├── main.py          # FastAPI application
│   ├── test_main.py     # Test suite
│   ├── schema.sql       # Database schema
│   ├── seed.sql         # Sample data
│   └── tasks.db         # SQLite database (auto-generated)
└── frontend/
    ├── src/
    │   ├── App.jsx      # Main React component
    │   └── App.css      # Styling
    └── package.json     # Dependencies
```

Built with FastAPI and React • Backend API Docs • Live Demo
