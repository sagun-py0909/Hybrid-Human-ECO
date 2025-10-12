import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import './Pages.css'

const Reports = () => {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [reportTitle, setReportTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data.filter(u => u.role === 'user'))
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      if (!reportTitle) {
        setReportTitle(file.name.replace('.pdf', ''))
      }
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedUser || !selectedFile || !reportTitle) {
      alert('Please fill all fields')
      return
    }

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1]
        await api.post('/admin/reports/upload', {
          userId: selectedUser,
          title: reportTitle,
          reportType: 'PDF Report',
          pdfData: base64
        })
        alert('Report uploaded successfully')
        setSelectedUser('')
        setReportTitle('')
        setSelectedFile(null)
        document.getElementById('fileInput').value = ''
      }
      reader.readAsDataURL(selectedFile)
    } catch (error) {
      console.error('Error uploading report:', error)
      alert('Failed to upload report')
    } finally {
      setIsUploading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Reports Management</h1>
        <p className="page-subtitle">Upload PDF reports for users</p>
      </div>

      <div className="card">
        <form onSubmit={handleUpload}>
          <div className="input-group">
            <label>Select PDF File *</label>
            <input id="fileInput" type="file" accept="application/pdf" onChange={handleFileSelect} required />
            {selectedFile && (
              <p style={{color: '#8FBC8F', marginTop: '8px', fontSize: '14px'}}>
                📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="input-group">
            <label>Report Title *</label>
            <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="Enter report title" required />
          </div>

          <div className="input-group">
            <label>Assign to User *</label>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #2A2A2A', borderRadius: '8px', marginTop: '8px'}}>
              {filteredUsers.map(user => (
                <div
                  key={user._id}
                  onClick={() => setSelectedUser(user._id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedUser === user._id ? '#556B2F30' : 'transparent',
                    borderBottom: '1px solid #2A2A2A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#556B2F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {user.fullName.charAt(0)}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{color: '#E8E8E8', fontWeight: '600'}}>{user.fullName}</div>
                    <div style={{color: '#999', fontSize: '13px'}}>{user.email}</div>
                  </div>
                  {selectedUser === user._id && <span style={{color: '#8FBC8F'}}>✓</span>}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isUploading} style={{width: '100%', marginTop: '16px'}}>
            {isUploading ? 'Uploading...' : '📤 Upload Report'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Reports
