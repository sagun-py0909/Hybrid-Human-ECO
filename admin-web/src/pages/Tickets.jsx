import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import './Pages.css'

const Tickets = () => {
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      const response = await api.get('/admin/tickets')
      setTickets(response.data)
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (ticketId, newStatus) => {
    try {
      await api.put(`/admin/tickets/${ticketId}/status`, { status: newStatus })
      alert('Ticket status updated')
      loadTickets()
    } catch (error) {
      console.error('Error updating ticket:', error)
      alert('Failed to update ticket')
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true
    return ticket.status === filter
  })

  const getStatusBadge = (status) => {
    const badges = {
      open: 'badge-danger',
      in_progress: 'badge-warning',
      resolved: 'badge-success'
    }
    return badges[status] || 'badge-info'
  }

  const getTypeBadge = (type) => {
    return type === 'machine' ? 'badge-warning' : 'badge-info'
  }

  if (isLoading) {
    return <div className="loading">Loading tickets...</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Tickets Management</h1>
        <p className="page-subtitle">Handle support tickets from users</p>
      </div>

      <div style={{display: 'flex', gap: '12px', marginBottom: '24px'}}>
        <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All ({tickets.length})</button>
        <button className={`btn ${filter === 'open' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('open')}>Open ({tickets.filter(t => t.status === 'open').length})</button>
        <button className={`btn ${filter === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('in_progress')}>In Progress ({tickets.filter(t => t.status === 'in_progress').length})</button>
        <button className={`btn ${filter === 'resolved' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('resolved')}>Resolved ({tickets.filter(t => t.status === 'resolved').length})</button>
      </div>

      {filteredTickets.length > 0 ? (
        <div style={{display: 'grid', gap: '16px'}}>
          {filteredTickets.map((ticket) => (
            <div key={ticket._id} className="card">
              <div style={{marginBottom: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px'}}>
                  <div>
                    <h3 style={{color: '#E8E8E8', fontSize: '18px', marginBottom: '8px'}}>{ticket.subject}</h3>
                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                      <span className={`badge ${getTypeBadge(ticket.type)}`}>{ticket.type}</span>
                      <span className={`badge ${getStatusBadge(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span>
                      <span style={{color: '#666', fontSize: '13px'}}>• {new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <p style={{color: '#CCC', marginBottom: '12px'}}>{ticket.description}</p>
                <div style={{color: '#999', fontSize: '14px', marginBottom: '16px'}}>
                  👤 {ticket.userName || 'Unknown User'}
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  {ticket.status !== 'in_progress' && (
                    <button className="btn btn-secondary" onClick={() => updateStatus(ticket._id, 'in_progress')}>🔄 In Progress</button>
                  )}
                  {ticket.status !== 'resolved' && (
                    <button className="btn btn-primary" onClick={() => updateStatus(ticket._id, 'resolved')}>✓ Resolve</button>
                  )}
                  {ticket.status === 'resolved' && (
                    <button className="btn btn-secondary" onClick={() => updateStatus(ticket._id, 'open')}>↻ Reopen</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎫</div>
          <p className="empty-state-text">No tickets found</p>
        </div>
      )}
    </div>
  )
}

export default Tickets
