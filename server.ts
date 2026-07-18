import express, { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = 3000;
const myIP = '172.20.10.11';

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

function safeJsonParse(val: any, fallback: any = null): any {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
}

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'kaayos_db',
  waitForConnections: true,
  connectionLimit: 10,
});

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

    return res.json({
      success: true,
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
    return res.json({ success: true, msg: 'Account created successfully', userId: result.insertId });
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
        `SELECT s.name, s.slug, ps.custom_price, ps.is_available
         FROM provider_services ps
         JOIN services s ON s.id = ps.service_id
         WHERE ps.user_id = ? AND ps.is_available = 1`,
        [worker.id]
      );
      const [skills]: any = await pool.query(
        `SELECT st.name FROM skill_tags st
         JOIN worker_skill_tag wst ON wst.skill_tag_id = st.id
         JOIN worker_profiles wp ON wp.id = wst.worker_profile_id
         WHERE wp.user_id = ?`,
        [worker.id]
      );
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
        services: services.map((s: any) => ({
          name: s.name,
          slug: s.slug,
          price: s.custom_price,
        })),
        skills: skills.map((s: any) => s.name),
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

    const [skills]: any = await pool.query(
      `SELECT st.name, st.slug FROM skill_tags st
       JOIN worker_skill_tag wst ON wst.skill_tag_id = st.id
       JOIN worker_profiles wp ON wp.id = wst.worker_profile_id
       WHERE wp.user_id = ?`,
      [id]
    );

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
app.get('/api/bookings', async (req: Request, res: Response): Promise<any> => {
  const { userId, role } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const column = role === 'worker' ? 'b.worker_id' : 'b.client_id';
    const [rows]: any = await pool.query(
      `SELECT b.id, b.service_category, b.scheduled_at, b.address, b.notes, b.status, b.price, b.created_at, b.completed_at,
              u.name AS other_name, u.avatar AS other_avatar
       FROM bookings b
       JOIN users u ON ${role === 'worker' ? 'b.client_id' : 'b.worker_id'} = u.id
       WHERE ${column} = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/bookings', async (req: Request, res: Response): Promise<any> => {
  const { client_id, worker_id, service_category, scheduled_at, address, notes, price } = req.body;
  if (!client_id || !worker_id || !service_category || !scheduled_at || !address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [result]: any = await pool.query(
      `INSERT INTO bookings (client_id, worker_id, service_category, scheduled_at, address, notes, status, price, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'new', ?, NOW(), NOW())`,
      [client_id, worker_id, service_category, scheduled_at, address, notes || null, price || null]
    );
    return res.json({ success: true, msg: 'Booking created', bookingId: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.patch('/api/bookings/:id/status', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { status, worker_id } = req.body;

  const validTransitions: Record<string, string[]> = {
    new: ['accepted', 'cancelled'],
    accepted: ['en_route', 'cancelled'],
    en_route: ['in_progress'],
    in_progress: ['completed'],
    completed: [],
    cancelled: [],
  };

  try {
    const [bookingRows]: any = await pool.query('SELECT status, price, worker_id FROM bookings WHERE id = ?', [id]);
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const currentStatus = bookingRows[0].status;
    const allowedNext = validTransitions[currentStatus];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowedNext.join(', ') || 'none'}` });
    }

    const extraFields = status === 'completed' ? ', completed_at = NOW()' : status === 'cancelled' ? ', cancelled_at = NOW()' : '';
    await pool.query(
      `UPDATE bookings SET status = ?${extraFields}, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    if (status === 'completed') {
      const gross = bookingRows[0].price || 0;
      const platformFeePercent = 10;
      const fee = Math.round(gross * (platformFeePercent / 100) * 100) / 100;
      const net = gross - fee;
      const wid = worker_id || bookingRows[0].worker_id;
      const [existing]: any = await pool.query('SELECT id FROM earnings WHERE booking_id = ?', [id]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO earnings (worker_id, booking_id, gross_amount, platform_fee, net_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [wid, id, gross, fee, net]
        );
      }
    }

    return res.json({ success: true, msg: `Booking ${status}` });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.patch('/api/bookings/:id/cancel', async (req: Request, res: Response): Promise<any> => {
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

app.get('/api/client/dashboard', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
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
app.get('/api/profile/:id', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const [rows]: any = await pool.query(
      'SELECT id, first_name, last_name, name, email, phone, role, service_category, city, email_notifications, language, avatar, email_verified_at FROM users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/profile/:id', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { first_name, last_name, phone, city } = req.body;
  try {
    const name = `${first_name} ${last_name}`;
    await pool.query(
      'UPDATE users SET first_name = ?, last_name = ?, name = ?, phone = ?, city = ?, updated_at = NOW() WHERE id = ?',
      [first_name, last_name, name, phone || null, city || null, id]
    );
    return res.json({ success: true, msg: 'Profile updated' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/profile/avatar', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.body;
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
app.get('/api/messages', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
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
       ORDER BY m.created_at DESC`,
      [userId, userId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/messages/send', async (req: Request, res: Response): Promise<any> => {
  const { sender_id, receiver_id, booking_id, message } = req.body;
  if (!sender_id || !receiver_id || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [result]: any = await pool.query(
      'INSERT INTO messages (booking_id, sender_id, receiver_id, message, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [booking_id || null, sender_id, receiver_id, message]
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

app.get('/api/worker/profile/:id', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
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

app.put('/api/worker/profile/:id', async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const {
    bio, skills, spoken_languages, hourly_rate, available_days,
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
          available_days = COALESCE(?, available_days), preferred_hours = COALESCE(?, preferred_hours),
          service_areas = COALESCE(?, service_areas), years_of_experience = COALESCE(?, years_of_experience),
          service_radius = COALESCE(?, service_radius), service_zone = COALESCE(?, service_zone),
          cover_photo = COALESCE(?, cover_photo), updated_at = NOW()
        WHERE user_id = ?`,
        [bio, skillsJson, langsJson, hourly_rate, daysJson, preferred_hours,
         areasJson, years_of_experience, service_radius, zoneJson, cover_photo, id]
      );
    } else {
      await pool.query(
        `INSERT INTO worker_profiles (user_id, bio, skills, spoken_languages, hourly_rate, available_days, preferred_hours, service_areas, years_of_experience, service_radius, service_zone, cover_photo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [id, bio, skillsJson, langsJson, hourly_rate, daysJson, preferred_hours,
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

app.post('/api/worker/portfolio', uploadPortfolio.single('file'), async (req: Request, res: Response): Promise<any> => {
  const { userId, caption } = req.body;
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

app.delete('/api/worker/portfolio/:id', async (req: Request, res: Response): Promise<any> => {
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

app.post('/api/worker/document', uploadDoc.single('file'), async (req: Request, res: Response): Promise<any> => {
  const { userId, document_type } = req.body;
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

app.get('/api/worker/documents', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
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

app.put('/api/worker/location', async (req: Request, res: Response): Promise<any> => {
  const { userId, latitude, longitude } = req.body;
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

app.put('/api/worker/services/:serviceId', async (req: Request, res: Response): Promise<any> => {
  const { serviceId } = req.params;
  const { userId, is_available } = req.body;
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
app.get('/api/earnings', async (req: Request, res: Response): Promise<any> => {
  const { workerId } = req.query;
  if (!workerId) return res.status(400).json({ error: 'workerId is required' });
  try {
    const [earningsStats]: any = await pool.query(
      `SELECT COALESCE(SUM(gross_amount), 0) AS total_earnings,
              COALESCE(SUM(platform_fee), 0) AS total_fees,
              COALESCE(SUM(net_amount), 0) AS total_net,
              COUNT(*) AS total_jobs
       FROM earnings WHERE worker_id = ?`,
      [workerId]
    );
    const [bookingStats]: any = await pool.query(
      `SELECT COUNT(*) AS total_jobs,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_jobs,
              COALESCE(SUM(price), 0) AS total_earnings
       FROM bookings WHERE worker_id = ?`,
      [workerId]
    );
    const [weekly]: any = await pool.query(
      `SELECT DATE(e.created_at) AS date, COALESCE(SUM(e.gross_amount), 0) AS earnings
       FROM earnings e
       WHERE e.worker_id = ? AND e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(e.created_at)
       ORDER BY date`,
      [workerId]
    );
    const totalJobs = earningsStats[0].total_jobs > 0 ? earningsStats[0].total_jobs : bookingStats[0].total_jobs;
    return res.json({
      stats: {
        total_earnings: earningsStats[0].total_earnings > 0 ? earningsStats[0].total_earnings : bookingStats[0].total_earnings,
        total_fees: earningsStats[0].total_fees,
        total_net: earningsStats[0].total_net,
        total_jobs: totalJobs,
        completed_jobs: bookingStats[0].completed_jobs,
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
app.post('/api/reviews', async (req: Request, res: Response): Promise<any> => {
  const { booking_id, client_id, worker_id, rating, comment } = req.body;
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

app.post('/api/disputes', async (req: Request, res: Response): Promise<any> => {
  const { booking_id, raised_by, reason } = req.body;
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

app.get('/api/disputes', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
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

app.get('/api/disputes/:id', async (req: Request, res: Response): Promise<any> => {
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

app.post('/api/password-otp/send', async (req: Request, res: Response): Promise<any> => {
  const { userId, currentPassword } = req.body;
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

app.post('/api/password-otp/verify', async (req: Request, res: Response): Promise<any> => {
  const { userId, otp, newPassword } = req.body;
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
app.get('/api/notifications', async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
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

app.patch('/api/notifications/:id/read', async (req: Request, res: Response): Promise<any> => {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KaAyos Mobile API running at http://${myIP}:${PORT}`);
});
