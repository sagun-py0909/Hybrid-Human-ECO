import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './Pages.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const Users = () => {
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDevicesModal, setShowDevicesModal] = useState(false)
  const [showModeModal, setShowModeModal] = useState(false)
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
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/products`, { headers })
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/users-with-mode`, { headers })
      setUsers(response.data.users)
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async () => {
    if (!createFormData.username || !createFormData.email || !createFormData.fullName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/admin/users/create`, createFormData, { headers });
      alert('User created successfully! Default password: Welcome@123');
      setShowCreateModal(false);
      setCreateFormData({
        username: '',
        email: '',
        fullName: '',
        phone: '',
        password: 'Welcome@123',
        role: 'user',
        devices: []
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const toggleUserMode = async (user) => {
    const newMode = user.mode === 'onboarding' ? 'unlocked' : 'onboarding';
    const confirmMessage = newMode === 'unlocked' 
      ? `Unlock ${user.fullName}? This will give them full access to their program.`
      : `Switch ${user.fullName} back to onboarding mode?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/admin/user/${user._id}/mode`, { mode: newMode }, { headers });
      alert(`User mode updated to ${newMode}!`);
      loadUsers();
    } catch (error) {
      console.error('Error updating mode:', error);
      alert('Failed to update user mode');
    }
  };

  const openDevicesModal = (user) => {
    setSelectedUser(user);
    setSelectedDevices(user.devices || []);
    setShowDevicesModal(true);
  };

  const assignDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${API_URL}/admin/users/${selectedUser._id}/devices`,
        { devices: selectedDevices },
        { headers }
      );
      alert('Devices assigned successfully!');
      setShowDevicesModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error assigning devices:', error);
      alert('Failed to assign devices');
    }
  };

  const viewProgress = async (user) => {
    setSelectedUser(user)
    setShowProgressModal(true)
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/user/${user._id}/progress`, { headers })
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
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/admin/users/${userId}/role`, { role: newRole }, { headers })
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
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/admin/users/${userId}`, { headers })
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Users Management</h1>
          <p className="page-subtitle">Manage user accounts, modes, and devices</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          ➕ Create User
        </button>
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

      <div className="data-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Mode</th>
                <th>Role</th>
                <th>Devices</th>
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
                    <span className={`badge ${user.mode === 'onboarding' ? 'warning' : 'success'}`}>
                      {user.mode === 'onboarding' ? '🚀 Onboarding' : '✅ Unlocked'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'warning' : 'info'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.devices?.length || 0} devices</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }} 
                        onClick={() => toggleUserMode(user)}
                      >
                        {user.mode === 'onboarding' ? '🔓 Unlock' : '🔒 Lock'}
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }} 
                        onClick={() => openDevicesModal(user)}
                      >
                        📦 Devices
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }} 
                        onClick={() => viewProgress(user)}
                      >
                        📊 Progress
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '12px' }} 
                        onClick={() => deleteUser(user._id, user.fullName)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New User</h2>
            
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                className="form-control"
                placeholder="johndoe"
                value={createFormData.username}
                onChange={(e) => setCreateFormData({...createFormData, username: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="John Doe"
                value={createFormData.fullName}
                onChange={(e) => setCreateFormData({...createFormData, fullName: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                className="form-control"
                placeholder="john@example.com"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                className="form-control"
                placeholder="+1234567890"
                value={createFormData.phone}
                onChange={(e) => setCreateFormData({...createFormData, phone: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Default Password</label>
              <input
                type="text"
                className="form-control"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
              />
              <small style={{ color: '#888' }}>User will be created with this password</small>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                className="form-control"
                value={createFormData.role}
                onChange={(e) => setCreateFormData({...createFormData, role: e.target.value})}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={createUser} className="btn btn-primary">Create User</button>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Devices Modal */}
      {showDevicesModal && (
        <div className="modal-overlay" onClick={() => setShowDevicesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Assign Devices - {selectedUser?.fullName}</h2>
            
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Select devices to assign to this user
            </p>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {products.map((product) => (
                <div key={product._id} style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #2A2A2A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(product.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDevices([...selectedDevices, product.name]);
                      } else {
                        setSelectedDevices(selectedDevices.filter(d => d !== product.name));
                      }
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#E8E8E8' }}>{product.name}</strong>
                    <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>{product.category}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={assignDevices} className="btn btn-primary">Save Devices</button>
              <button onClick={() => setShowDevicesModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>User Progress - {selectedUser?.fullName}</h2>
            
            {userProgress ? (
              <>
                <div className="stats-grid" style={{ marginTop: '20px' }}>
                  <div className="stat-card">
                    <h3>{userProgress.stats.completionRate}%</h3>
                    <p>Completion Rate</p>
                  </div>
                  <div className="stat-card">
                    <h3>{userProgress.stats.currentStreak}</h3>
                    <p>Day Streak</p>
                  </div>
                  <div className="stat-card">
                    <h3>{userProgress.stats.completedTasks}/{userProgress.stats.totalTasks}</h3>
                    <p>Tasks Done</p>
                  </div>
                </div>
                
                <h3 style={{marginTop: '24px', marginBottom: '16px', color: '#E8E8E8'}}>Task History (Last 20)</h3>
                <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
                  <table className="data-table">
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
                            <span className={`badge ${task.completed ? 'success' : 'warning'}`}>
                              {task.completed ? 'Completed' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" onClick={exportUserData}>📥 Export CSV</button>
                  <button className="btn btn-secondary" onClick={() => setShowProgressModal(false)}>Close</button>
                </div>
              </>
            ) : (
              <div className="loading">Loading progress...</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Users

