import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import './Pages.css'

const CallRequests = () => {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const response = await api.get('/admin/call-requests')
      setRequests(response.data)
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (requestId, newStatus) => {
    try {
      await api.put(`/admin/call-requests/${requestId}/status`, { status: newStatus })
      alert('Call request status updated')
      loadRequests()
    } catch (error) {
      console.error('Error updating request:', error)
      alert('Failed to update request')
    }
  }

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true
    return req.status === filter
  })

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      scheduled: 'badge-info',
      completed: 'badge-success'
    }
    return badges[status] || 'badge-info'
  }

  const getTypeBadge = (type) => {
    return type === 'test' ? 'badge-info' : 'badge-success'
  }

  if (isLoading) {
    return <div className="loading">Loading call requests...</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Call Requests</h1>
        <p className="page-subtitle">Manage scheduled calls and test appointments</p>
      </div>

      <div style={{display: 'flex', gap: '12px', marginBottom: '24px'}}>
        <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All ({requests.length})</button>
        <button className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pending')}>Pending ({requests.filter(r => r.status === 'pending').length})</button>
        <button className={`btn ${filter === 'scheduled' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('scheduled')}>Scheduled ({requests.filter(r => r.status === 'scheduled').length})</button>
        <button className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('completed')}>Completed ({requests.filter(r => r.status === 'completed').length})</button>
      </div>

      {filteredRequests.length > 0 ? (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px'}}>
          {filteredRequests.map((request) => (
            <div key={request._id} className="card">
              <div style={{marginBottom: '16px'}}>
                <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                  <span className={`badge ${getTypeBadge(request.requestType)}`}>{request.requestType}</span>
                  <span className={`badge ${getStatusBadge(request.status)}`}>{request.status}</span>
                </div>
                <h3 style={{color: '#E8E8E8', fontSize: '18px', marginBottom: '8px'}}>{request.userName || 'Unknown User'}</h3>
                <div style={{color: '#999', fontSize: '14px', marginBottom: '4px'}}>
                  📧 {request.userEmail}
                </div>
                {request.userPhone && (
                  <div style={{color: '#999', fontSize: '14px', marginBottom: '12px'}}>
                    📞 {request.userPhone}
                  </div>
                )}
                <div style={{background: '#0A0A0A', padding: '12px', borderRadius: '8px', marginBottom: '12px'}}>
                  <div style={{color: '#8FBC8F', fontSize: '13px', marginBottom: '4px'}}>Preferred Schedule</div>
                  <div style={{color: '#E8E8E8'}}>📅 {request.preferredDate}</div>
                  <div style={{color: '#E8E8E8'}}>⏰ {request.preferredTime}</div>
                </div>
                {request.notes && (
                  <p style={{color: '#CCC', fontSize: '14px', marginBottom: '12px', padding: '12px', background: '#0A0A0A', borderRadius: '8px'}}>
                    <strong style={{color: '#8FBC8F', display: 'block', marginBottom: '4px'}}>Notes:</strong>
                    {request.notes}
                  </p>
                )}
                <div style={{color: '#666', fontSize: '13px', marginBottom: '16px'}}>
                  Created: {new Date(request.createdAt).toLocaleString()}
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  {request.status === 'pending' && (
                    <button className="btn btn-primary" onClick={() => updateStatus(request._id, 'scheduled')}>📅 Schedule</button>
                  )}
                  {request.status === 'scheduled' && (
                    <button className="btn btn-primary" onClick={() => updateStatus(request._id, 'completed')}>✓ Complete</button>
                  )}
                  {request.status === 'completed' && (
                    <button className="btn btn-secondary" onClick={() => updateStatus(request._id, 'pending')}>↻ Reopen</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📞</div>
          <p className="empty-state-text">No call requests found</p>
        </div>
      )}
    </div>
  )
}

export default CallRequests
