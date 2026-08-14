import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'https://taskflow-assignment-o473.onrender.com'

// TaskCard Component
function TaskCard({ task, onEdit, onDelete, onMove, columns }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#e74c3c'
      case 'Median': return '#f39c12' 
      case 'Low': return '#27ae60'
      default: return '#95a5a6'
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
      <div className="priority-stripe" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>
      
      <div className="task-content">
        <div className="task-header">
          <h4 className="task-title">{task.title}</h4>
          <div className="task-actions-inline">
            <button onClick={() => onEdit(task)} className="action-btn edit-btn" title="Edit">
              ✎
            </button>
            <button onClick={() => onDelete(task.id)} className="action-btn delete-btn" title="Delete">
              ✕
            </button>
          </div>
        </div>
        
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
        
        <div className="task-footer">
          <div className="task-meta">
            <span className="priority-label" style={{ color: getPriorityColor(task.priority) }}>
              {task.priority} priority
            </span>
          </div>
          
          <select
            value={task.column_id}
            onChange={handleMoveChange}
            className="move-dropdown"
          >
            {columns.map(column => (
              <option key={column.id} value={column.id}>
                Move to {column.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// Column Component  
function Column({ column, onEdit, onDelete, onMove, columns }) {
  const getColumnEmoji = (title) => {
    switch(title) {
      case 'To Do': return '📝'
      case 'In Progress': return '⚡'
      case 'Done': return '✅'
      default: return '📋'
    }
  }

  return (
    <div className={`column column-${column.id}`}>
      <div className="column-header">
        <div className="column-title">
          <span className="column-emoji">{getColumnEmoji(column.title)}</span>
          <h3>{column.title}</h3>
        </div>
        <div className="task-counter">
          {column.tasks.length}
        </div>
      </div>
      
      <div className="tasks-list">
        {column.tasks.length === 0 ? (
          <div className="empty-column">
            <span className="empty-text">No tasks yet</span>
          </div>
        ) : (
          column.tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              columns={columns}
            />
          ))
        )}
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
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Median',
        column_id: task.column_id || 1
      })
    } else {
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
      alert('Please enter a task title!')
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? '✎ Edit Task' : '✨ Create New Task'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="input-group">
            <label>Task Title *</label>
            <input
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="What needs to be done?"
              className="text-input"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add some details... (optional)"
              className="text-area"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="select-input"
              >
                <option value="Low">🟢 Low</option>
                <option value="Median">🟡 Medium</option>
                <option value="High">🔴 High</option>
              </select>
            </div>

            <div className="input-group">
              <label>Start in Column</label>
              <select
                name="column_id"
                value={formData.column_id}
                onChange={handleChange}
                className="select-input"
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
            <button type="button" onClick={onClose} className="btn btn-secondary">
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
      alert(`Oops! Couldn't load the board: ${err.message}`)
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

      await fetchBoardData()
      setIsFormOpen(false)
      setEditingTask(null)
      
      const action = editingTask ? 'updated' : 'created'
      alert(`Great! Task ${action} successfully! 🎉`)
    } catch (err) {
      console.error('Error saving task:', err)
      alert(`Hmm, something went wrong: ${err.message}`)
    }
  }

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This cannot be undone.')) {
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

      await fetchBoardData()
      alert('Task deleted! 🗑️')
    } catch (err) {
      console.error('Error deleting task:', err)
      alert(`Couldn't delete task: ${err.message}`)
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

      await fetchBoardData()
    } catch (err) {
      console.error('Error moving task:', err)
      alert(`Couldn't move task: ${err.message}`)
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
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your workspace...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Oops! Something went wrong 😅</h2>
        <p>{error}</p>
        <p>Make sure your server is running at {API_BASE_URL}</p>
        <button onClick={fetchBoardData} className="btn btn-primary">
          Try Again
        </button>
      </div>
    )
  }

  if (!filteredBoardData) {
    return (
      <div className="error-screen">
        <p>No data found</p>
      </div>
    )
  }

  const allTasks = filteredBoardData.columns.flatMap(column => column.tasks)
  const totalTasks = allTasks.length

  return (
    <div className="app">
      <div className="workspace">
        <header className="header">
          <div className="header-content">
            <h1 className="workspace-title">
              <span className="title-icon">🚀</span>
              {filteredBoardData.name}
            </h1>
            <p className="workspace-subtitle">
              {totalTasks === 0 ? 'Ready to start!' : 
               totalTasks === 1 ? '1 task to manage' : 
               `${totalTasks} tasks to manage`}
            </p>
          </div>
          
          <div className="header-actions">
            <div className="filter-section">
              <label htmlFor="filter">Show:</label>
              <select
                id="filter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="filter-dropdown"
              >
                <option value="All">All tasks</option>
                <option value="High">🔴 High priority</option>
                <option value="Median">🟡 Medium priority</option>
                <option value="Low">🟢 Low priority</option>
              </select>
            </div>
            
            <button onClick={handleCreateTask} className="btn btn-primary btn-create">
              + New Task
            </button>
          </div>
        </header>

        <main className="board-container">
          <div className="kanban-board">
            {filteredBoardData.columns.map((column, index) => (
              <Column
                key={column.id}
                column={column}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onMove={handleMoveTask}
                columns={boardData.columns}
              />
            ))}
          </div>
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