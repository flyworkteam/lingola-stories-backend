const mysql = require("mysql2/promise");
const logger = require("../utils/logger");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: "utf8mb4",
  timezone: "+00:00",
});

pool
  .getConnection()
  .then((connection) => {
    logger.info("Database connected successfully");
    connection.release();
  })
  .catch((error) => {
    logger.error("Database connection failed:", error);
    process.exit(1);
  });

pool.on("error", (err) => {
  logger.error("Database pool error:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    logger.info("Attempting to reconnect to database...");
  } else {
    throw err;
  }
});

async function query(sql, params = []) {
  const start = Date.now();
  try {
    const [results] = await pool.execute(sql, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      logger.warn(`Slow query detected (${duration}ms):`, sql.substring(0, 100));
    }

    return results;
  } catch (error) {
    logger.error("Database query error:", {
      query: sql.substring(0, 100),
      error: error.message,
    });
    throw error;
  }
}

async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getConnection() {
  return pool.getConnection();
}

module.exports = {
  pool,
  query,
  transaction,
  getConnection,
};
