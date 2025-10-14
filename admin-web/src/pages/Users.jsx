import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import './Pages.css'

const Users = () => {
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDevicesModal, setShowDevicesModal] = useState(false)
  const [userProgress, setUserProgress] = useState(null)
  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    password: 'Welcome@123',
    role: 'user',
    devices: []
  })
  const [selectedDevices, setSelectedDevices] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([loadUsers(), loadProducts()])
  }

  const loadProducts = async () => {
    try {
      const response = await api.get('/admin/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const viewProgress = async (user) => {
    setSelectedUser(user)
    setShowProgressModal(true)
    try {
      const response = await api.get(`/admin/user/${user._id}/progress`)
      setUserProgress(response.data)
    } catch (error) {
      console.error('Error loading progress:', error)
      alert('Failed to load user progress')
    }
  }

  const exportUserData = () => {
    if (!userProgress) return
    
    const csvData = [
      ['Date', 'Program', 'Task', 'Device', 'Duration', 'Completed'],
      ...userProgress.taskHistory.map(task => [
        task.date,
        task.programTitle,
        task.taskTitle,
        task.deviceType,
        task.duration,
        task.completed ? 'Yes' : 'No'
      ])
    ]
    
    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedUser.fullName}_progress.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    alert('Data exported successfully')
  }

  const updateRole = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return
    
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      alert('Role updated successfully')
      loadUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role')
    }
  }

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user ${userName}? This cannot be undone.`)) return
    
    try {
      await api.delete(`/admin/users/${userId}`)
      alert('User deleted successfully')
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const filteredUsers = users.filter(user =>
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <div className="loading">Loading users...</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Users Management</h1>
        <p className="page-subtitle">Manage user accounts and track progress</p>
      </div>

      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td><strong>{user.fullName}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-secondary" style={{marginRight: '8px', padding: '6px 12px'}} onClick={() => viewProgress(user)}>
                      📊 Progress
                    </button>
                    <button className="btn btn-secondary" style={{marginRight: '8px', padding: '6px 12px'}} onClick={() => updateRole(user._id, user.role === 'admin' ? 'user' : 'admin')}>
                      🔄 Role
                    </button>
                    <button className="btn btn-danger" style={{padding: '6px 12px'}} onClick={() => deleteUser(user._id, user.fullName)}>
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showProgressModal && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">User Progress - {selectedUser?.fullName}</h2>
              <button className="modal-close" onClick={() => setShowProgressModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {userProgress ? (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{userProgress.stats.completionRate}%</div>
                      <div className="stat-label">Completion Rate</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{userProgress.stats.currentStreak}</div>
                      <div className="stat-label">Day Streak</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{userProgress.stats.completedTasks}/{userProgress.stats.totalTasks}</div>
                      <div className="stat-label">Tasks Done</div>
                    </div>
                  </div>
                  <h3 style={{marginTop: '24px', marginBottom: '16px', color: '#E8E8E8'}}>Task History (Last 20)</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Task</th>
                          <th>Device</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProgress.taskHistory.slice(0, 20).map((task, idx) => (
                          <tr key={idx}>
                            <td>{task.date}</td>
                            <td>{task.taskTitle}</td>
                            <td>{task.deviceType}</td>
                            <td>
                              <span className={`badge ${task.completed ? 'badge-success' : 'badge-warning'}`}>
                                {task.completed ? 'Completed' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="loading">Loading progress...</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={exportUserData}>📥 Export CSV</button>
              <button className="btn btn-secondary" onClick={() => setShowProgressModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
