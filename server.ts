import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', 'KaAyos', 'kaayos', '.env'), override: false });
import express, { Request, Response, NextFunction } from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import https from 'https';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = 3000;
const myIP = '192.168.1.13';

const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const docsUploadsDir = path.join(__dirname, 'uploads', 'documents');
if (!fs.existsSync(docsUploadsDir)) {
  fs.mkdirSync(docsUploadsDir, { recursive: true });
}
const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docsUploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadDoc = multer({ storage: docStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const portfolioUploadsDir = path.join(__dirname, 'uploads', 'portfolios');
if (!fs.existsSync(portfolioUploadsDir)) {
  fs.mkdirSync(portfolioUploadsDir, { recursive: true });
}
const portfolioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, portfolioUploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadPortfolio = multer({ storage: portfolioStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const bookingPhotosUploadsDir = path.join(__dirname, 'uploads', 'bookings');
if (!fs.existsSync(bookingPhotosUploadsDir)) {
  fs.mkdirSync(bookingPhotosUploadsDir, { recursive: true });
}
const bookingPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, bookingPhotosUploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadBookingPhoto = multer({ storage: bookingPhotoStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const chatUploadsDir = path.join(__dirname, 'uploads', 'chat');
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}
const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatUploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadChatPhoto = multer({ storage: chatStorage, limits: { fileSize: 10 * 1024 * 1024 } });

function safeJsonParse(val: any, fallback: any = null): any {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
}

const JWT_SECRET = process.env.JWT_SECRET || 'kaayos-mobile-jwt-secret-change-in-production-v1';
const JWT_EXPIRES_IN = '30d';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_DATABASE || 'kaayos_db',
  waitForConnections: true,
  connectionLimit: 10,
});

const mailTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME || 'johndavealdaybriones009@gmail.com',
    pass: process.env.MAIL_PASSWORD || 'gmckumlcuszdkjlp',
  },
});

const registrationOtps = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

async function sendVerificationEmail(targetEmail: string, otpCode: string, recipientName: string = 'User') {
  const mailOptions = {
    from: '"' + (process.env.MAIL_FROM_NAME || 'KaAyos Services') + '" <' + (process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'johndavealdaybriones009@gmail.com') + '>',
    to: targetEmail,
    subject: otpCode + ' is your KaAyos verification code',
    html: `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <div style="background:#042C53;padding:28px 24px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:-0.5px;font-weight:800;">KaAyos</h1>
          <p style="color:#B5D4F4;margin:6px 0 0;font-size:13px;letter-spacing:0.5px;">VERIFIED HOME SERVICE ECOSYSTEM</p>
        </div>
        <div style="padding:32px 28px;">
          <h2 style="color:#042C53;margin-top:0;font-size:20px;font-weight:700;">Verify your email address</h2>
          <p style="color:#4B5563;font-size:14.5px;line-height:1.6;margin-bottom:24px;">
            Hello <strong>${recipientName}</strong>,<br>
            Thank you for registering with KaAyos. Use the 6-digit verification code below to verify your email address and activate your account:
          </p>
          <div style="background:#EAF3FC;border:2px dashed #1A6FC4;border-radius:12px;padding:18px;text-align:center;margin-bottom:24px;">
            <span style="font-size:32px;letter-spacing:8px;font-weight:800;color:#042C53;font-family:monospace;">${otpCode}</span>
          </div>
          <p style="color:#6E7A88;font-size:12.5px;line-height:1.5;margin-bottom:0;">
            • This verification code is valid for <strong>10 minutes</strong>.<br>
            • If you did not request this registration, please ignore this email.
          </p>
        </div>
        <div style="background:#F7F8FA;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#8C97A4;font-size:11.5px;margin:0;">
            &copy; ${new Date().getFullYear()} KaAyos • Tuy, Batangas Verified Services
          </p>
        </div>
      </div>
    `,
  };

  try {
    await mailTransporter.sendMail(mailOptions);
    console.log('[MAIL] Successfully sent verification email to ' + targetEmail);
  } catch (err: any) {
    console.error('[MAIL ERROR] Failed to send email to ' + targetEmail + ':', err.message);
  }
}


