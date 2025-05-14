import React, { useState } from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { Auth } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App({ signOut, user }) {
  const [form, setForm] = useState({ name: '', age: '', gender: '', phoneNumber: '', language: '', reportUrl: '' });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  const updateForm = (key, value) => setForm({ ...form, [key]: value });

  const submitPatient = async () => {
    if (form.phoneNumber.length !== 10) {
      toast.error("Phone Number must be exactly 10 digits!");
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
        toast.success(result.message || 'Patient saved successfully!');
        setForm({ name: '', age: '', gender: '', phoneNumber: '', language: '', reportUrl: '' });
        fetchPatients();
      } else {
        toast.error(result.error || 'Failed to save patient.');
      }
    } catch (err) {
      console.error("Error submitting patient info:", err);
      toast.error('Error submitting patient info');
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
        toast.error(result.error || 'Failed to fetch patients.');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      toast.error('Error fetching patients');
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async (patientId) => {
    const confirmed = window.confirm('Are you sure you want to delete this patient?');
    if (!confirmed) return;

    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      const labId = user.attributes.email;

      const response = await fetch(`https://asu0kcdiyk.execute-api.us-east-1.amazonaws.com/prod/patient/${patientId}?labId=${encodeURIComponent(labId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });

      if (response.ok) {
        toast.success('Patient deleted successfully');
        fetchPatients();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to delete patient');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      toast.error('Error deleting patient');
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
      toast.error('Error updating status');
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

        const uploadResponse = await fetch('https://asu0kcdiyk.execute-api.us-east-1.amazonaws.com/prod/uploadReport', {
          method: 'POST',
          headers: { 'Authorization': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileContent: base64File, filename: key, patientId, labId })
        });

        if (uploadResponse.ok) {
          toast.success('Report uploaded successfully!');
          // Automatically update status to "Completed"
          await updateStatus(patientId, 'Completed');
        } else {
          const result = await uploadResponse.json();
          toast.error(result.error || 'Failed to upload report');
        }
        fetchPatients();
      } catch (err) {
        console.error('Error uploading report:', err);
        toast.error('Error uploading report');
      }
    };
    reader.readAsDataURL(file);
  };
};


  return (
    <div className="container">
      <header>
        <h1>Lab Dashboard</h1>
        <p>Welcome, <strong>{user?.attributes?.email}</strong></p>
      </header>

      <section className="form-section">
        <h2>Add New Patient</h2>
        <div className="form">
          <label>Patient Name
            <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
          </label>
          <label>Age
            <input type="number" value={form.age} onChange={(e) => updateForm('age', e.target.value)} />
          </label>
          <label>Gender
            <select value={form.gender} onChange={(e) => updateForm('gender', e.target.value)}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label>Phone Number
            <input maxLength={10} value={form.phoneNumber} onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value)) updateForm('phoneNumber', value);
            }} />
          </label>
          <label>Language
            <select value={form.language} onChange={(e) => updateForm('language', e.target.value)}>
              <option value="">Select language</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="ta">Tamil</option>
              <option value="kn">Kannada</option>
            </select>
          </label>
          <label>Report URL (optional)
            <input value={form.reportUrl} onChange={(e) => updateForm('reportUrl', e.target.value)} />
          </label>
        </div>

        <div className="buttons">
          <button onClick={submitPatient}>Save Patient</button>
          <button onClick={fetchPatients}>Fetch Patients</button>
        </div>
      </section>

      <section className="patients-section">
        <h2>Patient Records</h2>
        {loading ? <p>Loading...</p> : patients.length === 0 ? <p>No patients found.</p> : (
          <div className="cards">
            {patients.map((p) => (
              <div className="card" key={p.patientId}>
                <h3>{p.name}</h3>
                <p><strong>Age:</strong> {p.age}</p>
                <p><strong>Gender:</strong> {p.gender}</p>
                <p><strong>Phone:</strong> {p.phoneNumber}</p>
                <p><strong>Language:</strong> {p.language}</p>
                <p><strong>Status:</strong>
                  <select value={p.status} onChange={(e) => updateStatus(p.patientId, e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </p>
                <p><strong>Report:</strong> {p.reportUrl ? <a href={p.reportUrl} target="_blank" rel="noreferrer">View</a> : 'Not uploaded'}</p>
                <div className="card-actions">
                  <button onClick={() => uploadReport(p.patientId)}>Upload</button>
                  <button onClick={() => deletePatient(p.patientId)} className="danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ✅ Sign Out button at the very bottom */}
      <div className="bottom-signout">
        <button onClick={signOut} className="signout-btn">Sign Out</button>
      </div>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="light" />
    </div>
  );
}

export default withAuthenticator(App);
