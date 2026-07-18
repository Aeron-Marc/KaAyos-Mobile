const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: '', database: 'kaayos_db' });
  const [tables] = await conn.query('SHOW TABLES');
  const names = tables.map(t => Object.values(t)[0]);
  console.log('Existing tables:', names.join(', '));

  if (!names.includes('messages')) {
    await conn.query(`CREATE TABLE messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      booking_id BIGINT UNSIGNED DEFAULT NULL,
      sender_id BIGINT UNSIGNED NOT NULL,
      receiver_id BIGINT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      read_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT NULL,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('Created messages table');
  }
  if (!names.includes('reviews')) {
    await conn.query(`CREATE TABLE reviews (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      booking_id BIGINT UNSIGNED NOT NULL,
      client_id BIGINT UNSIGNED NOT NULL,
      worker_id BIGINT UNSIGNED NOT NULL,
      rating TINYINT UNSIGNED NOT NULL,
      comment TEXT DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT NULL,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY (booking_id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('Created reviews table');
  }
  if (!names.includes('earnings')) {
    await conn.query(`CREATE TABLE earnings (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      worker_id BIGINT UNSIGNED NOT NULL,
      booking_id BIGINT UNSIGNED NOT NULL,
      gross_amount DECIMAL(10,2) NOT NULL,
      platform_fee DECIMAL(10,2) NOT NULL,
      net_amount DECIMAL(10,2) NOT NULL,
      paid_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT NULL,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY (booking_id),
      FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('Created earnings table');
  }
  await conn.end();
  console.log('Database initialization complete');
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
