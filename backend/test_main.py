import pytest
import os
import sqlite3
from fastapi.testclient import TestClient
import main

# Test database file
TEST_DATABASE_FILE = "test_tasks.db"

@pytest.fixture(scope="function")
def test_client(monkeypatch):  # Fixed: Added monkeypatch parameter
    """Create a test client with isolated test database"""
    # Override the database file constant
    monkeypatch.setattr(main, "DATABASE_FILE", TEST_DATABASE_FILE)  # Fixed: setattr instead of setatter
    
    # Create test database
    setup_test_database()
    
    client = TestClient(main.app)
    yield client
    
    # Cleanup
    cleanup_test_database()

def setup_test_database():
    """Create test database with schema and seed data"""
    # Remove existing test database if it exists
    if os.path.exists(TEST_DATABASE_FILE):
        os.remove(TEST_DATABASE_FILE)
    
    conn = sqlite3.connect(TEST_DATABASE_FILE)
    
    try:
        # Execute schema
        with open('schema.sql', 'r') as f:
            schema = f.read()
        conn.executescript(schema)
        
        # Execute seed data
        with open('seed.sql', 'r') as f:
            seed = f.read()
        conn.executescript(seed)
        
        conn.commit()
    except FileNotFoundError as e:
        pytest.skip(f"Required SQL files not found: {e}")
    finally:
        conn.close()

def cleanup_test_database():
    """Remove test database file"""
    if os.path.exists(TEST_DATABASE_FILE):
        os.remove(TEST_DATABASE_FILE)

# Test 1: Empty Title Fails
def test_empty_title_fails(test_client):
    """Test that POST with empty title returns 400"""
    response = test_client.post("/api/tasks", json={
        "column_id": 1,
        "title": "",
        "description": "Test task",
        "priority": "High"
    })
    assert response.status_code == 400
    response_data = response.json()
    assert "Task title cannot be empty" in response_data["detail"]

def test_missing_title_fails(test_client):
    """Test that POST with missing title returns 422 validation error"""
    response = test_client.post("/api/tasks", json={
        "column_id": 1,
        "description": "Test task",
        "priority": "High"
        # title is missing
    })
    assert response.status_code == 422  # Pydantic validation error

def test_whitespace_only_title_fails(test_client):
    """Test that POST with whitespace-only title returns 400"""
    response = test_client.post("/api/tasks", json={
        "column_id": 1,
        "title": "   ",  # Only whitespace
        "description": "Test task",
        "priority": "High"
    })
    assert response.status_code == 400
    response_data = response.json()
    assert "Task title cannot be empty" in response_data["detail"]

# Test 2: Move Task Updates Status
def test_move_task_updates_status(test_client):
    """Test that PUT request changing column_id updates the task"""
    # First, create a task in column 1 (To Do)
    create_response = test_client.post("/api/tasks", json={
        "column_id": 1,
        "title": "Test Task",
        "description": "Test description",
        "priority": "Median"
    })
    assert create_response.status_code == 201
    task_data = create_response.json()
    task_id = task_data["id"]
    
    # Verify task was created in column 1
    assert task_data["column_id"] == 1
    
    # Move the task to column 2 (In Progress)
    update_response = test_client.put(f"/api/tasks/{task_id}", json={
        "column_id": 2
    })
    assert update_response.status_code == 200
    
    # Verify the task was moved to column 2
    updated_task = update_response.json()
    assert updated_task["column_id"] == 2
    assert updated_task["id"] == task_id
    assert updated_task["title"] == "Test Task"  # Other fields unchanged
    
    # Double-check by fetching the board and verifying task location
    board_response = test_client.get("/api/board")
    assert board_response.status_code == 200
    board_data = board_response.json()
    
    # Find the task in the board structure
    task_found_in_column_2 = False
    for column in board_data["columns"]:
        if column["id"] == 2:  # In Progress column
            for task in column["tasks"]:
                if task["id"] == task_id:
                    task_found_in_column_2 = True
                    break
    
    assert task_found_in_column_2, "Task should be found in column 2"

# Test 3: Database Layer Test
def test_database_layer_task_counts(test_client):
    """Test the task counts endpoint returns correct counts based on seed data"""
    response = test_client.get("/api/queries/task-counts")
    assert response.status_code == 200
    
    task_counts = response.json()
    
    # Based on seed.sql, we should have:
    # - To Do (column 1): 2 tasks (from seed data)
    # - In Progress (column 2): 0 tasks
    # - Done (column 3): 0 tasks
    
    expected_counts = [
        {"column_title": "To Do", "task_count": 2},
        {"column_title": "In Progress", "task_count": 0},
        {"column_title": "Done", "task_count": 0}
    ]
    
    assert len(task_counts) == 3
    assert task_counts == expected_counts

def test_task_counts_after_adding_tasks(test_client):
    """Test that task counts update correctly when adding new tasks"""
    # Get initial counts
    initial_response = test_client.get("/api/queries/task-counts")
    initial_counts = initial_response.json()
    
    # Add a task to column 2 (In Progress)
    test_client.post("/api/tasks", json={
        "column_id": 2,
        "title": "New Task",
        "priority": "High"
    })
    
    # Add another task to column 3 (Done)
    test_client.post("/api/tasks", json={
        "column_id": 3,
        "title": "Completed Task",
        "priority": "Low"
    })
    
    # Get updated counts
    updated_response = test_client.get("/api/queries/task-counts")
    updated_counts = updated_response.json()
    
    # Verify counts increased
    expected_updated_counts = [
        {"column_title": "To Do", "task_count": 2},      # unchanged
        {"column_title": "In Progress", "task_count": 1}, # +1
        {"column_title": "Done", "task_count": 1}         # +1
    ]
    
    assert updated_counts == expected_updated_counts

# Additional helpful tests
def test_priority_query_endpoint(test_client):
    """Test the priority filter endpoint"""
    # Test with "High" priority (should find 1 from seed data)
    response = test_client.get("/api/queries/priority/High")
    assert response.status_code == 200
    high_priority_tasks = response.json()
    assert len(high_priority_tasks) == 1
    assert high_priority_tasks[0]["priority"] == "High"
    
    # Test with invalid priority
    invalid_response = test_client.get("/api/queries/priority/Invalid")
    assert invalid_response.status_code == 400

def test_health_endpoint(test_client):
    """Test the health check endpoint"""
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}