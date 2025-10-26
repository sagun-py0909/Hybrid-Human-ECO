import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './Pages.css';

export default function Onboarding() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [shipmentTracking, setShipmentTracking] = useState(null);
  const [dnaTracking, setDnaTracking] = useState(null);
  const [lifecycleForm, setLifecycleForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'shipment', 'dna', 'form'

  // New stage form
  const [newStage, setNewStage] = useState({
    stage: '',
    note: '',
    eta: '',
    labName: '',
    adminNotes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/onboarding-stats'),
        api.get('/admin/users-with-mode'),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users.filter(u => u.mode === 'onboarding'));
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (user) => {
    try {
      const [shipmentRes, dnaRes, formRes] = await Promise.all([
        api.get(`/admin/shipment-tracking/${user._id}`),
        api.get(`/admin/dna-tracking/${user._id}`),
        api.get(`/admin/lifecycle-form/${user._id}`),
      ]);

      setShipmentTracking(shipmentRes.data);
      setDnaTracking(dnaRes.data);
      setLifecycleForm(formRes.data.lifecycleForm);
      setSelectedUser(user);
    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Failed to load user details');
    }
  };

  const updateShipmentStage = async () => {
    if (!newStage.stage || !selectedUser) return;

    try {
      await api.put(
        `/admin/shipment-tracking/${selectedUser._id}`,
        {
          stage: newStage.stage,
          note: newStage.note,
          eta: newStage.eta || null,
        }
      );

      alert('Shipment stage updated successfully!');
      setShowModal(false);
      setNewStage({ stage: '', note: '', eta: '', labName: '', adminNotes: '' });
      loadUserDetails(selectedUser);
      loadData();
    } catch (error) {
      console.error('Error updating shipment:', error);
      alert('Failed to update shipment stage');
    }
  };

  const updateDNAStage = async () => {
    if (!newStage.stage || !selectedUser) return;

    try {
      await api.put(
        `/admin/dna-tracking/${selectedUser._id}`,
        {
          stage: newStage.stage,
          labName: newStage.labName || null,
          adminNotes: newStage.adminNotes || null,
        }
      );

      alert('DNA stage updated successfully!');
      setShowModal(false);
      setNewStage({ stage: '', note: '', eta: '', labName: '', adminNotes: '' });
      loadUserDetails(selectedUser);
      loadData();
    } catch (error) {
      console.error('Error updating DNA:', error);
      alert('Failed to update DNA stage');
    }
  };

  const unlockUser = async (userId) => {
    if (!confirm('Are you sure you want to unlock this user and activate their program?')) {
      return;
    }

    try {
      await api.put(
        `/admin/user/${userId}/mode`,
        { mode: 'unlocked' }
      );

      alert('User unlocked successfully! They now have full access to their program.');
      loadData();
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error unlocking user:', error);
      alert('Failed to unlock user');
    }
  };

  const formatStageName = (stage) => {
    return stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Onboarding Management</h1>
        <p>Monitor and manage user onboarding process</p>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats?.totalUsers || 0}</p>
        </div>
        <div className="stat-card onboarding">
          <h3>In Onboarding</h3>
          <p className="stat-value">{stats?.onboardingUsers || 0}</p>
        </div>
        <div className="stat-card success">
          <h3>Unlocked</h3>
          <p className="stat-value">{stats?.unlockedUsers || 0}</p>
        </div>
        <div className="stat-card warning">
          <h3>Active Tickets</h3>
          <p className="stat-value">{stats?.activeTickets || 0}</p>
        </div>
      </div>

      {/* Shipment & DNA Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div className="data-card">
          <h3>Shipment Stages</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {stats?.shipmentStages && Object.entries(stats.shipmentStages).map(([stage, count]) => (
              <li key={stage} style={{ padding: '8px 0', borderBottom: '1px solid #E0D5C0' }}>
                <strong>{formatStageName(stage)}:</strong> {count}
              </li>
            ))}
          </ul>
        </div>
        <div className="data-card">
          <h3>DNA Analysis Stages</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {stats?.dnaStages && Object.entries(stats.dnaStages).map(([stage, count]) => (
              <li key={stage} style={{ padding: '8px 0', borderBottom: '1px solid #E0D5C0' }}>
                <strong>{formatStageName(stage)}:</strong> {count}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Onboarding Users List */}
      <div className="data-card">
        <h2>Users in Onboarding ({users.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Started</th>
                <th>Form Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.onboardingStartDate ? new Date(user.onboardingStartDate).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <span className={`badge ${user.lifecycleForm ? 'success' : 'warning'}`}>
                      {user.lifecycleForm ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => loadUserDetails(user)}
                      className="btn btn-secondary"
                      style={{ marginRight: '8px' }}
                    >
                      Manage
                    </button>
                    <button 
                      onClick={() => unlockUser(user._id)}
                      className="btn btn-primary"
                    >
                      Unlock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Panel */}
      {selectedUser && (
        <div className="data-card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>{selectedUser.fullName} - Onboarding Details</h2>
            <button onClick={() => setSelectedUser(null)} className="btn btn-secondary">Close</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            {/* Shipment Tracking */}
            <div>
              <h3>Shipment Tracking</h3>
              <p><strong>Current Stage:</strong> {formatStageName(shipmentTracking?.currentStage || 'N/A')}</p>
              <button 
                onClick={() => { setModalType('shipment'); setShowModal(true); }}
                className="btn btn-primary"
                style={{ marginBottom: '12px' }}
              >
                Update Stage
              </button>
              <div style={{ fontSize: '14px' }}>
                {shipmentTracking?.stages?.map((stage, idx) => (
                  <div key={idx} style={{ padding: '8px', borderLeft: '3px solid #556B2F', marginBottom: '8px', paddingLeft: '12px' }}>
                    <strong>{formatStageName(stage.stage)}</strong>
                    <p style={{ margin: '4px 0', color: '#666' }}>{stage.note}</p>
                    {stage.eta && <p style={{ margin: 0, fontSize: '12px', color: '#556B2F' }}>ETA: {stage.eta}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* DNA Tracking */}
            <div>
              <h3>DNA Collection</h3>
              <p><strong>Current Stage:</strong> {formatStageName(dnaTracking?.currentStage || 'N/A')}</p>
              <button 
                onClick={() => { setModalType('dna'); setShowModal(true); }}
                className="btn btn-primary"
                style={{ marginBottom: '12px' }}
              >
                Update Stage
              </button>
              <div style={{ fontSize: '14px' }}>
                {dnaTracking?.stages?.map((stage, idx) => (
                  <div key={idx} style={{ padding: '8px', borderLeft: '3px solid #556B2F', marginBottom: '8px', paddingLeft: '12px' }}>
                    <strong>{formatStageName(stage.stage)}</strong>
                    {stage.labName && <p style={{ margin: '4px 0', color: '#666' }}>Lab: {stage.labName}</p>}
                    {stage.adminNotes && <p style={{ margin: '4px 0', color: '#666' }}>{stage.adminNotes}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Lifecycle Form */}
            <div>
              <h3>Lifecycle Form</h3>
              {lifecycleForm ? (
                <div style={{ fontSize: '14px' }}>
                  <button 
                    onClick={() => { setModalType('form'); setShowModal(true); }}
                    className="btn btn-secondary"
                    style={{ marginBottom: '12px' }}
                  >
                    View Full Form
                  </button>
                  <p><strong>Age:</strong> {lifecycleForm.step1?.age}</p>
                  <p><strong>Gender:</strong> {lifecycleForm.step1?.gender}</p>
                  <p><strong>Fitness:</strong> {lifecycleForm.step2?.fitnessLevel}</p>
                  <p><strong>Diet:</strong> {lifecycleForm.step3?.dietType}</p>
                </div>
              ) : (
                <p style={{ color: '#888' }}>Form not yet completed</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for updating stages */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>
              {modalType === 'shipment' && 'Update Shipment Stage'}
              {modalType === 'dna' && 'Update DNA Stage'}
              {modalType === 'form' && 'Lifecycle Form Details'}
            </h2>

            {modalType === 'shipment' && (
              <div className="form-group">
                <label>Stage:</label>
                <select 
                  value={newStage.stage} 
                  onChange={(e) => setNewStage({...newStage, stage: e.target.value})}
                  className="form-control"
                >
                  <option value="">Select Stage</option>
                  <option value="ordered">Ordered</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="installed">Installed</option>
                </select>

                <label>Note:</label>
                <textarea
                  value={newStage.note}
                  onChange={(e) => setNewStage({...newStage, note: e.target.value})}
                  className="form-control"
                  placeholder="Add a note..."
                />

                <label>ETA (optional):</label>
                <input
                  type="date"
                  value={newStage.eta}
                  onChange={(e) => setNewStage({...newStage, eta: e.target.value})}
                  className="form-control"
                />

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button onClick={updateShipmentStage} className="btn btn-primary">Update</button>
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            {modalType === 'dna' && (
              <div className="form-group">
                <label>Stage:</label>
                <select 
                  value={newStage.stage} 
                  onChange={(e) => setNewStage({...newStage, stage: e.target.value})}
                  className="form-control"
                >
                  <option value="">Select Stage</option>
                  <option value="collection_scheduled">Collection Scheduled</option>
                  <option value="sample_collected">Sample Collected</option>
                  <option value="analysis_in_progress">Analysis in Progress</option>
                  <option value="report_ready">Report Ready</option>
                </select>

                <label>Lab Name (optional):</label>
                <input
                  type="text"
                  value={newStage.labName}
                  onChange={(e) => setNewStage({...newStage, labName: e.target.value})}
                  className="form-control"
                  placeholder="e.g., Hybrid Human Genomics Lab"
                />

                <label>Admin Notes (optional):</label>
                <textarea
                  value={newStage.adminNotes}
                  onChange={(e) => setNewStage({...newStage, adminNotes: e.target.value})}
                  className="form-control"
                  placeholder="Add notes for the user..."
                />

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button onClick={updateDNAStage} className="btn btn-primary">Update</button>
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            {modalType === 'form' && lifecycleForm && (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <h3>Step 1: Basic Info</h3>
                <p><strong>Name:</strong> {lifecycleForm.step1?.name}</p>
                <p><strong>Age:</strong> {lifecycleForm.step1?.age}</p>
                <p><strong>Gender:</strong> {lifecycleForm.step1?.gender}</p>
                <p><strong>Height:</strong> {lifecycleForm.step1?.height} cm</p>
                <p><strong>Weight:</strong> {lifecycleForm.step1?.weight} kg</p>
                <p><strong>Email:</strong> {lifecycleForm.step1?.email}</p>
                <p><strong>Phone:</strong> {lifecycleForm.step1?.phone}</p>

                <h3>Step 2: Lifestyle</h3>
                <p><strong>Sleep Hours:</strong> {lifecycleForm.step2?.sleepHours}</p>
                <p><strong>Sleep Quality:</strong> {lifecycleForm.step2?.sleepQuality}/5</p>
                <p><strong>Sleep Issues:</strong> {lifecycleForm.step2?.sleepIssues || 'None'}</p>
                <p><strong>Stress Level:</strong> {lifecycleForm.step2?.stressLevel}/5</p>
                <p><strong>Fitness Level:</strong> {lifecycleForm.step2?.fitnessLevel}</p>

                <h3>Step 3: Nutrition</h3>
                <p><strong>Diet Type:</strong> {lifecycleForm.step3?.dietType}</p>
                <p><strong>Allergies:</strong> {lifecycleForm.step3?.allergies || 'None'}</p>
                <p><strong>Supplements:</strong> {lifecycleForm.step3?.supplementUse || 'None'}</p>
                <p><strong>Hydration:</strong> {lifecycleForm.step3?.hydrationLevel}</p>

                <h3>Step 4: Medical</h3>
                <p><strong>Conditions:</strong> {lifecycleForm.step4?.conditions || 'None'}</p>
                <p><strong>Medications:</strong> {lifecycleForm.step4?.medications || 'None'}</p>
                <p><strong>Family History:</strong> {lifecycleForm.step4?.familyHistory || 'None'}</p>
                <p><strong>Health Goals:</strong> {lifecycleForm.step4?.healthGoals}</p>

                <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ marginTop: '20px' }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
