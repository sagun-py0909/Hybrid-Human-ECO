import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export default function DNACollectionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    scheduledDate: '',
    scheduledTime: '',
    adminNotes: '',
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/dna-collection-requests`, { headers });
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error loading requests:', error);
      alert('Failed to load DNA collection requests');
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (request) => {
    setSelectedRequest(request);
    setStatusUpdate({
      status: request.status || 'pending',
      scheduledDate: request.scheduledDate || '',
      scheduledTime: request.scheduledTime || '',
      adminNotes: request.adminNotes || '',
    });
    setShowModal(true);
  };

  const updateStatus = async () => {
    if (!statusUpdate.status) {
      alert('Please select a status');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(
        `${API_URL}/admin/dna-collection-request/${selectedRequest._id}/status`,
        statusUpdate,
        { headers }
      );

      alert('Request status updated successfully!');
      setShowModal(false);
      loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update request status');
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      'pending': 'warning',
      'scheduled': 'info',
      'completed': 'success',
      'cancelled': 'danger',
    };
    return classes[status] || 'info';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'pending': '⏳',
      'scheduled': '📅',
      'completed': '✅',
      'cancelled': '❌',
    };
    return icons[status] || '❓';
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const scheduledRequests = requests.filter(r => r.status === 'scheduled');
  const completedRequests = requests.filter(r => r.status === 'completed');

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>DNA Collection Requests</h1>
        <p>Manage user DNA sample collection requests and schedule home visits</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card warning">
          <h3>{pendingRequests.length}</h3>
          <p>⏳ Pending Requests</p>
        </div>
        <div className="stat-card info">
          <h3>{scheduledRequests.length}</h3>
          <p>📅 Scheduled</p>
        </div>
        <div className="stat-card success">
          <h3>{completedRequests.length}</h3>
          <p>✅ Completed</p>
        </div>
        <div className="stat-card">
          <h3>{requests.length}</h3>
          <p>📊 Total Requests</p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="data-card">
        <h2 style={{ marginBottom: '20px' }}>All DNA Collection Requests</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>User</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Preferred Date/Time</th>
                <th>Requested On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No DNA collection requests yet
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request._id}>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                        {getStatusIcon(request.status)} {request.status}
                      </span>
                    </td>
                    <td>
                      <strong>{request.fullName}</strong>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div>{request.email}</div>
                        <div style={{ color: '#888' }}>{request.phone}</div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      {request.address}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div>{request.preferredDate}</div>
                        <div style={{ color: '#888' }}>{request.preferredTime}</div>
                      </div>
                    </td>
                    <td>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => openStatusModal(request)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        📋 Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Manage DNA Collection Request</h2>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F0E6D0', 
              borderRadius: '8px', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1A1A1A' }}>User Details</h3>
              <p style={{ margin: '4px 0', color: '#1A1A1A' }}>
                <strong>Name:</strong> {selectedRequest.fullName}
              </p>
              <p style={{ margin: '4px 0', color: '#1A1A1A' }}>
                <strong>Email:</strong> {selectedRequest.email}
              </p>
              <p style={{ margin: '4px 0', color: '#1A1A1A' }}>
                <strong>Phone:</strong> {selectedRequest.phone}
              </p>
              <p style={{ margin: '4px 0', color: '#1A1A1A' }}>
                <strong>Address:</strong> {selectedRequest.address}
              </p>
              <p style={{ margin: '4px 0', color: '#1A1A1A' }}>
                <strong>Preferred:</strong> {selectedRequest.preferredDate} at {selectedRequest.preferredTime}
              </p>
              {selectedRequest.notes && (
                <p style={{ margin: '4px 0', color: '#1A1A1A' }}>
                  <strong>Notes:</strong> {selectedRequest.notes}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select
                className="form-control"
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
              >
                <option value="pending">⏳ Pending</option>
                <option value="scheduled">📅 Scheduled</option>
                <option value="completed">✅ Completed</option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label>Scheduled Date</label>
              <input
                type="date"
                className="form-control"
                value={statusUpdate.scheduledDate}
                onChange={(e) => setStatusUpdate({...statusUpdate, scheduledDate: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Scheduled Time</label>
              <input
                type="time"
                className="form-control"
                value={statusUpdate.scheduledTime}
                onChange={(e) => setStatusUpdate({...statusUpdate, scheduledTime: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Admin Notes</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Add notes for team members..."
                value={statusUpdate.adminNotes}
                onChange={(e) => setStatusUpdate({...statusUpdate, adminNotes: e.target.value})}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={updateStatus} className="btn btn-primary">
                Update Status
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
