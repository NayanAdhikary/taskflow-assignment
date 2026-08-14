import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:8000'

// TaskCard Component
function TaskCard({ task, onEdit, onDelete, onMove, columns }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ff4757'
      case 'Median': return '#ffa502'
      case 'Low': return '#2ed573'
      default: return '#747d8c'
    }
  }

  const handleMoveChange = (e) => {
    const newColumnId = parseInt(e.target.value)
    if (newColumnId !== task.column_id) {
      onMove(task.id, newColumnId)
    }
  }

  return (
    <div className="task-card">
      <div className="task-header">
        <h4>{task.title}</h4>
        <span
          className="priority-badge"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        >
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-actions">
        <div className="task-controls">
          <select
            value={task.column_id}
            onChange={handleMoveChange}
            className="move-select"
            title="Move to column"
          >
            {columns.map(column => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => onEdit(task)}
            className="btn btn-edit"
            title="Edit task"
          >
            ✏️
          </button>

          <button
            onClick={() => onDelete(task.id)}
            className="btn btn-delete"
            title="Delete task"
          >
            🗑️
          </button>
        </div>

        <div className="task-meta">
          <small>ID: {task.id}</small>
        </div>
      </div>
    </div>
  )
}

// Column Component
function Column({ column, onEdit, onDelete, onMove, columns }) {
  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="task-count">{column.tasks.length}</span>
      </div>
      <div className="tasks-container">
        {column.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            columns={columns}
          />
        ))}
      </div>
    </div>
  )
}

// Task Form Modal Component
function TaskFormModal({ isOpen, onClose, onSubmit, task, columns }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Median',
    column_id: 1
  })

  useEffect(() => {
    if (task) {
      // Edit mode
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Median',
        column_id: task.column_id || 1
      })
    } else {
      // Create mode
      setFormData({
        title: '',
        description: '',
        priority: 'Median',
        column_id: 1
      })
    }
  }, [task])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Task title is required!')
      return
    }
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'column_id' ? parseInt(value) : value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task ? 'Edit Task' : 'Create New Task'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter task description (optional)"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="Low">Low</option>
                <option value="Median">Median</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="column_id">Column</label>
              <select
                id="column_id"
                name="column_id"
                value={formData.column_id}
                onChange={handleChange}
              >
                {columns.map(column => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main App Component
function App() {
  const [boardData, setBoardData] = useState(null)
  const [filteredBoardData, setFilteredBoardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [priorityFilter, setPriorityFilter] = useState('All')

  // Fetch board data
  const fetchBoardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/board`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setBoardData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching board data:', err)
      setError(err.message)
      alert(`Failed to load board: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchBoardData()
  }, [])

  // Apply priority filtering
  useEffect(() => {
    if (!boardData) {
      setFilteredBoardData(null)
      return
    }

    if (priorityFilter === 'All') {
      setFilteredBoardData(boardData)
    } else {
      const filtered = {
        ...boardData,
        columns: boardData.columns.map(column => ({
          ...column,
          tasks: column.tasks.filter(task => task.priority === priorityFilter)
        }))
      }
      setFilteredBoardData(filtered)
    }
  }, [boardData, priorityFilter])

  // Create or update task
  const handleTaskSubmit = async (formData) => {
    try {
      const url = editingTask
        ? `${API_BASE_URL}/api/tasks/${editingTask.id}`
        : `${API_BASE_URL}/api/tasks`

      const method = editingTask ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      await fetchBoardData() // Refresh data
      setIsFormOpen(false)
      setEditingTask(null)

      const action = editingTask ? 'updated' : 'created'
      alert(`Task ${action} successfully!`)
    } catch (err) {
      console.error('Error saving task:', err)
      alert(`Failed to save task: ${err.message}`)
    }
  }

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      await fetchBoardData() // Refresh data
      alert('Task deleted successfully!')
    } catch (err) {
      console.error('Error deleting task:', err)
      alert(`Failed to delete task: ${err.message}`)
    }
  }

  // Move task to different column
  const handleMoveTask = async (taskId, newColumnId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ column_id: newColumnId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      await fetchBoardData() // Refresh data
    } catch (err) {
      console.error('Error moving task:', err)
      alert(`Failed to move task: ${err.message}`)
    }
  }

  // Open edit form
  const handleEditTask = (task) => {
    setEditingTask(task)
    setIsFormOpen(true)
  }

  // Open create form
  const handleCreateTask = () => {
    setEditingTask(null)
    setIsFormOpen(true)
  }

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingTask(null)
  }

  if (loading) {
    return <div className="loading">Loading board data...</div>
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error loading board</h2>
        <p>{error}</p>
        <p>Make sure your backend server is running on http://localhost:8000</p>
        <button onClick={fetchBoardData} className="btn btn-primary">
          Retry
        </button>
      </div>
    )
  }

  if (!filteredBoardData) {
    return <div className="error">No board data available</div>
  }

  const allTasks = filteredBoardData.columns.flatMap(column => column.tasks)
  const totalTasks = allTasks.length
  const highPriorityCount = allTasks.filter(task => task.priority === 'High').length
  const mediumPriorityCount = allTasks.filter(task => task.priority === 'Median').length

  return (
    <div className="app">
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-mark">TF</div>
          <div className="title-wrap">
            <p className="eyebrow">Productivity workspace</p>
            <h1>{filteredBoardData.name}</h1>
          </div>
        </header>

        <section className="task-summary" aria-label="Board summary">
          <div className="summary-card summary-card--primary">
            <span>Total tasks</span>
            <strong>{totalTasks}</strong>
          </div>
          <div className="summary-card">
            <span>High priority</span>
            <strong>{highPriorityCount}</strong>
          </div>
          <div className="summary-card">
            <span>Medium priority</span>
            <strong>{mediumPriorityCount}</strong>
          </div>
        </section>

        <div className="app-controls">
          <button onClick={handleCreateTask} className="btn btn-primary btn-lg">
            + Add Task
          </button>

          <div className="filter-controls">
            <label htmlFor="priority-filter">Filter by Priority:</label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Median">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        <main className="board">
          {filteredBoardData.columns.map(column => (
            <Column
              key={column.id}
              column={column}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onMove={handleMoveTask}
              columns={boardData.columns}
            />
          ))}
        </main>

        <TaskFormModal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleTaskSubmit}
          task={editingTask}
          columns={boardData?.columns || []}
        />
      </div>
    </div>
  )
}

export default App