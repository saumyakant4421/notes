import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import User from './models/User';
import Note from './models/Note';
import path from "path";
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());


if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());

// Basic rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
}));

const rawOrigins = process.env.FRONTEND_URL || '';
const allowedOrigins = rawOrigins ? rawOrigins.split(',').map((s) => s.trim()) : [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      callback(new Error('CORS policy does not allow this origin.'), false);
    },
    credentials: true,
  })
);


app.use((req, res, next) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com https://apis.google.com 'unsafe-inline'",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "frame-src https://accounts.google.com",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('DB connection error:', err));

// OTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});


const otps: { [email: string]: string } = {};

// Generation of 6-digit OTP
const generateOTP = (): string => Math.floor(100000 + Math.random() * 900000).toString();


const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Sign Up: Send OTP
app.post('/api/signup', async (req: Request, res: Response) => {
  const { name, dob, email } = req.body;
  if (!name || !dob || !email) return res.status(400).json({ error: 'All fields required' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(409).json({ error: 'User already exists' });

  const otp = generateOTP();
  otps[email] = otp;

  try {
    await transporter.sendMail({
      to: email,
      subject: 'HD Notes Sign Up OTP',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Sign Up- Verify OTP
app.post('/api/verify-signup', async (req: Request, res: Response) => {
  const { email, otp, name, dob } = req.body;
  if (otps[email] !== otp) return res.status(400).json({ error: 'Invalid or expired OTP' });
  try {
    const user = new User({ name, dob: new Date(dob), email });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    delete otps[email];
    res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login: Send OTP
app.post('/api/login', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const otp = generateOTP();
  otps[email] = otp;

  try {
    await transporter.sendMail({
      to: email,
      subject: 'HD Notes Login OTP',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Login: Verify OTP
app.post('/api/verify-login', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (otps[email] !== otp) return res.status(400).json({ error: 'Invalid or expired OTP' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  delete otps[email];
  res.json({ token, user: { name: user.name, email: user.email } });
});

// Google Auth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
app.post('/api/google-auth', async (req: Request, res: Response) => {
  const { token } = req.body; 
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = new User({
        name: payload.name || 'Google User',
        email: payload.email,
        googleId: payload.sub,
        dob: new Date(), 
      });
      await user.save();
    }
    const jwtToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ token: jwtToken, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Get current user info
app.get('/api/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user.id).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Notes Routes
app.get('/api/notes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const notes = await Note.find({ userId: (req as any).user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', authMiddleware, async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const note = new Note({ userId: (req as any).user.id, content });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.delete('/api/notes/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: (req as any).user.id });
    if (!note) return res.status(404).json({ error: 'Note not found or unauthorized' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

if (process.env.NODE_ENV === "production") {
  const possiblePaths = [
    path.join(__dirname, "../../frontend/build"), 
    path.join(__dirname, "../build"), 
    path.join(__dirname, "../../backend/build"),
  ];

  const frontendPath = possiblePaths.find(p => fs.existsSync(p));

  if (frontendPath) {
    app.use(express.static(frontendPath));

    app.get("*", (req, res) => {
      const indexFile = path.join(frontendPath, "index.html");
      if (fs.existsSync(indexFile)) {
        let html = fs.readFileSync(indexFile, 'utf8');
        // Inject runtime env for REACT_APP_GOOGLE_CLIENT_ID if present
        const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
        if (googleClientId) {
          const inject = `<script>window.__ENV = window.__ENV || {}; window.__ENV.REACT_APP_GOOGLE_CLIENT_ID = '${googleClientId}';</script>`;
          html = html.replace('</head>', `${inject}</head>`);
        }
        res.send(html);
      } else {
        res.sendFile(path.join(frontendPath, "index.html"));
      }
    });
  } else {
    console.warn('Frontend build not found in any of:', possiblePaths);
    app.get('/', (req, res) => {
      res.status(200).send(`<html><head><title>Notes</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:40px;"><h1>Notes backend running</h1><p>The frontend build was not found on the server. The server is running but static assets are missing.</p><p>Expected one of: <ul>${possiblePaths.map(p=>`<li>${p}</li>`).join('')}</ul></p></body></html>`);
    });
  }
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));