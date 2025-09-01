
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/styles.css';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? ''
  : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [notes, setNotes] = useState<{ _id: string; content: string }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetchUserData();
    fetchNotes();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUser(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/signin');
      } else {
        setError('Failed to load user data');
      }
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNotes(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/signin');
      } else {
        setError('Failed to load notes');
      }
    }
  };

  const createNote = async () => {
    if (!newNote.trim()) {
      setError('Note content is required');
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/notes`,
        { content: newNote },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setNotes([res.data, ...notes]);
      setNewNote('');
      setError('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/signin');
      } else {
        setError(err.response?.data?.error || 'Failed to create note');
      }
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNotes(notes.filter((n) => n._id !== id));
      setError('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/signin');
      } else {
        setError(err.response?.data?.error || 'Failed to delete note');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('keepLoggedIn');
    navigate('/signin');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="logo-container">
            <img src="/logo192.png" alt="HD" className="logo" />
            <span className="logo-text">Dashboard</span>
          </div>
          <button onClick={logout} className="logout-button">Sign Out</button>
        </div>
        
        {user && (
          <div className="user-info">
            <h2>Welcome, {user.name} !</h2>
            <p>Email: {user.email}</p>
          </div>
        )}
        
        <div className="create-note-section">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write your note here..."
            className="note-input"
          />
          <button onClick={createNote} className="primary-button">Create Note</button>
        </div>
        
        {error && <p className="error">{error}</p>}
        
        <div className="notes-section">
          <h3>Notes</h3>
          <ul className="notes-list">
            {notes.map((note) => (
              <li key={note._id} className="note-item">
                <span className="note-content">{note.content.length > 50 ? `${note.content.substring(0, 50)}...` : note.content}</span>
                <button onClick={() => deleteNote(note._id)} className="delete-btn">🗑</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;