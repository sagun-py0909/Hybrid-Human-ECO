import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import './Pages.css'

const Programs = () => {
  const [templates, setTemplates] = useState([])
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    weeks: 4,
    userIds: [],
    tasks: []
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [templatesRes, usersRes] = await Promise.all([
        api.get('/admin/templates'),
        api.get('/admin/users')
      ])
      setTemplates(templatesRes.data)
      setUsers(usersRes.data.filter(u => u.role === 'user'))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const useTemplate = (template) => {
    setFormData({
      ...formData,
      title: template.name,
      description: template.description,
      tasks: template.tasks.map(t => ({...t, taskId: Math.random().toString(36).substr(2, 9)}))
    })
    setShowModal(true)
  }

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, {
        taskId: Math.random().toString(36).substr(2, 9),
        title: '',
        description: '',
        deviceType: 'Cryotherapy Chamber',
        duration: '3 minutes'
      }]
    })
  }

  const removeTask = (index) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index)
    })
  }

  const updateTask = (index, field, value) => {
    const newTasks = [...formData.tasks]
    newTasks[index][field] = value
    setFormData({...formData, tasks: newTasks})
  }

  const toggleUser = (userId) => {
    setFormData({
      ...formData,
      userIds: formData.userIds.includes(userId)
        ? formData.userIds.filter(id => id !== userId)
        : [...formData.userIds, userId]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.userIds.length || !formData.tasks.length || !formData.startDate) {
      alert('Please fill all required fields')
      return
    }

    try {
      await api.post('/admin/programs/bulk', formData)
      alert(`Successfully created programs for ${formData.userIds.length} users over ${formData.weeks} weeks`)
      setShowModal(false)
      setFormData({ title: '', description: '', startDate: '', weeks: 4, userIds: [], tasks: [] })
    } catch (error) {
      console.error('Error creating programs:', error)
      alert('Failed to create programs')
    }
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Programs Management</h1>
        <p className="page-subtitle">Create and assign wellness programs</p>
      </div>

      <button className="btn btn-primary" style={{marginBottom: '24px'}} onClick={() => setShowModal(true)}>
        ➕ Create Custom Program
      </button>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Program Templates</h2>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px'}}>
          {templates.map((template, idx) => (
            <div key={idx} style={{background: '#0A0A0A', padding: '20px', borderRadius: '12px', border: '1px solid #2A2A2A'}}>
              <h3 style={{color: '#8FBC8F', marginBottom: '8px'}}>{template.name}</h3>
              <p style={{color: '#999', fontSize: '14px', marginBottom: '12px'}}>{template.description}</p>
              <p style={{color: '#666', fontSize: '13px', marginBottom: '16px'}}>{template.tasks.length} tasks per day</p>
              <button className="btn btn-secondary" onClick={() => useTemplate(template)}>Use Template</button>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px'}}>
            <div className="modal-header">
              <h2 className="modal-title">Create Program</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Program Title *</label>
                  <input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Description *</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} required />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div className="input-group">
                    <label>Start Date * (YYYY-MM-DD)</label>
                    <input type="text" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} placeholder="2025-10-15" required />
                  </div>
                  <div className="input-group">
                    <label>Duration *</label>
                    <div style={{display: 'flex', gap: '8px'}}>
                      {[1, 4, 8, 12].map(w => (
                        <button key={w} type="button" className={`btn ${formData.weeks === w ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFormData({...formData, weeks: w})}>
                          {w}w
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <h3 style={{color: '#E8E8E8', marginTop: '24px', marginBottom: '16px'}}>Daily Tasks</h3>
                {formData.tasks.map((task, idx) => (
                  <div key={idx} style={{background: '#0A0A0A', padding: '16px', borderRadius: '8px', marginBottom: '12px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
                      <strong style={{color: '#8FBC8F'}}>Task {idx + 1}</strong>
                      <button type="button" onClick={() => removeTask(idx)} style={{background: 'none', border: 'none', color: '#FF6B35', cursor: 'pointer'}}>×</button>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                      <input placeholder="Task title" value={task.title} onChange={(e) => updateTask(idx, 'title', e.target.value)} required />
                      <input placeholder="Device type" value={task.deviceType} onChange={(e) => updateTask(idx, 'deviceType', e.target.value)} required />
                    </div>
                    <input placeholder="Description" value={task.description} onChange={(e) => updateTask(idx, 'description', e.target.value)} style={{marginTop: '8px'}} required />
                    <input placeholder="Duration (e.g., 3 minutes)" value={task.duration} onChange={(e) => updateTask(idx, 'duration', e.target.value)} style={{marginTop: '8px'}} required />
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addTask} style={{width: '100%'}}>➕ Add Task</button>
                
                <h3 style={{color: '#E8E8E8', marginTop: '24px', marginBottom: '16px'}}>Assign to Users ({formData.userIds.length} selected)</h3>
                <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                  {users.map(user => (
                    <div key={user._id} style={{display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer'}} onClick={() => toggleUser(user._id)}>
                      <input type="checkbox" checked={formData.userIds.includes(user._id)} onChange={() => {}} style={{marginRight: '12px'}} />
                      <div>
                        <div style={{color: '#E8E8E8'}}>{user.fullName}</div>
                        <div style={{color: '#666', fontSize: '13px'}}>{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">Create Program</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Programs
