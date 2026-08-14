from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware  # Added this import
from pydantic import BaseModel
from typing import Optional
import sqlite3
import os
from contextlib import contextmanager, asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    yield

app = FastAPI(
    title="Task API",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware - ADDED THIS SECTION
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "https://*.vercel.app",  # Allow all Vercel subdomains
        "https://vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_FILE = "tasks.db"

# Pydantic model for request/response
class TaskCreate(BaseModel):
    column_id: int
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Median"  # Fixed: Changed from int to str
    
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None  # Fixed: Changed from int to str
    column_id: Optional[int] = None
    

# Database utilities
@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
        

def init_database():
    """Initialize the database with schema and seed data if it doesn't exist."""
    
    if not os.path.exists(DATABASE_FILE):
        with get_db() as conn:
            # Execute schema.sql
            try:
                with open("schema.sql", "r") as f:
                    schema = f.read()
                conn.executescript(schema)
                
                # Execute seed.sql
                with open("seed.sql", "r") as f:
                    seed = f.read()
                conn.executescript(seed)
                
                conn.commit()
                print("Database initialized Successfully")
            except Exception as e:
                print(f"Error: {e}. Make sure schema.sql and seed.sql exist.")
                raise
    
# API Endpoints

@app.get("/api/board")
async def get_board():
    """Get board with all columns and their tasks."""
    with get_db() as conn:
        # Get board info (assuming board ID 1 based on seed data)
        board_row = conn.execute("SELECT * FROM boards WHERE id = 1").fetchone()
        if not board_row:
            raise HTTPException(status_code=404, detail="Board not found")
        
        # Get columns ordered by order_index
        columns_rows = conn.execute("""
            SELECT * FROM columns 
            WHERE board_id = 1 
            ORDER BY order_index
        """).fetchall()
        
        columns = []
        for col_row in columns_rows:
            # Get tasks for each column
            tasks_rows = conn.execute("""
                SELECT * FROM tasks 
                WHERE column_id = ? 
                ORDER BY created_at
            """, (col_row["id"],)).fetchall()
            
            tasks = [dict(task_row) for task_row in tasks_rows]
            
            column = {
                "id": col_row["id"],
                "board_id": col_row["board_id"],
                "title": col_row["title"],
                "order_index": col_row["order_index"],
                "tasks": tasks
            }
            columns.append(column)
        
        board = {
            "id": board_row["id"],
            "name": board_row["name"],
            "columns": columns
        }
        
        return board


@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(task: TaskCreate):
    """Create a new task"""
    # Validation: Check if title is empty or missing
    if not task.title or task.title.strip() == "":
        raise HTTPException(status_code=400, detail="Task title cannot be empty")
    
    # Validate priority against schema constraints
    valid_priorities = ["Low", "Median", "High"]
    if task.priority and task.priority not in valid_priorities:
        raise HTTPException(status_code=400, detail=f"Priority must be one of: {', '.join(valid_priorities)}")
    
    with get_db() as conn:
        # Check if column exists
        column_exists = conn.execute(
            "SELECT 1 FROM columns WHERE id = ?", (task.column_id,)
        ).fetchone()
        
        if not column_exists:
            raise HTTPException(status_code=400, detail="Column does not exist")
        
        # Insert task
        cursor = conn.execute("""
            INSERT INTO tasks (column_id, title, description, priority)
            VALUES (?, ?, ?, ?)
        """, (task.column_id, task.title, task.description, task.priority))
        
        task_id = cursor.lastrowid
        conn.commit()
        
        # Return created task
        task_row = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        
        return dict(task_row)

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: int, task_update: TaskUpdate):
    """Update an existing task"""
    with get_db() as conn:
        # Check if task exists
        existing_task = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        
        if not existing_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Build update query dynamically based on provided fields
        update_fields = []
        update_values = []
        
        if task_update.title is not None:
            if task_update.title.strip() == "":
                raise HTTPException(status_code=400, detail="Task title cannot be empty")
            update_fields.append("title = ?")
            update_values.append(task_update.title)
        
        if task_update.description is not None:
            update_fields.append("description = ?")
            update_values.append(task_update.description)
        
        if task_update.priority is not None:
            valid_priorities = ["Low", "Median", "High"]
            if task_update.priority not in valid_priorities:
                raise HTTPException(status_code=400, detail=f"Priority must be one of: {', '.join(valid_priorities)}")
            update_fields.append("priority = ?")
            update_values.append(task_update.priority)
        
        if task_update.column_id is not None:
            # Check if column exists
            column_exists = conn.execute(
                "SELECT 1 FROM columns WHERE id = ?", (task_update.column_id,)
            ).fetchone()
            
            if not column_exists:
                raise HTTPException(status_code=400, detail="Column does not exist")
            
            update_fields.append("column_id = ?")
            update_values.append(task_update.column_id)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Execute update
        update_values.append(task_id)
        query = f"UPDATE tasks SET {', '.join(update_fields)} WHERE id = ?"
        
        conn.execute(query, update_values)
        conn.commit()
        
        # Return updated task
        updated_task = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        
        return dict(updated_task)

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int):
    """Delete a task"""
    with get_db() as conn:
        # Check if task exists
        existing_task = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        
        if not existing_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Delete task
        conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        
        return {"message": "Task deleted successfully"}

@app.get("/api/queries/task-counts")
async def get_task_counts():
    """Get task counts grouped by column (GROUP BY query)"""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT c.title as column_title, COUNT(t.id) as task_count
            FROM columns c
            LEFT JOIN tasks t ON c.id = t.column_id
            WHERE c.board_id = 1
            GROUP BY c.id, c.title
            ORDER BY c.order_index
        """).fetchall()
        
        return [{"column_title": row["column_title"], "task_count": row["task_count"]} for row in rows]

@app.get("/api/queries/priority/{priority}")
async def get_tasks_by_priority(priority: str):
    """Get all tasks filtered by priority"""
    valid_priorities = ["Low", "Median", "High"]
    if priority not in valid_priorities:
        raise HTTPException(status_code=400, detail=f"Priority must be one of: {', '.join(valid_priorities)}")
    
    with get_db() as conn:
        rows = conn.execute("""
            SELECT t.*, c.title as column_title
            FROM tasks t
            JOIN columns c ON t.column_id = c.id
            WHERE t.priority = ?
            ORDER BY t.created_at
        """, (priority,)).fetchall()
        
        return [dict(row) for row in rows]

# Health check endpoint
@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
