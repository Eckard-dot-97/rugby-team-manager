import mysql from "mysql2/promise";

// Reuse a single pool across hot reloads / serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

export const pool =
  global._mysqlPool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== "production") {
  global._mysqlPool = pool;
}