function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    (req as any).userId = decoded.id;
    (req as any).userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/api/test', (_req: Request, res: Response) => {
  res.json({ status: 'KaAyos Mobile API is running', time: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────
app.post('/api/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const [rows]: any = await pool.query(
      'SELECT id, first_name, last_name, name, email, phone, role, service_category, city, avatar, email_verified_at, suspended_at, password FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = rows[0];

    if (user.suspended_at) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        service_category: user.service_category,
        city: user.city,
        avatar: user.avatar,
        email_verified: !!user.email_verified_at,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});


app.post('/api/register/send-otp', async (req: Request, res: Response): Promise<any> => {
  const { email, first_name } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    registrationOtps.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    console.log(`[REGISTER OTP] ${cleanEmail} -> ${otp}`);
    sendVerificationEmail(cleanEmail, otp, first_name || 'User').catch(() => {});

    return res.json({
      success: true,
      msg: 'Verification code sent to your email.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/register/verify-otp', async (req: Request, res: Response): Promise<any> => {
  const { first_name, last_name, email, phone, password, role, otp } = req.body;
  if (!first_name || !last_name || !email || !password || !otp) {
    return res.status(400).json({ error: 'Missing required registration fields or OTP code.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const record = registrationOtps.get(cleanEmail);

  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (record.attempts >= 5) {
    registrationOtps.delete(cleanEmail);
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new verification code.' });
  }

  if (record.otp !== otp.trim()) {
    record.attempts++;
    return res.status(400).json({ error: 'Incorrect verification code. Please check your email and try again.' });
  }

  registrationOtps.delete(cleanEmail);

  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = `${first_name.trim()} ${last_name.trim()}`;
    const userRole = role === 'worker' ? 'worker' : 'client';

    const [result]: any = await pool.query(
      'INSERT INTO users (first_name, last_name, name, email, phone, role, password, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
      [first_name.trim(), last_name.trim(), fullName, cleanEmail, phone ? phone.trim() : null, userRole, hashedPassword]
    );

    const newUserId = result.insertId;
    const token = jwt.sign({ id: newUserId, role: userRole }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      success: true,
      msg: 'Email verified and account created successfully!',
      userId: newUserId,
      token,
      user: {
        id: newUserId,
        name: fullName,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        role: userRole,
        service_category: null,
        city: null,
        avatar: null,
        email_verified: true,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/register', async (req: Request, res: Response): Promise<any> => {
  const { first_name, last_name, email, phone, password, role } = req.body;
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = `${first_name} ${last_name}`;
    const userRole = role === 'worker' ? 'worker' : 'client';
    const [result]: any = await pool.query(
      'INSERT INTO users (first_name, last_name, name, email, phone, role, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [first_name, last_name, fullName, email, phone || null, userRole, hashedPassword]
    );
    const newUserId = result.insertId;
    const token = jwt.sign({ id: newUserId, role: userRole }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({
      success: true,
      msg: 'Account created successfully',
      userId: newUserId,
      token,
      user: {
        id: newUserId,
        name: fullName,
        first_name,
        last_name,
        email,
        phone: phone || null,
        role: userRole,
        service_category: null,
        city: null,
        avatar: null,
        email_verified: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// SERVICE CATEGORIES
// ──────────────────────────────────────────────
app.get('/api/categories', async (_req: Request, res: Response): Promise<any> => {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, name, slug, description, icon FROM service_categories WHERE is_active = 1 ORDER BY name'
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// WORKERS
// ──────────────────────────────────────────────
app.get('/api/workers', async (req: Request, res: Response): Promise<any> => {
  const { category, search } = req.query;
  try {
    let query = `
      SELECT
        u.id, u.first_name, u.last_name, u.name, u.avatar, u.city, u.service_category,
        COALESCE(wp.average_rating, 0) AS avg_rating,
        COALESCE(wp.government_id_verified, 0) AS government_id_verified,
        wp.hourly_rate,
        COUNT(DISTINCT b.id) AS job_count
      FROM users u
      LEFT JOIN worker_profiles wp ON wp.user_id = u.id
      LEFT JOIN bookings b ON b.worker_id = u.id AND b.status = 'completed'
      WHERE u.role = 'worker'
    `;
    const params: any[] = [];
    if (category) {
      query += ' AND u.service_category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (u.name LIKE ? OR u.city LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }
    query += ' GROUP BY u.id, wp.average_rating, wp.government_id_verified ORDER BY avg_rating DESC';

    const [rows]: any = await pool.query(query, params);

    const workers = await Promise.all(rows.map(async (worker: any) => {
      const [services]: any = await pool.query(
        `SELECT s.name, s.slug, s.base_price, ps.custom_price, ps.is_available
         FROM provider_services ps
         JOIN services s ON s.id = ps.service_id
         WHERE ps.user_id = ? AND ps.is_available = 1`,
        [worker.id]
      );
      const [skillRows]: any = await pool.query(
        'SELECT skills FROM worker_profiles WHERE user_id = ?',
        [worker.id]
      );
      const rawSkills = skillRows[0]?.skills;
      const skills: string[] = rawSkills
        ? (typeof rawSkills === 'string' ? JSON.parse(rawSkills) : rawSkills)
        : [];
      const basePrices = services.map((s: any) => s.custom_price || s.base_price).filter((p: any) => p !== null && p !== undefined);
      return {
        id: worker.id,
        name: worker.name,
        first_name: worker.first_name,
        last_name: worker.last_name,
        avatar: worker.avatar,
        city: worker.city,
        category: worker.service_category,
        rating: Math.round(worker.avg_rating * 10) / 10,
        reviews: 0,
        jobs: worker.job_count,
        verified: !!worker.government_id_verified,
        hourly_rate: worker.hourly_rate,
        services: services.map((s: any) => ({
          name: s.name,
          slug: s.slug,
          price: s.custom_price,
          base_price: s.base_price,
        })),
        skills,
      };
    }));

    return res.json(workers);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/workers/:id', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.name, u.avatar, u.city, u.service_category, u.phone, u.email,
              COALESCE(wp.average_rating, 0) AS avg_rating,
              COALESCE(wp.government_id_verified, 0) AS government_id_verified,
              wp.hourly_rate, wp.bio, wp.years_of_experience
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       WHERE u.id = ? AND u.role = 'worker'`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Worker not found' });

    const worker = rows[0];

    const [services]: any = await pool.query(
      `SELECT s.id, s.name, s.slug, s.description, s.base_price, ps.custom_price, ps.is_available
       FROM provider_services ps
       JOIN services s ON s.id = ps.service_id
       WHERE ps.user_id = ?`,
      [id]
    );

    const [reviews]: any = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS client_name, u.avatar AS client_avatar
       FROM reviews r
       JOIN users u ON u.id = r.client_id
       WHERE r.worker_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    const [skillRows]: any = await pool.query(
      'SELECT skills FROM worker_profiles WHERE user_id = ?',
      [id]
    );
    const rawSkills = skillRows[0]?.skills;
    const skillArr: string[] = rawSkills
      ? (typeof rawSkills === 'string' ? JSON.parse(rawSkills) : rawSkills)
      : [];
    const skills = skillArr.map((name: string) => ({ name, slug: name.toLowerCase().replace(/\s+/g, '-') }));

    const [documents]: any = await pool.query(
      'SELECT document_type, file_path, status, admin_notes, verified_at FROM worker_documents WHERE user_id = ?',
      [id]
    );

    const [portfolio]: any = await pool.query(
      `SELECT wp.id, wp.photo_path, wp.caption, wp.created_at
       FROM work_portfolios wp
       JOIN worker_profiles wpr ON wpr.id = wp.worker_profile_id
       WHERE wpr.user_id = ?
       ORDER BY wp.created_at DESC`,
      [id]
    );

    const [jobCount]: any = await pool.query(
      "SELECT COUNT(*) AS total_jobs FROM bookings WHERE worker_id = ? AND status = 'completed'",
      [id]
    );

    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0
      ? Math.round(reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount * 10) / 10
      : Math.round(worker.avg_rating * 10) / 10;

    return res.json({
      id: worker.id,
      first_name: worker.first_name,
      last_name: worker.last_name,
      name: worker.name,
      avatar: worker.avatar,
      city: worker.city,
      category: worker.service_category,
      phone: worker.phone,
      email: worker.email,
      bio: worker.bio,
      hourly_rate: worker.hourly_rate,
      years_of_experience: worker.years_of_experience,
      verified: !!worker.government_id_verified,
      rating: avgRating,
      jobs: jobCount[0].total_jobs,
      totalJobs: jobCount[0].total_jobs,
      services,
      reviews,
      skills: skills.map((s: any) => ({ name: s.name, slug: s.slug })),
      portfolio: portfolio.map((p: any) => ({
        id: p.id,
        title: p.caption,
        description: p.caption,
        image_path: p.photo_path,
        created_at: p.created_at,
      })),
      documents: documents.map((d: any) => ({ type: d.document_type, file_path: d.file_path, status: d.status, admin_notes: d.admin_notes, verified_at: d.verified_at })),
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// BOOKINGS
// ──────────────────────────────────────────────
app.get('/api/bookings', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).userId;
  const role = (req as any).userRole;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const column = role === 'worker' ? 'b.worker_id' : 'b.client_id';
    const [rows]: any = await pool.query(
      `SELECT b.id, b.booking_ref, b.worker_id, b.client_id, b.service_category, b.scheduled_at, b.address,
              b.house_no, b.barangay, b.latitude, b.longitude, b.notes, b.status, b.price,
              b.property_type, b.pricing_type, b.estimated_duration_hours, b.complexity_level,
              b.reschedule_requested_by, b.reschedule_proposed_at, b.reschedule_reason, b.reschedule_status,
              b.completion_requested_by, b.confirmed_by_worker_at, b.confirmed_by_client_at,
              b.cancellation_reason, b.created_at, b.completed_at, b.cancelled_at,
              b.work_started_at, b.work_ended_at,
              b.scope_amendment_price, b.scope_amendment_notes, b.scope_amendment_status, b.scope_amendment_requested_at,
              r.id AS review_id, r.rating AS review_rating, r.comment AS review_comment,
              u.name AS other_name, u.avatar AS other_avatar, u.phone AS other_phone
       FROM bookings b
       JOIN users u ON ${role === 'worker' ? 'b.client_id' : 'b.worker_id'} = u.id
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE ${column} = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    // Fetch photos for each booking
    const bookingIds = rows.map((r: any) => r.id);
    let photosByBooking: Record<number, any[]> = {};
    if (bookingIds.length > 0) {
      try {
        const [photos]: any = await pool.query(
          `SELECT id, booking_id, photo_path, caption, created_at FROM booking_photos WHERE booking_id IN (${bookingIds.join(',')})`
        );
        for (const p of photos) {
          if (!photosByBooking[p.booking_id]) photosByBooking[p.booking_id] = [];
          photosByBooking[p.booking_id].push({
            id: p.id,
            url: p.photo_path.startsWith('http') ? p.photo_path : `http://${myIP}:${PORT}/${p.photo_path}`,
            caption: p.caption,
            created_at: p.created_at,
          });
        }
      } catch (err) {
        // booking_photos table query fallback
      }
    }

    const enhanced = rows.map((r: any) => ({
      ...r,
      photos: photosByBooking[r.id] || [],
    }));

    return res.json(enhanced);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const {
    worker_id,
    service_category,
    scheduled_at,
    address,
    house_no,
    barangay,
    notes,
    price,
    property_type,
    pricing_type,
    payment_scheme,
    payment_method,
    service_id,
    extras,
    estimated_duration_hours,
    complexity_level,
    latitude,
    longitude,
  } = req.body;
  const client_id = (req as any).userId;
  if (!client_id || !worker_id || !service_category || !scheduled_at || !address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const bookingRef = 'BK-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    let resolvedPrice = Number(price);
    let resolvedScheme = payment_scheme || (pricing_type === 'hourly' ? 'hourly' : 'task');
    let agreedRate = null;
    let extrasTotal = 0;

    if (Array.isArray(extras)) {
      for (const ext of extras) {
        extrasTotal += Number(ext.cost || 0);
      }
    }

    try {
      const [wp]: any = await pool.query(
        'SELECT hourly_rate, daily_rate, task_base_rate, preferred_payment_scheme FROM worker_profiles WHERE user_id = ?',
        [worker_id]
      );
      if (!payment_scheme && wp[0]?.preferred_payment_scheme) {
        resolvedScheme = wp[0].preferred_payment_scheme;
      }
      const hourly = wp[0]?.hourly_rate ? Number(wp[0].hourly_rate) : 350;
      const daily = wp[0]?.daily_rate ? Number(wp[0].daily_rate) : (hourly * 8);
      const taskRate = wp[0]?.task_base_rate ? Number(wp[0].task_base_rate) : hourly;
      const hours = Number(estimated_duration_hours) || 2.0;
      const mult = complexity_level === 'high_hazard' ? 1.5 : (complexity_level === 'moderate' ? 1.2 : 1.0);

      let base = taskRate;
      agreedRate = taskRate;
      if (resolvedScheme === 'hourly') {
        agreedRate = hourly;
        base = hourly * hours;
      } else if (resolvedScheme === 'daily') {
        agreedRate = daily;
        const days = Math.max(1, Math.ceil(hours / 8.0));
        base = daily * days;
      }

      if (!resolvedPrice || resolvedPrice <= 0) {
        resolvedPrice = Math.round((base * mult) + extrasTotal);
      }
    } catch {
      if (!resolvedPrice || resolvedPrice <= 0) {
        resolvedPrice = 400 + extrasTotal;
      }
    }

    const [result]: any = await pool.query(
      `INSERT INTO bookings (
        booking_ref, client_id, worker_id, service_id, service_category, scheduled_at, address,
        house_no, barangay, notes, status, price, property_type, pricing_type, payment_scheme,
        agreed_rate, extras_total, payment_method,
        estimated_duration_hours, complexity_level, latitude, longitude, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        bookingRef,
        client_id,
        worker_id,
        service_id || null,
        service_category,
        scheduled_at,
        address,
        house_no || null,
        barangay || null,
        notes || null,
        resolvedPrice,
        property_type || 'residential',
        pricing_type || (resolvedScheme === 'hourly' ? 'hourly' : 'fixed'),
        resolvedScheme,
        agreedRate,
        extrasTotal,
        payment_method || 'cash',
        estimated_duration_hours || 2.0,
        complexity_level || 'standard',
        latitude || null,
        longitude || null,
      ]
    );

    if (Array.isArray(extras) && extras.length > 0) {
      for (const item of extras) {
        try {
          await pool.query(
            `INSERT INTO booking_extras (booking_id, service_extra_id, name, cost, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [result.insertId, item.service_extra_id || null, item.name || 'Extra', Number(item.cost || 0), item.source || 'catalog']
          );
        } catch (e) {
          // ignore if table not migrated yet
        }
      }
    }
    return res.json({ success: true, msg: 'Booking created', bookingId: result.insertId, bookingRef });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.patch('/api/bookings/:id/status', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { status, decline_reason } = req.body;
  const worker_id = (req as any).userId;

  const validTransitions: Record<string, string[]> = {
    new: ['accepted', 'cancelled', 'declined'],
    accepted: ['en_route', 'cancelled'],
    en_route: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    declined: [],
  };

  try {
    const [bookingRows]: any = await pool.query('SELECT status, price, worker_id FROM bookings WHERE id = ?', [id]);
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const currentStatus = bookingRows[0].status;
    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowedNext.join(', ') || 'none'}` });
    }

    const extraFields = status === 'completed'
      ? ', completed_at = NOW(), confirmed_by_worker_at = NOW(), confirmed_by_client_at = NOW()'
      : status === 'cancelled'
      ? ', cancelled_at = NOW()'
      : status === 'declined'
      ? `, declined_at = NOW(), decline_reason = ${pool.escape(decline_reason || 'Declined by worker')}`
      : '';

    await pool.query(
      `UPDATE bookings SET status = ?${extraFields}, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    if (status === 'completed') {
      const gross = bookingRows[0].price || 0;
      const wid = worker_id || bookingRows[0].worker_id;
      try {
        const [existing]: any = await pool.query('SELECT id FROM booking_quotes WHERE booking_id = ?', [id]);
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO booking_quotes (worker_id, booking_id, total_amount, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            [wid, id, gross]
          );
        }
      } catch (e) {
        // Fallback if migration not yet applied
        const [existing]: any = await pool.query('SELECT id FROM earnings WHERE booking_id = ?', [id]);
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO earnings (worker_id, booking_id, gross_amount, platform_fee, net_amount, created_at, updated_at) VALUES (?, ?, ?, 0, ?, NOW(), NOW())',
            [wid, id, gross, gross]
          );
        }
      }
    }

    return res.json({ success: true, msg: `Booking ${status}` });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/reschedule', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { proposed_at, reason } = req.body;
  const userId = (req as any).userId;

  if (!proposed_at) return res.status(400).json({ error: 'Proposed date/time is required' });

  try {
    const [bookingRows]: any = await pool.query('SELECT id, status, client_id, worker_id FROM bookings WHERE id = ?', [id]);
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bookingRows[0];
    if (b.client_id !== userId && b.worker_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (['completed', 'cancelled', 'declined'].includes(b.status)) {
      return res.status(400).json({ error: 'Cannot reschedule a closed booking' });
    }

    await pool.query(
      `UPDATE bookings SET
        reschedule_requested_by = ?,
        reschedule_proposed_at = ?,
        reschedule_reason = ?,
        reschedule_status = 'pending',
        updated_at = NOW()
       WHERE id = ?`,
      [userId, proposed_at, reason || null, id]
    );

    return res.json({ success: true, msg: 'Reschedule request submitted' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/reschedule-respond', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' | 'decline'
  const userId = (req as any).userId;

  if (!['approve', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or decline' });
  }

  try {
    const [bookingRows]: any = await pool.query(
      'SELECT id, status, client_id, worker_id, reschedule_proposed_at, reschedule_status FROM bookings WHERE id = ?',
      [id]
    );
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bookingRows[0];
    if (b.client_id !== userId && b.worker_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (b.reschedule_status !== 'pending') {
      return res.status(400).json({ error: 'No pending reschedule request found' });
    }

    if (action === 'approve') {
      await pool.query(
        `UPDATE bookings SET
          scheduled_at = reschedule_proposed_at,
          reschedule_status = 'approved',
          reschedule_responded_at = NOW(),
          updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
    } else {
      await pool.query(
        `UPDATE bookings SET
          reschedule_status = 'declined',
          reschedule_responded_at = NOW(),
          updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
    }

    return res.json({ success: true, msg: `Reschedule ${action}d` });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/photo', authenticateToken, uploadBookingPhoto.single('file'), async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { caption } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Photo file is required' });

  try {
    const relativePath = path.join('uploads', 'bookings', req.file.filename).replace(/\\/g, '/');
    const [result]: any = await pool.query(
      'INSERT INTO booking_photos (booking_id, photo_path, caption, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [id, relativePath, caption || null]
    );

    const fullUrl = `http://${myIP}:${PORT}/${relativePath}`;
    return res.json({ success: true, msg: 'Photo uploaded', photo: { id: result.insertId, url: fullUrl, caption } });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/confirm-complete', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).userRole;

  try {
    const [bookingRows]: any = await pool.query(
      'SELECT id, status, price, worker_id, client_id, confirmed_by_worker_at, confirmed_by_client_at FROM bookings WHERE id = ?',
      [id]
    );
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bookingRows[0];

    const isWorker = role === 'worker' || b.worker_id === userId;
    const isClient = role === 'client' || b.client_id === userId;

    let updateFields: string[] = [];
    if (isWorker) {
      updateFields.push('confirmed_by_worker_at = NOW()');
      updateFields.push('completion_requested_by = IFNULL(completion_requested_by, ' + userId + ')');
      updateFields.push('completion_requested_at = IFNULL(completion_requested_at, NOW())');
    }
    if (isClient) {
      updateFields.push('confirmed_by_client_at = NOW()');
      updateFields.push('completion_requested_by = IFNULL(completion_requested_by, ' + userId + ')');
      updateFields.push('completion_requested_at = IFNULL(completion_requested_at, NOW())');
    }

    const workerConfirmedNow = isWorker || b.confirmed_by_worker_at !== null;
    const clientConfirmedNow = isClient || b.confirmed_by_client_at !== null;

    let fullyCompleted = false;
    if (workerConfirmedNow && clientConfirmedNow) {
      updateFields.push("status = 'completed'");
      updateFields.push('completed_at = NOW()');
      fullyCompleted = true;
    }

    await pool.query(
      `UPDATE bookings SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      [id]
    );

    if (fullyCompleted) {
      const gross = b.price || 0;
      try {
        const [existing]: any = await pool.query('SELECT id FROM booking_quotes WHERE booking_id = ?', [id]);
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO booking_quotes (worker_id, booking_id, total_amount, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            [b.worker_id, id, gross]
          );
        }
      } catch (e) {
        const [existing]: any = await pool.query('SELECT id FROM earnings WHERE booking_id = ?', [id]);
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO earnings (worker_id, booking_id, gross_amount, platform_fee, net_amount, created_at, updated_at) VALUES (?, ?, ?, 0, ?, NOW(), NOW())',
            [b.worker_id, id, gross, gross]
          );
        }
      }
    }

    return res.json({
      success: true,
      fullyCompleted,
      msg: fullyCompleted ? 'Job fully completed and verified' : 'Completion confirmed. Waiting for counterpart.',
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/location-ping', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    await pool.query(
      `UPDATE bookings SET
        worker_live_latitude = ?,
        worker_live_longitude = ?,
        worker_live_updated_at = NOW(),
        updated_at = NOW()
       WHERE id = ?`,
      [latitude, longitude, id]
    );
    return res.json({ success: true, msg: 'Location recorded' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// WORK TIMER & SCOPE AMENDMENT ENDPOINTS
// ──────────────────────────────────────────────
app.post('/api/bookings/:id/timer-start', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const worker_id = (req as any).userId;
  try {
    const [bookingRows]: any = await pool.query('SELECT id, worker_id, status FROM bookings WHERE id = ?', [id]);
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (bookingRows[0].worker_id !== worker_id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('UPDATE bookings SET work_started_at = NOW(), status = "in_progress", updated_at = NOW() WHERE id = ?', [id]);
    return res.json({ success: true, msg: 'Work timer started' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/timer-stop', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const worker_id = (req as any).userId;
  try {
    const [bookingRows]: any = await pool.query(
      `SELECT b.id, b.worker_id, b.pricing_type, b.work_started_at, b.price, wp.hourly_rate
       FROM bookings b
       LEFT JOIN worker_profiles wp ON wp.user_id = b.worker_id
       WHERE b.id = ?`,
      [id]
    );
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = bookingRows[0];
    if (b.worker_id !== worker_id) return res.status(403).json({ error: 'Unauthorized' });

    const started = b.work_started_at ? new Date(b.work_started_at).getTime() : Date.now();
    const ended = Date.now();
    const elapsedMinutes = Math.max(1, Math.round((ended - started) / 60000));
    const elapsedHours = Math.round((elapsedMinutes / 60) * 100) / 100;

    let newPrice = b.price;
    if (b.pricing_type === 'hourly' && b.hourly_rate) {
      newPrice = Math.max(b.hourly_rate, Math.round(elapsedHours * b.hourly_rate));
    }

    await pool.query(
      'UPDATE bookings SET work_ended_at = NOW(), estimated_duration_hours = ?, price = ?, updated_at = NOW() WHERE id = ?',
      [elapsedHours, newPrice, id]
    );
    return res.json({ success: true, msg: 'Work timer stopped', elapsedHours, price: newPrice });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/scope-amendment', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { additional_price, new_total_price, notes } = req.body;
  const worker_id = (req as any).userId;
  if (!notes) return res.status(400).json({ error: 'Please provide an explanation for the price adjustment' });

  try {
    const [rows]: any = await pool.query('SELECT worker_id, price FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (rows[0].worker_id !== worker_id) return res.status(403).json({ error: 'Unauthorized' });

    const targetPrice = new_total_price !== undefined ? new_total_price : (Number(rows[0].price || 0) + Number(additional_price || 0));

    await pool.query(
      `UPDATE bookings SET
        scope_amendment_price = ?,
        scope_amendment_notes = ?,
        scope_amendment_status = 'pending',
        scope_amendment_requested_at = NOW(),
        updated_at = NOW()
       WHERE id = ?`,
      [targetPrice, notes, id]
    );
    return res.json({ success: true, msg: 'Price adjustment submitted for client approval', new_price: targetPrice });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings/:id/scope-amendment-respond', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { action } = req.body; // 'approved' | 'declined'
  const client_id = (req as any).userId;
  if (!['approved', 'declined'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be approved or declined' });
  }

  try {
    const [rows]: any = await pool.query('SELECT client_id, scope_amendment_price, scope_amendment_status FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (rows[0].client_id !== client_id) return res.status(403).json({ error: 'Unauthorized' });
    if (rows[0].scope_amendment_status !== 'pending') {
      return res.status(400).json({ error: 'No pending price adjustment found' });
    }

    if (action === 'approved') {
      await pool.query(
        `UPDATE bookings SET
          price = scope_amendment_price,
          scope_amendment_status = 'approved',
          updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
      return res.json({ success: true, msg: 'Price adjustment approved' });
    } else {
      await pool.query(
        `UPDATE bookings SET
          scope_amendment_status = 'declined',
          updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
      return res.json({ success: true, msg: 'Price adjustment declined' });
    }
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.patch('/api/bookings/:id/cancel', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const [rows]: any = await pool.query('SELECT status FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (!['new', 'accepted'].includes(rows[0].status)) {
      return res.status(400).json({ error: 'Can only cancel new or accepted bookings' });
    }
    await pool.query(
      'UPDATE bookings SET status = ?, cancelled_at = NOW(), cancellation_reason = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', reason || null, id]
    );
    return res.json({ success: true, msg: 'Booking cancelled' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/client/dashboard', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const [active]: any = await pool.query(
      "SELECT COUNT(*) AS count FROM bookings WHERE client_id = ? AND status NOT IN ('completed', 'cancelled')",
      [userId]
    );
    const [completed]: any = await pool.query(
      "SELECT COUNT(*) AS count FROM bookings WHERE client_id = ? AND status = 'completed'",
      [userId]
    );
    const [unreadMessages]: any = await pool.query(
      'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND read_at IS NULL',
      [userId]
    );
    const [pendingReviews]: any = await pool.query(
      "SELECT COUNT(*) AS count FROM bookings b LEFT JOIN reviews r ON r.booking_id = b.id WHERE b.client_id = ? AND b.status = 'completed' AND r.id IS NULL",
      [userId]
    );
    return res.json({ stats: { activeBookings: active[0].count, completedJobs: completed[0].count, unreadMessages: unreadMessages[0].count, pendingReviews: pendingReviews[0].count } });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// PROFILE
// ──────────────────────────────────────────────
app.get('/api/profile', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const id = (req as any).userId;
  try {
    const [rows]: any = await pool.query(
      'SELECT id, first_name, last_name, name, email, phone, role, service_category, city, barangay, street_address, location_source, email_notifications, language, avatar, email_verified_at FROM users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    return res.json({
      success: true,
      user: {
        ...u,
        email_verified: !!u.email_verified_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/profile/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  if (Number(id) !== (req as any).userId) {
    return res.status(403).json({ error: 'You can only view your own profile' });
  }
  try {
    const [rows]: any = await pool.query(
      'SELECT id, first_name, last_name, name, email, phone, role, service_category, city, barangay, street_address, location_source, email_notifications, language, avatar, email_verified_at FROM users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    return res.json({
      success: true,
      user: {
        ...u,
        email_verified: !!u.email_verified_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/profile', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const id = (req as any).userId;
  const { first_name, last_name, phone, city, barangay, street_address, location_source, email_notifications, language } = req.body;
  try {
    const name = first_name && last_name ? `${first_name} ${last_name}` : undefined;
    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
    if (city !== undefined) { updates.push('city = ?'); params.push(city || null); }
    if (barangay !== undefined) { updates.push('barangay = ?'); params.push(barangay || null); }
    if (street_address !== undefined) { updates.push('street_address = ?'); params.push(street_address || null); }
    if (location_source !== undefined) { updates.push('location_source = ?'); params.push(location_source || null); }
    if (email_notifications !== undefined) { updates.push('email_notifications = ?'); params.push(email_notifications); }
    if (language !== undefined) { updates.push('language = ?'); params.push(language); }

    params.push(id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return res.json({ success: true, msg: 'Profile updated' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/profile/avatar', authenticateToken, upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).userId;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const avatarPath = `/uploads/profiles/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?', [avatarPath, userId]);
    return res.json({ success: true, msg: 'Avatar updated', avatar_url: avatarPath });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// MESSAGES
// ──────────────────────────────────────────────
app.get('/api/messages', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const [rows]: any = await pool.query(
      `SELECT m.id, m.booking_id, m.sender_id, m.receiver_id, m.message, m.read_at, m.created_at,
              su.name AS sender_name, ru.name AS receiver_name,
              su.avatar AS sender_avatar, ru.avatar AS receiver_avatar
       FROM messages m
       JOIN users su ON su.id = m.sender_id
       JOIN users ru ON ru.id = m.receiver_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.id ASC`,
      [userId, userId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/messages/upload', authenticateToken, uploadChatPhoto.single('photo'), async (req: Request, res: Response): Promise<any> => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  try {
    const photoPath = `/uploads/chat/${req.file.filename}`;
    const fullUrl = `http://${myIP}:${PORT}${photoPath}`;
    return res.json({ success: true, photoPath, url: fullUrl });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/messages/send', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { receiver_id, booking_id, message } = req.body;
  const sender_id = (req as any).userId;
  if (!sender_id || !receiver_id || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    let resolvedBookingId = booking_id ? Number(booking_id) : null;

    // If no booking_id provided, look for recent booking between them
    if (!resolvedBookingId) {
      const [recentBooking]: any = await pool.query(
        `SELECT id FROM bookings 
         WHERE (client_id = ? AND worker_id = ?) OR (client_id = ? AND worker_id = ?)
         ORDER BY created_at DESC LIMIT 1`,
        [sender_id, receiver_id, receiver_id, sender_id]
      );
      if (recentBooking && recentBooking.length > 0) {
        resolvedBookingId = recentBooking[0].id;
      }
    }

    // Resolve or link conversation
    let conversationId: number | null = null;
    const [existingConvo]: any = await pool.query(
      `SELECT id FROM conversations 
       WHERE (client_id = ? AND worker_id = ?) OR (client_id = ? AND worker_id = ?)
       LIMIT 1`,
      [sender_id, receiver_id, receiver_id, sender_id]
    );

    if (existingConvo && existingConvo.length > 0) {
      conversationId = existingConvo[0].id;
      await pool.query('UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?', [conversationId]);
    } else {
      const [uRows]: any = await pool.query('SELECT id, role FROM users WHERE id IN (?, ?)', [sender_id, receiver_id]);
      let clientId = sender_id;
      let workerId = receiver_id;
      for (const u of uRows) {
        if (u.role === 'client') clientId = u.id;
        if (u.role === 'worker') workerId = u.id;
      }
      const [cResult]: any = await pool.query(
        'INSERT INTO conversations (client_id, worker_id, last_message_at, created_at, updated_at) VALUES (?, ?, NOW(), NOW(), NOW())',
        [clientId, workerId]
      );
      conversationId = cResult.insertId;
    }

    const [result]: any = await pool.query(
      'INSERT INTO messages (booking_id, conversation_id, sender_id, receiver_id, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [resolvedBookingId, conversationId, sender_id, receiver_id, message]
    );
    return res.json({ success: true, msg: 'Message sent', messageId: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// SERVICES
// ──────────────────────────────────────────────
app.get('/api/services', async (req: Request, res: Response): Promise<any> => {
  const { category_id } = req.query;
  try {
    let query = 'SELECT s.id, s.name, s.slug, s.description, s.base_price, s.is_active, sc.name AS category_name FROM services s JOIN service_categories sc ON sc.id = s.category_id WHERE s.is_active = 1';
    const params: any[] = [];
    if (category_id) {
      query += ' AND s.category_id = ?';
      params.push(category_id);
    }
    query += ' ORDER BY s.name';
    const [rows]: any = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// WORKER PROFILE MANAGEMENT
// ──────────────────────────────────────────────

app.get('/api/worker/profile/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  if (Number(id) !== (req as any).userId) {
    return res.status(403).json({ error: 'You can only view your own worker profile' });
  }
  try {
    const [rows]: any = await pool.query(
      `SELECT wp.*, u.name, u.avatar, u.email, u.phone, u.city, u.service_category
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE wp.user_id = ?`,
      [id]
    );
    if (rows.length === 0) {
      const [userRow]: any = await pool.query(
        'SELECT id, name, first_name, last_name, email, phone, role, service_category, city, avatar FROM users WHERE id = ? AND role = ?',
        [id, 'worker']
      );
      if (userRow.length === 0) return res.status(404).json({ error: 'Worker not found' });
      const u = userRow[0];
      const [result]: any = await pool.query(
        'INSERT INTO worker_profiles (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [id]
      );
      return res.json({
        user_id: u.id, name: u.name, first_name: u.first_name, last_name: u.last_name,
        email: u.email, phone: u.phone, avatar: u.avatar, city: u.city, service_category: u.service_category,
        bio: null, skills: [], spoken_languages: [], hourly_rate: null,
        available_days: [], preferred_hours: null, service_areas: [],
        years_of_experience: null, service_radius: null, service_zone: null,
        cover_photo: null, current_latitude: null, current_longitude: null, average_rating: 0,
        profile_id: result.insertId,
      });
    }
    const wp = rows[0];
    return res.json({
      profile_id: wp.id, user_id: wp.user_id, name: wp.name, avatar: wp.avatar,
      email: wp.email, phone: wp.phone, city: wp.city, service_category: wp.service_category,
      bio: wp.bio,
      skills: Array.isArray(safeJsonParse(wp.skills)) ? safeJsonParse(wp.skills) : [],
      spoken_languages: Array.isArray(safeJsonParse(wp.spoken_languages)) ? safeJsonParse(wp.spoken_languages) : [],
      hourly_rate: wp.hourly_rate,
      daily_rate: wp.daily_rate,
      task_base_rate: wp.task_base_rate,
      preferred_payment_scheme: wp.preferred_payment_scheme || 'task',
      available_days: Array.isArray(safeJsonParse(wp.available_days)) ? safeJsonParse(wp.available_days) : [],
      preferred_hours: wp.preferred_hours,
      service_areas: Array.isArray(safeJsonParse(wp.service_areas)) ? safeJsonParse(wp.service_areas) : [],
      years_of_experience: wp.years_of_experience,
      service_radius: wp.service_radius,
      service_zone: safeJsonParse(wp.service_zone),
      cover_photo: wp.cover_photo, current_latitude: wp.current_latitude,
      current_longitude: wp.current_longitude, average_rating: wp.average_rating || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/worker/profile/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  if (Number(id) !== (req as any).userId) {
    return res.status(403).json({ error: 'You can only edit your own worker profile' });
  }
  const {
    bio, skills, spoken_languages, hourly_rate, daily_rate, task_base_rate,
    preferred_payment_scheme, available_days,
    preferred_hours, service_areas, years_of_experience, service_radius,
    service_zone, cover_photo, first_name, last_name, city,
  } = req.body;
  try {
    const skillsJson = skills ? (typeof skills === 'string' ? skills : JSON.stringify(skills)) : null;
    const langsJson = spoken_languages ? (typeof spoken_languages === 'string' ? spoken_languages : JSON.stringify(spoken_languages)) : null;
    const daysJson = available_days ? (typeof available_days === 'string' ? available_days : JSON.stringify(available_days)) : null;
    const areasJson = service_areas ? (typeof service_areas === 'string' ? service_areas : JSON.stringify(service_areas)) : null;
    const zoneJson = service_zone ? (typeof service_zone === 'string' ? service_zone : JSON.stringify(service_zone)) : null;

    const [existing]: any = await pool.query('SELECT id FROM worker_profiles WHERE user_id = ?', [id]);
    if (existing.length > 0) {
      await pool.query(
        `UPDATE worker_profiles SET
          bio = COALESCE(?, bio), skills = COALESCE(?, skills),
          spoken_languages = COALESCE(?, spoken_languages), hourly_rate = COALESCE(?, hourly_rate),
          daily_rate = COALESCE(?, daily_rate), task_base_rate = COALESCE(?, task_base_rate),
          preferred_payment_scheme = COALESCE(?, preferred_payment_scheme),
          available_days = COALESCE(?, available_days), preferred_hours = COALESCE(?, preferred_hours),
          service_areas = COALESCE(?, service_areas), years_of_experience = COALESCE(?, years_of_experience),
          service_radius = COALESCE(?, service_radius), service_zone = COALESCE(?, service_zone),
          cover_photo = COALESCE(?, cover_photo), updated_at = NOW()
        WHERE user_id = ?`,
        [bio, skillsJson, langsJson, hourly_rate, daily_rate, task_base_rate, preferred_payment_scheme, daysJson, preferred_hours,
         areasJson, years_of_experience, service_radius, zoneJson, cover_photo, id]
      );
    } else {
      await pool.query(
        `INSERT INTO worker_profiles (user_id, bio, skills, spoken_languages, hourly_rate, daily_rate, task_base_rate, preferred_payment_scheme, available_days, preferred_hours, service_areas, years_of_experience, service_radius, service_zone, cover_photo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [id, bio, skillsJson, langsJson, hourly_rate, daily_rate, task_base_rate, preferred_payment_scheme, daysJson, preferred_hours,
         areasJson, years_of_experience, service_radius, zoneJson, cover_photo]
      );
    }
    if (first_name || last_name || city) {
      const updates: string[] = [];
      const params: any[] = [];
      if (first_name) { updates.push('first_name = ?', 'name = CONCAT(?, " ", last_name)'); params.push(first_name, first_name); }
      if (last_name) { updates.push('last_name = ?', 'name = CONCAT(first_name, " ", ?)'); params.push(last_name, last_name); }
      if (city) { updates.push('city = ?'); params.push(city); }
      if (updates.length > 0) {
        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
      }
    }
    return res.json({ success: true, msg: 'Worker profile updated' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/worker/portfolio', authenticateToken, uploadPortfolio.single('file'), async (req: Request, res: Response): Promise<any> => {
  const { caption } = req.body;
  const userId = (req as any).userId;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const [wp]: any = await pool.query('SELECT id FROM worker_profiles WHERE user_id = ?', [userId]);
    if (wp.length === 0) return res.status(404).json({ error: 'Worker profile not found' });
    const photoPath = `/uploads/portfolios/${req.file.filename}`;
    const [result]: any = await pool.query(
      'INSERT INTO work_portfolios (worker_profile_id, photo_path, caption, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [wp[0].id, photoPath, caption || null]
    );
    return res.json({ success: true, msg: 'Portfolio photo added', portfolioId: result.insertId, photo_path: photoPath });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/worker/portfolio/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const [rows]: any = await pool.query('SELECT photo_path FROM work_portfolios WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Portfolio photo not found' });
    const filePath = path.join(__dirname, rows[0].photo_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await pool.query('DELETE FROM work_portfolios WHERE id = ?', [id]);
    return res.json({ success: true, msg: 'Portfolio photo deleted' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/worker/document', authenticateToken, uploadDoc.single('file'), async (req: Request, res: Response): Promise<any> => {
  const { document_type } = req.body;
  const userId = (req as any).userId;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!document_type) return res.status(400).json({ error: 'document_type is required' });
  try {
    const filePath = `/uploads/documents/${req.file.filename}`;
    const [existing]: any = await pool.query(
      'SELECT id FROM worker_documents WHERE user_id = ? AND document_type = ?',
      [userId, document_type]
    );
    if (existing.length > 0) {
      await pool.query(
        "UPDATE worker_documents SET file_path = ?, status = 'pending', admin_notes = NULL, reviewed_by = NULL, reviewed_at = NULL, verified_at = NULL, updated_at = NOW() WHERE user_id = ? AND document_type = ?",
        [filePath, userId, document_type]
      );
    } else {
      await pool.query(
        "INSERT INTO worker_documents (user_id, document_type, file_path, status, created_at, updated_at) VALUES (?, ?, ?, 'pending', NOW(), NOW())",
        [userId, document_type, filePath]
      );
    }
    return res.json({ success: true, msg: 'Document uploaded for verification', file_path: filePath });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/worker/documents', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const [rows]: any = await pool.query(
      'SELECT id, document_type, file_path, status, admin_notes, created_at, verified_at FROM worker_documents WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    const requiredDocs = [
      { type: 'government_id', label: 'Government ID' },
      { type: 'nbi_clearance', label: 'NBI Clearance' },
      { type: 'barangay_clearance', label: 'Barangay Clearance' },
      { type: 'proof_of_competency', label: 'Proof of Competency' },
    ];
    const result = requiredDocs.map(rd => {
      const doc = rows.find((d: any) => d.document_type === rd.type);
      return doc ? { id: doc.id, document_type: doc.document_type, label: rd.label, file_path: doc.file_path, status: doc.status, admin_notes: doc.admin_notes, created_at: doc.created_at, verified_at: doc.verified_at }
        : { document_type: rd.type, label: rd.label, file_path: null, status: 'not_submitted', admin_notes: null, created_at: null, verified_at: null };
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/worker/location', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { latitude, longitude } = req.body;
  const userId = (req as any).userId;
  if (!userId || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'userId, latitude, and longitude are required' });
  }
  try {
    await pool.query(
      'UPDATE worker_profiles SET current_latitude = ?, current_longitude = ?, updated_at = NOW() WHERE user_id = ?',
      [latitude, longitude, userId]
    );
    return res.json({ success: true, msg: 'Location updated' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/worker/services/:serviceId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { serviceId } = req.params;
  const { is_available } = req.body;
  const userId = (req as any).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const [existing]: any = await pool.query(
      'SELECT id FROM provider_services WHERE user_id = ? AND service_id = ?',
      [userId, serviceId]
    );
    if (existing.length > 0) {
      await pool.query(
        'UPDATE provider_services SET is_available = ?, updated_at = NOW() WHERE user_id = ? AND service_id = ?',
        [is_available ? 1 : 0, userId, serviceId]
      );
    } else {
      await pool.query(
        'INSERT INTO provider_services (user_id, service_id, is_available, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [userId, serviceId, is_available ? 1 : 0]
      );
    }
    return res.json({ success: true, msg: `Service ${is_available ? 'enabled' : 'disabled'}` });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// EARNINGS (Worker)
// ──────────────────────────────────────────────
app.get('/api/earnings', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const workerId = (req as any).userId;
  if (!workerId) return res.status(400).json({ error: 'workerId is required' });
  try {
    let totalEarnings = 0;
    let totalJobs = 0;
    let weekly = [];

    try {
      const [quoteStats]: any = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total_earnings,
                COUNT(*) AS total_jobs
         FROM booking_quotes WHERE worker_id = ?`,
        [workerId]
      );
      totalEarnings = parseFloat(quoteStats[0]?.total_earnings) || 0;
      totalJobs = parseInt(quoteStats[0]?.total_jobs) || 0;

      const [weeklyQuotes]: any = await pool.query(
        `SELECT DATE(created_at) AS date, COALESCE(SUM(total_amount), 0) AS earnings
         FROM booking_quotes
         WHERE worker_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [workerId]
      );
      weekly = weeklyQuotes || [];
    } catch (e) {
      const [earningsStats]: any = await pool.query(
        `SELECT COALESCE(SUM(gross_amount), 0) AS total_earnings,
                COUNT(*) AS total_jobs
         FROM earnings WHERE worker_id = ?`,
        [workerId]
      );
      totalEarnings = parseFloat(earningsStats[0]?.total_earnings) || 0;
      totalJobs = parseInt(earningsStats[0]?.total_jobs) || 0;

      const [weeklyEarnings]: any = await pool.query(
        `SELECT DATE(e.created_at) AS date, COALESCE(SUM(e.gross_amount), 0) AS earnings
         FROM earnings e
         WHERE e.worker_id = ? AND e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY DATE(e.created_at)
         ORDER BY date`,
        [workerId]
      );
      weekly = weeklyEarnings || [];
    }

    const [bookingStats]: any = await pool.query(
      `SELECT COUNT(*) AS total_jobs,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_jobs,
              COALESCE(SUM(price), 0) AS total_earnings
       FROM bookings WHERE worker_id = ?`,
      [workerId]
    );

    const finalTotalJobs = totalJobs > 0 ? totalJobs : (bookingStats[0]?.total_jobs || 0);
    const finalTotalEarnings = totalEarnings > 0 ? totalEarnings : (parseFloat(bookingStats[0]?.total_earnings) || 0);

    return res.json({
      stats: {
        total_earnings: finalTotalEarnings,
        total_fees: 0,
        total_net: finalTotalEarnings,
        total_jobs: finalTotalJobs,
        completed_jobs: bookingStats[0]?.completed_jobs || 0,
      },
      weekly: weekly.length > 0 ? weekly : [],
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────
app.post('/api/reviews', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { booking_id, worker_id, rating, comment } = req.body;
  const client_id = (req as any).userId;
  if (!booking_id || !client_id || !worker_id || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [existing]: any = await pool.query('SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Review already exists for this booking' });
    }
    await pool.query(
      'INSERT INTO reviews (booking_id, client_id, worker_id, rating, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [booking_id, client_id, worker_id, rating, comment || null]
    );
    return res.json({ success: true, msg: 'Review submitted' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// DISPUTES
// ──────────────────────────────────────────────

app.post('/api/disputes', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { booking_id, reason } = req.body;
  const raised_by = (req as any).userId;
  if (!booking_id || !raised_by || !reason) {
    return res.status(400).json({ error: 'booking_id, raised_by, and reason are required' });
  }
  try {
    const [existing]: any = await pool.query(
      'SELECT id, status FROM disputes WHERE booking_id = ?',
      [booking_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A dispute already exists for this booking' });
    }
    const [result]: any = await pool.query(
      "INSERT INTO disputes (booking_id, raised_by, status, reason, created_at, updated_at) VALUES (?, ?, 'open', ?, NOW(), NOW())",
      [booking_id, raised_by, reason]
    );
    return res.json({ success: true, msg: 'Dispute raised', disputeId: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/disputes', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).userId;
  try {
    let query = `
      SELECT d.id, d.booking_id, d.raised_by, d.status, d.reason, d.resolution_notes, d.created_at, d.resolved_at
      FROM disputes d
    `;
    const params: any[] = [];
    if (userId) {
      query += ' JOIN bookings b ON b.id = d.booking_id WHERE (b.client_id = ? OR b.worker_id = ?)';
      params.push(userId, userId);
    }
    query += ' ORDER BY d.created_at DESC';
    const [rows]: any = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/disputes/:id', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const [rows]: any = await pool.query(
      `SELECT d.*, b.client_id, b.worker_id, b.service_category, b.status AS booking_status
       FROM disputes d
       JOIN bookings b ON b.id = d.booking_id
       WHERE d.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// PASSWORD OTP
// ──────────────────────────────────────────────

app.post('/api/password-otp/send', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { currentPassword } = req.body;
  const userId = (req as any).userId;
  if (!userId || !currentPassword) {
    return res.status(400).json({ error: 'userId and currentPassword are required' });
  }
  try {
    const [rows]: any = await pool.query('SELECT password, email FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO password_otp_tokens (user_id, token, expires_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [userId, hashedOtp, expiresAt]
    );
    console.log(`[OTP] User ${userId} (${rows[0].email}): ${otp}`);
    return res.json({ success: true, msg: 'OTP sent to your email', email: rows[0].email.replace(/(?<=.{3}).(?=.*@)/g, '*') });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/password-otp/verify', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { otp, newPassword } = req.body;
  const userId = (req as any).userId;
  if (!userId || !otp || !newPassword) {
    return res.status(400).json({ error: 'userId, otp, and newPassword are required' });
  }
  try {
    const [rows]: any = await pool.query(
      'SELECT id, token, expires_at, used FROM password_otp_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
    if (rows[0].used) return res.status(400).json({ error: 'OTP already used' });
    if (new Date(rows[0].expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });

    const valid = await bcrypt.compare(otp, rows[0].token);
    if (!valid) return res.status(401).json({ error: 'Invalid OTP' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, userId]);
    await pool.query('UPDATE password_otp_tokens SET used = 1, updated_at = NOW() WHERE id = ?', [rows[0].id]);
    return res.json({ success: true, msg: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────
app.get('/api/notifications', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const [rows]: any = await pool.query(
      `SELECT id, type, data, read_at, created_at
       FROM notifications
       WHERE notifiable_id = ? AND notifiable_type = 'App\\Models\\User'
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    const mapped = rows.map((n: any) => {
      let parsed = n.data;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
      }
      return {
        id: n.id,
        title: parsed.title || '',
        message: parsed.message || '',
        read: !!n.read_at,
        created_at: n.created_at,
      };
    });
    return res.json(mapped);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE notifications SET read_at = NOW() WHERE id = ?', [id]);
    return res.json({ success: true, msg: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// FORGOT / RESET PASSWORD
// ──────────────────────────────────────────────
app.post('/api/forgot-password', async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const [rows]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ success: true, msg: 'If the email exists, a reset link has been sent.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 12);
    await pool.query(
      'INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE token = ?, created_at = NOW()',
      [email, hashedToken, hashedToken]
    );
    return res.json({ success: true, msg: 'If the email exists, a reset link has been sent.', token });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/reset-password', async (req: Request, res: Response): Promise<any> => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [rows]: any = await pool.query(
      'SELECT token FROM password_reset_tokens WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const valid = await bcrypt.compare(token, rows[0].token);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?', [hashedPassword, email]);
    await pool.query('DELETE FROM password_reset_tokens WHERE email = ?', [email]);
    return res.json({ success: true, msg: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ──────────────────────────────────────────────
// AI / CHATBOT
// ──────────────────────────────────────────────

const AI_API_KEY = process.env.OPENROUTER_API_KEY || process.env.CHATBOT_API_KEY || '';
const AI_MODEL = 'openai/gpt-4o-mini';

const CATEGORIES = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Painting', 'Aircon', 'Landscaping', 'Laundry', 'Pest Control', 'Appliance Repair', 'Masonry', 'Personal Care', 'Moving Services'];

function callOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 700,
    });

    const req = https.request(
      {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const reply = json?.choices?.[0]?.message?.content || '';
            resolve(reply);
          } catch {
            resolve('');
          }
        });
      }
    );

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

function chatbotSystemPrompt(): string {
  return `You are KaAyos AI Assistant — a helpful support chatbot for KaAyos, a home service marketplace in Tuy, Batangas, Philippines.
Your role is to assist clients (homeowners) with finding and booking skilled workers ("trabahador").

Key facts about KaAyos:
- Service categories: Plumbing, Electrical, Carpentry, Cleaning, Painting, Roofing, Aircon Servicing, Hauling
- Workers are verified with government ID and barangay clearance before going live
- The system uses AI-assisted matching ranking workers by distance, rating, skill match, and completion rate
- KaAyos currently serves all 42 barangays of Tuy, Batangas — do not ask clients for their location, it's already Tuy
- Clients can browse workers, read reviews, chat with workers, and book directly
- Bookings go through statuses: new → accepted → en_route → in_progress → completed
- Workers can be cancelled only when status is "new" or "accepted"
- Pricing is agreed between client and worker (hourly or fixed)
- Clients must be logged in to book a worker
- Users can register as both client and worker with one account

Guidelines:
- Be friendly, concise, and helpful. Always respond in the same language as the user's latest message — if they write in English, respond in English; if Filipino, respond in Filipino.
- NEVER ask the user to clarify or "tell you more" — always respond with specific, actionable information
- If the user is vague, immediately list real service examples (plumbing, electrical, cleaning, carpentry, etc.) and ask which they need
- If you don't know something, direct the user to contact support.
- Do NOT make up pricing or availability — tell users to check worker profiles for current rates.
- Do NOT share any user's personal information.
- Do NOT ask for the client's address or location — the platform only serves Tuy, Batangas.
- Keep responses under 3 paragraphs.
- CRITICAL: Every reply must include specific service names, options, or next steps — never respond with just a question
- Suggest relevant follow-up questions when appropriate.`;
}

function getSuggestions(reply: string): string[] {
  const all = ['How do I book a worker?', 'What areas do you serve?', 'How are workers verified?', 'Can I cancel a booking?', 'How does pricing work?', 'How do I leave a review?'];
  if (!reply) return all;
  const lower = reply.toLowerCase();
  if (lower.includes('book')) return ['How do I find the right worker?', 'Can I message a worker first?', 'What if the worker doesn\'t show up?'];
  if (lower.includes('area') || lower.includes('service') || lower.includes('tuy')) return ['What services are available?', 'Do you cover nearby towns?', 'How do I book?'];
  if (lower.includes('verif') || lower.includes('document') || lower.includes('id')) return ['Why do workers need verification?', 'How do I find verified workers?', 'What if a worker has no reviews?'];
  if (lower.includes('cancel')) return ['Can I reschedule?', 'How do I contact the worker?', 'What is the refund policy?'];
  if (lower.includes('price') || lower.includes('cost') || lower.includes('fee') || lower.includes('pay')) return ['Are there any hidden fees?', 'How do I pay the worker?', 'Can I negotiate the price?'];
  if (lower.includes('review') || lower.includes('rate') || lower.includes('feedback')) return ['Can I edit my review?', 'How do ratings work?', 'Can I see reviews before booking?'];
  return all;
}

app.post('/api/chat', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const messages = [{ role: 'system', content: chatbotSystemPrompt() }];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    const reply = await callOpenRouter(messages) || 'I\'m sorry, I\'m having trouble connecting right now. Please try again later.';
    return res.json({
      success: true,
      reply,
      suggestions: getSuggestions(reply),
    });
  } catch (e: any) {
    console.error('Chat error:', e);
    return res.json({
      success: true,
      reply: 'I\'m sorry, I\'m having trouble connecting right now. Please try again later.',
      suggestions: ['How do I book a worker?', 'What areas do you serve?', 'How are workers verified?'],
    });
  }
});

// ──────────────────────────────────────────────
// AI SUGGESTION ENGINE
// ──────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractJSON(text: string, tag: string): any {
  const idx = text.indexOf(`---${tag}---`);
  if (idx === -1) return null;
  const after = text.substring(idx + tag.length + 7).trim();
  const jsonStr = after.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  const braceStart = jsonStr.indexOf('{');
  const braceEnd = jsonStr.lastIndexOf('}');
  if (braceStart === -1 || braceEnd === -1) return null;
  try {
    return JSON.parse(jsonStr.substring(braceStart, braceEnd + 1));
  } catch { return null; }
}

app.post('/api/chat/suggest', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const catsList = CATEGORIES.join(', ');

    const historyContext = (history || [])
      .map((m: any) => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const catKeywords: Record<string, string[]> = {
      'Plumbing': ['plumb', 'tubero', 'tubig', 'pipe', 'leak', 'faucet', 'sink', 'toilet', 'drain', 'banyo', 'gripo', 'poso'],
      'Electrical': ['electr', 'kuryente', 'elektrisyan', 'wire', 'wiring', 'switch', 'outlet', 'breaker', 'ilaw', 'light', 'power', 'brownout', 'kuryenteng'],
      'Carpentry': ['carpent', 'karpintero', 'wood', 'kahoy', 'cabinet', 'door', 'pinto', 'furniture', 'table', 'chair', 'shelf'],
      'Cleaning': ['clean', 'linis', 'maid', 'deep clean', 'housekeeping', 'walis', 'disinfect'],
      'Painting': ['paint', 'pintor', 'pintura', 'wall', 'repaint'],
      'Aircon': ['aircon', 'ac', 'freon', 'cooling', 'cleaning ac'],
      'Welding': ['weld', 'bakal', 'gate', 'grill', 'metal', 'welder'],
      'Masonry': ['mason', 'semento', 'cement', 'tile', 'tiling', 'hollow block'],
      'Pest Control': ['pest', 'anay', 'termite', 'ipis', 'cockroach', 'daga', 'rodent', 'fumigation'],
      'Appliance Repair': ['appliance', 'ref', 'refrigerator', 'washing machine', 'tv repair', 'appliances'],
      'Roofing': ['roof', 'bubong', 'yero', 'gutter', 'alulod'],
      'Landscaping': ['garden', 'halaman', 'grass', 'damo', 'tree', 'landscaping'],
      'Laundry': ['laundry', 'laba', 'labandera'],
      'Moving Services': ['moving', 'lipat', 'hakot', 'truck'],
    };

    const combinedMsg = (message + ' ' + (historyContext || '')).toLowerCase();
    let keywordCat: string | null = null;
    for (const [cat, words] of Object.entries(catKeywords)) {
      if (words.some(w => combinedMsg.includes(w))) {
        keywordCat = cat;
        break;
      }
    }

    const prompt = `You are a helpful and efficient AI worker-matching assistant for KaAyos in Tuy, Batangas.
Your goal is to match the client with verified local workers immediately with minimal questions.

Available categories: ${catsList}.

Conversation history:
${historyContext}
Client: ${message}

Start your response with exactly: DETECTED_LANGUAGE: English or DETECTED_LANGUAGE: Filipino (based on the latest client message).

CRITICAL DIRECT MATCH RULES:
1. IMMEDIATELY PROCEED TO SEARCH: If the client mentions ANY service name, trade, or home problem/symptom (e.g. leak, sink, wiring, breaker, carpentry, painting, cleaning, AC, welding, etc.):
   DO NOT ask confirmation questions (e.g. do not ask "Shall I recommend workers?").
   IMMEDIATELY output:
   ---SEARCH---
   {"category": "${keywordCat || 'exact category name'}", "description": "${message.replace(/"/g, '')}", "keywords": ["${keywordCat || 'service'}"]}

2. ASK MINIMAL PRECISE CONTEXT ONLY IF TOTALLY AMBIGUOUS:
   If the user just greeted or gave zero context (e.g. "Hi", "Hello", "Help me with something"):
   Ask EXACTLY ONE short, precise question: "What specific home service or repair do you need help with? (e.g., Plumbing, Electrical, Cleaning, Carpentry)"
   And output:
   ---NEED_INFO---

3. NEVER ask about budget, schedule, or location. All workers serve Tuy, Batangas.`;

    const aiMessages = [{ role: 'system', content: prompt }];
    const reply = await callOpenRouter(aiMessages);
    const cleanReply = reply.replace(/^DETECTED_LANGUAGE:\s*(English|Filipino)\s*/i, '').trim();

    // Extract search or confirm
    let searchData = extractJSON(cleanReply, 'SEARCH');
    const confirmData = extractJSON(cleanReply, 'CONFIRM');
    if (!searchData && confirmData?.category) {
      searchData = confirmData;
    }
    if (!searchData && keywordCat) {
      searchData = { category: keywordCat, description: message, keywords: [keywordCat] };
    }

    // ---SEARCH--- → query workers and proceed immediately
    if (searchData?.category) {
      const category = CATEGORIES.find(c => c.toLowerCase() === searchData.category.toLowerCase()) || searchData.category;
      const [rows]: any = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.name, u.avatar, u.barangay, u.city, u.service_category,
                wp.average_rating, wp.government_id_verified, wp.hourly_rate, wp.skills,
                wp.current_latitude, wp.current_longitude,
                (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = u.id) AS total_jobs,
                (SELECT COUNT(*) FROM bookings b WHERE b.worker_id = u.id AND b.status = 'completed') AS completed_jobs
         FROM users u
         LEFT JOIN worker_profiles wp ON wp.user_id = u.id
         WHERE u.role = 'worker' AND u.service_category = ?
         ORDER BY wp.average_rating DESC`,
        [category]
      );

      const workers = (rows as any[]).map((w: any) => {
        const distance = w.current_latitude && w.current_longitude
          ? haversine(13.8333, 120.7333, Number(w.current_latitude), Number(w.current_longitude))
          : 1.2;
        let score = 0;
        score += Math.min(Number(w.average_rating || 0) * 10, 30);
        if (w.government_id_verified) score += 20;
        score += Math.min(Number(w.total_jobs || 0), 15);
        if (w.skills) score += 10;
        const nameParts = (w.name || '').split(' ', 2);
        return {
          id: w.id,
          name: w.name,
          first_name: nameParts[0] || '',
          last_name: nameParts[1] || '',
          category: w.service_category,
          avatar: w.avatar,
          initials: ((nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '')).toUpperCase(),
          rating: Math.round(Number(w.average_rating || 0) * 10) / 10,
          verified: !!w.government_id_verified,
          price: Number(w.hourly_rate || 0),
          hourly_rate: Number(w.hourly_rate || 0),
          skills: w.skills || [],
          jobs_completed: Number(w.completed_jobs || 0),
          distance_km: Math.round(distance * 10) / 10,
          barangay: w.barangay || 'Tuy',
          city: w.city || 'Tuy, Batangas',
          location: w.barangay ? `Brgy. ${w.barangay}, Tuy` : (w.city || 'Tuy, Batangas'),
          match_percent: Math.min(Math.round(score), 99),
          score,
          latitude: Number(w.current_latitude || 13.8333),
          longitude: Number(w.current_longitude || 120.7278),
        };
      });

      workers.sort((a, b) => b.score - a.score);

      const topWorkers = workers.slice(0, 4);
      const workerLines = topWorkers.map((w, i) => `${i + 1}. ${w.name} (${w.location}) — ★ ${w.rating} · ₱${w.price}/hr (${w.match_percent}% match)`).join('\n');

      const replyPrompt = `The client needs: ${searchData.description || message}
Category: ${category}
Workers available in Tuy, Batangas:
${workerLines}

Provide a short, direct 1-2 sentence recommendation in the user's language. Mention that worker cards with location and rates are shown below.
Then on a new line put ---SUGGESTIONS--- followed by 3 pipe-separated short suggestions (e.g. Book a worker | View more details | Need another service).`;

      const replyResult = await callOpenRouter([{ role: 'system', content: replyPrompt }]);

      let finalReply = replyResult;
      let suggestions: string[] = ['Book a worker', 'View worker profile', 'Need another service'];
      if (replyResult.includes('---SUGGESTIONS---')) {
        const parts = replyResult.split('---SUGGESTIONS---', 2);
        finalReply = parts[0].trim();
        suggestions = parts[1].split('|').map(s => s.trim()).filter(Boolean);
      }

      return res.json({
        success: true,
        reply: finalReply,
        suggestions,
        workers: topWorkers,
      });
    }

    // ---NOT_AVAILABLE---
    if (cleanReply.includes('---NOT_AVAILABLE---')) {
      const msgPart = cleanReply.split('---NOT_AVAILABLE---')[0].replace(/---SUGGESTIONS---[^]*$/, '').trim();
      return res.json({
        success: true,
        reply: msgPart || `We specialize in verified home services in Tuy: ${catsList}. Which of these do you need?`,
        suggestions: ['Plumbing service', 'Electrical repair', 'House cleaning', 'Carpentry work'],
        workers: [],
      });
    }

    // Fallback if generic greeting or question: Ask ONE precise question and suggest chips
    const msgPart = cleanReply.split('---NEED_INFO---')[0].replace(/---SUGGESTIONS---.*$/s, '').trim();
    return res.json({
      success: true,
      reply: msgPart || 'What specific home service or repair do you need help with? (e.g., Plumbing, Electrical, Cleaning, Carpentry)',
      suggestions: ['Need a plumber', 'Need an electrician', 'House cleaning service', 'Carpentry repair'],
      workers: [],
    });

  } catch (e: any) {
    console.error('Suggest error:', e);
    return res.json({
      success: false,
      reply: 'Sorry, something went wrong. Please try again.',
      suggestions: ['Looking for a plumber', 'Need an electrician', 'Best rated workers'],
      workers: [],
    });
  }
});

function generateWorkerMapHtml(workers: any[]): string {
  if (!workers.length) return '';
  const markers = workers.map((w, i) => ({
    id: w.id,
    name: w.name,
    lat: w.latitude,
    lng: w.longitude,
    rating: w.rating,
    match: w.match_percent,
    category: w.category,
    initials: w.initials,
    color: w.match_percent >= 70 ? '#16a34a' : w.match_percent >= 50 ? '#d97706' : '#dc2626',
  }));

  return `
<style>*{margin:0;padding:0}html,body{height:100%}</style>
<div id="sug-map" style="height:100%;border-radius:12px;overflow:hidden"></div>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var map = L.map('sug-map').setView([13.9581, 120.7278], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var bounds = [];
  var markersData = ${JSON.stringify(markers)};
  markersData.forEach(function(w) {
    var icon = L.divIcon({
      html: '<div style="width:36px;height:36px;border-radius:10px;background:'+w.color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.2)">'+w.initials+'</div>',
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    var marker = L.marker([w.lat, w.lng], { icon: icon }).addTo(map);
    marker.bindPopup('<b>'+w.name+'</b><br/>'+w.category+'<br/>★ '+w.rating+' | '+w.match+'% match');
    bounds.push([w.lat, w.lng]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });
})();
</script>`;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KaAyos Mobile API running at http://${myIP}:${PORT}`);
});
