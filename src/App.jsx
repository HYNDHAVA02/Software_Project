import React, { useState } from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { Auth } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import './App.css';

function App({ signOut, user }) {
  const [form, setForm] = useState({ name: '', age: '', gender: '', phoneNumber: '', language: '', reportUrl: '' });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  const updateForm = (key, value) => setForm({ ...form, [key]: value });

  const submitPatient = async () => {
    if (form.phoneNumber.length !== 10) {
      alert("Phone Number must be exactly 10 digits!");
      return;
    }
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();

      const response = await fetch('https://asu0kcdiyk.execute-api.us-east-1.amazonaws.com/prod/patient', {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const result = await response.json();
      if (response.ok) {
        alert(result.message || 'Patient saved successfully!');
        setForm({ name: '', age: '', gender: '', phoneNumber: '', language: '', reportUrl: '' });
        fetchPatients();
      } else {
        alert(result.error || 'Failed to save patient.');
      }
    } catch (err) {
      console.error("Error submitting patient info:", err);
      alert('Error submitting patient info');
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      const labId = user?.attributes?.email;

      const response = await fetch(`https://asu0kcdiyk.execute-api.us-east-1.amazonaws.com/prod/patient?labId=${encodeURIComponent(labId)}`, {
        method: 'GET',
        headers: { 'Authorization': token }
      });

      const result = await response.json();
      if (response.ok) {
        setPatients(typeof result === 'string' ? JSON.parse(result) : result);
      } else {
        alert(result.error || 'Failed to fetch patients.');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      alert('Error fetching patients');
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;

    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      const labId = user.attributes.email;

      const response = await fetch(`https://asu0kcdiyk.execute-api.us-east-1.amazonaws.com/prod/patient/${patientId}?labId=${encodeURIComponent(labId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });

      if (response.ok) {
        alert('Patient deleted successfully');
        fetchPatients();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete patient');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Error deleting patient');
    }
  };

  const updateStatus = async (patientId, newStatus) => {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      const labId = user.attributes.email;

      await fetch(`https://asu0kcdiyk.execute-api.us-east-1.amazonaws.com/prod/patient/${patientId}?labId=${encodeURIComponent(labId)}`, {
        method: 'PUT',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchPatients();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error updating status');
    }
  };

  const uploadReport = async (patientId) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.jpg,.jpeg,.png';
    fileInput.click();

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64File = reader.result.split(',')[1];
        try {
          const session = await Auth.currentSession();
          const token = session.getIdToken().getJwtToken();
          const labId = user.attributes.email;
          const key = `reports/${labId}/${patientId}.pdf`;

          await fetch('https://asu0kcdiyk.execute-api.us-east-1.amazonaws.com/prod/uploadReport', {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileContent: base64File, filename: key, patientId, labId })
          });

          fetchPatients();
        } catch (err) {
          console.error('Error uploading report:', err);
          alert('Error uploading report');
        }
      };
      reader.readAsDataURL(file);
    };
  };

  return (
    <div className="container">
      <h1>Welcome, {user?.attributes?.email}</h1>
      <div className="form">
        <input placeholder="Patient Name" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
        <input placeholder="Patient Age" type="number" value={form.age} onChange={(e) => updateForm('age', e.target.value)} />
        <input placeholder="Patient Gender" value={form.gender} onChange={(e) => updateForm('gender', e.target.value)} />
        <input placeholder="Phone Number" value={form.phoneNumber} maxLength={10} onChange={(e) => { const value = e.target.value; if (/^\d*$/.test(value)) updateForm('phoneNumber', value); }} />
        <input placeholder="Language (e.g., en, hi, te)" value={form.language} onChange={(e) => updateForm('language', e.target.value)} />
        <input placeholder="Report URL (optional)" value={form.reportUrl} onChange={(e) => updateForm('reportUrl', e.target.value)} />
        <div className="buttons">
          <button onClick={submitPatient}>Save Patient</button>
          <button onClick={fetchPatients}>Fetch Patients</button>
          <button onClick={signOut}>Sign Out</button>
        </div>
      </div>

      <h2>Patient Records</h2>
      {loading ? <p>Loading...</p> : patients.length === 0 ? <p>No patients found.</p> : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Phone</th>
              <th>Language</th>
              <th>Status</th>
              <th>Report</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.patientId}>
                <td>{p.name}</td>
                <td>{p.age}</td>
                <td>{p.gender}</td>
                <td>{p.phoneNumber || 'N/A'}</td>
                <td>{p.language || 'N/A'}</td>
                <td>
                  <select value={p.status} onChange={(e) => updateStatus(p.patientId, e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </td>
                <td>
                  {p.reportUrl ? <a href={p.reportUrl} target="_blank" rel="noreferrer">View</a> : 'No report'}
                </td>
                <td>
                  <button onClick={() => deletePatient(p.patientId)}>Delete</button>
                  <button onClick={() => uploadReport(p.patientId)}>Upload Report</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default withAuthenticator(App);
