import "dotenv/config";
import mysql from "mysql2/promise";

// ============================================================================
// CYBOTZ – Unified MariaDB / MySQL Database Engine
// ============================================================================
// Supports native MariaDB / MySQL on Hostinger hPanel and standard MySQL servers.
// Includes transparent in-memory fallback for offline development.
// ============================================================================

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

const dbConfig: DBConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || "3306", 10),
  user: process.env.DB_USER || process.env.MYSQL_USER || "root",
  password: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "cybotz",
};

let pool: mysql.Pool | null = null;
let isConnected = false;
let isConnecting = false;
let hasLoggedWarning = false;

// In-memory fallback store when MySQL is offline
const inMemoryStore: Record<string, any[]> = {
  users: [],
  bookings: [],
  blogs: [],
  curriculums: [],
  changelogs: [],
  otps: [],
  gallery: [],
};
let inMemoryAutoId: Record<string, number> = {
  users: 1,
  bookings: 1,
  blogs: 1,
  curriculums: 1,
  changelogs: 1,
  otps: 1,
  gallery: 1,
};

export function isDBConnected(): boolean {
  return isConnected;
}

export function getPool(): mysql.Pool | null {
  return pool;
}

const TABLE_SCHEMAS: Record<string, string> = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'viewer',
      phone VARCHAR(50) DEFAULT '',
      mustChangePassword TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  bookings: `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(100) NOT NULL UNIQUE,
      time VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      schoolName VARCHAR(255) DEFAULT '',
      additionalInfo TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  blogs: `
    CREATE TABLE IF NOT EXISTS blogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      tags LONGTEXT,
      summary TEXT NOT NULL,
      content LONGTEXT NOT NULL,
      author VARCHAR(100) DEFAULT 'Prasanna',
      date VARCHAR(100) NOT NULL,
      image TEXT,
      comments LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  curriculums: `
    CREATE TABLE IF NOT EXISTS curriculums (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      level VARCHAR(100) NOT NULL,
      duration VARCHAR(100) NOT NULL,
      targetAudience VARCHAR(100) DEFAULT 'All Students',
      summary TEXT NOT NULL,
      modules LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  changelogs: `
    CREATE TABLE IF NOT EXISTS changelogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'System',
      description TEXT NOT NULL,
      username VARCHAR(100) NOT NULL,
      role VARCHAR(50) NOT NULL,
      details LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  otps: `
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      otp VARCHAR(20) NOT NULL,
      username VARCHAR(100) NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  gallery: `
    CREATE TABLE IF NOT EXISTS gallery (
      id INT AUTO_INCREMENT PRIMARY KEY,
      page VARCHAR(50) NOT NULL,
      src TEXT NOT NULL,
      alt VARCHAR(255) DEFAULT '',
      title VARCHAR(255) DEFAULT '',
      tag VARCHAR(100) DEFAULT '',
      addedBy VARCHAR(100) DEFAULT 'Admin',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
};

export async function connectDB(silent = false): Promise<boolean> {
  if (isConnected) return true;
  if (isConnecting) {
    let checks = 0;
    while (isConnecting && checks < 20) {
      await new Promise((r) => setTimeout(r, 200));
      if (isConnected) return true;
      checks++;
    }
  }

  isConnecting = true;
  try {
    // 1. First ensure target database exists if using root/local MySQL
    const initialConfig: any = {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: 3000,
    };

    if (process.env.MYSQL_URI || process.env.DATABASE_URL) {
      pool = mysql.createPool(process.env.MYSQL_URI || process.env.DATABASE_URL!);
    } else {
      // Connect without db first to create database if necessary
      try {
        const rootConn = await mysql.createConnection(initialConfig);
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await rootConn.end();
      } catch {
        // If user has restricted privileges (e.g. Hostinger hPanel where database is pre-created)
      }

      pool = mysql.createPool({
        ...initialConfig,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    }

    // Verify connection by running a ping query
    const [result] = await pool.query("SELECT 1 AS ready");
    if (!result) throw new Error("Connection test failed");

    // Initialize all tables
    for (const [tableName, sql] of Object.entries(TABLE_SCHEMAS)) {
      await pool.query(sql);
    }

    isConnected = true;
    isConnecting = false;
    hasLoggedWarning = false;
    console.log(`[DB] MariaDB/MySQL connected successfully! (Database: "${dbConfig.database}" on ${dbConfig.host}:${dbConfig.port})`);
    return true;
  } catch (error: any) {
    isConnected = false;
    isConnecting = false;
    pool = null;
    if (!silent && !hasLoggedWarning) {
      console.warn(`\n[DB Notice] MariaDB/MySQL server not reached at ${dbConfig.host}:${dbConfig.port} (${error.message || error}).`);
      console.warn(`[DB Notice] Operating with in-memory fallback for local development.`);
      console.warn(`[DB Notice] Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env for MariaDB/MySQL on Hostinger.`);
      console.warn(`[DB Notice] Master user "Superman" is always active.\n`);
      hasLoggedWarning = true;
    }
    return false;
  }
}

// ============================================================================
// Model Wrapper Engine (Zero-Breaking Interface with Mongoose-style API)
// ============================================================================

export interface ModelOptions {
  tableName: string;
  jsonColumns?: string[];
  booleanColumns?: string[];
}

function normalizeDoc(row: any, options: ModelOptions): any {
  if (!row) return null;
  const doc: any = { ...row };
  doc.id = String(row.id);
  doc._id = String(row.id);

  if (options.jsonColumns) {
    for (const col of options.jsonColumns) {
      if (typeof doc[col] === "string") {
        try {
          doc[col] = JSON.parse(doc[col]);
        } catch {
          doc[col] = col === "comments" || col === "modules" || col === "tags" ? [] : {};
        }
      } else if (doc[col] == null) {
        doc[col] = col === "comments" || col === "modules" || col === "tags" ? [] : {};
      }
    }
  }

  if (options.booleanColumns) {
    for (const col of options.booleanColumns) {
      doc[col] = Boolean(doc[col]);
    }
  }

  // Blog comments helper
  if (Array.isArray(doc.comments)) {
    (doc.comments as any).id = function (cid: string) {
      return this.find((c: any) => String(c._id || c.id) === String(cid));
    };
  }

  doc.toObject = function () {
    return { ...this };
  };

  doc.save = async function () {
    return await updateRecord(options, { id: doc.id }, doc);
  };

  return doc;
}

function serializeDoc(data: any, options: ModelOptions): any {
  const serialized = { ...data };
  delete serialized.id;
  delete serialized._id;
  delete serialized.toObject;
  delete serialized.save;

  if (options.jsonColumns) {
    for (const col of options.jsonColumns) {
      if (serialized[col] !== undefined) {
        serialized[col] = JSON.stringify(serialized[col]);
      }
    }
  }

  if (options.booleanColumns) {
    for (const col of options.booleanColumns) {
      if (serialized[col] !== undefined) {
        serialized[col] = serialized[col] ? 1 : 0;
      }
    }
  }

  return serialized;
}

// Evaluates a MongoDB-style query filter against an in-memory row
function matchesFilter(row: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, val] of Object.entries(filter)) {
    if (key === "$or" && Array.isArray(val)) {
      const anyMatch = val.some((subFilter) => matchesFilter(row, subFilter));
      if (!anyMatch) return false;
      continue;
    }

    const rowVal = key === "_id" ? String(row.id) : row[key];

    if (val instanceof RegExp) {
      if (!val.test(String(rowVal ?? ""))) return false;
      continue;
    }

    if (val && typeof val === "object" && !Array.isArray(val)) {
      const ops = val as any;
      if (ops.$ne !== undefined) {
        if (String(rowVal) === String(ops.$ne)) return false;
      }
      if (ops.$in !== undefined && Array.isArray(ops.$in)) {
        if (!ops.$in.map(String).includes(String(rowVal))) return false;
      }
      if (ops.$regex !== undefined) {
        const flags = ops.$options || "";
        const reg = typeof ops.$regex === "string" ? new RegExp(ops.$regex, flags) : ops.$regex;
        if (!reg.test(String(rowVal ?? ""))) return false;
      }
      continue;
    }

    if (String(rowVal) !== String(val)) {
      return false;
    }
  }

  return true;
}

async function updateRecord(options: ModelOptions, filter: any, updateData: any): Promise<any> {
  const serialized = serializeDoc(updateData, options);

  if (isConnected && pool) {
    const fields = Object.keys(serialized);
    if (fields.length === 0) return null;

    const setClauses = fields.map((f) => `\`${f}\` = ?`).join(", ");
    const params: any[] = fields.map((f) => serialized[f]);

    let whereClause = "";
    if (filter.id || filter._id) {
      whereClause = "WHERE `id` = ?";
      params.push(filter.id || filter._id);
    } else if (filter.date) {
      whereClause = "WHERE `date` = ?";
      params.push(filter.date);
    } else if (filter.username) {
      whereClause = "WHERE `username` = ?";
      params.push(filter.username);
    } else {
      whereClause = "WHERE 1=1";
    }

    await pool.query(`UPDATE \`${options.tableName}\` SET ${setClauses} ${whereClause}`, params);

    // Retrieve updated record
    let getSql = `SELECT * FROM \`${options.tableName}\` ${whereClause} LIMIT 1`;
    const [rows]: any = await pool.query(getSql, params.slice(fields.length));
    return rows.length > 0 ? normalizeDoc(rows[0], options) : null;
  }

  // In-memory fallback
  const store = inMemoryStore[options.tableName];
  const idx = store.findIndex((r) => matchesFilter(r, filter));
  if (idx !== -1) {
    store[idx] = { ...store[idx], ...updateData };
    return normalizeDoc(store[idx], options);
  }
  return null;
}

export interface QueryChain<T = any> {
  sort(sortObj: Record<string, 1 | -1>): QueryChain<T>;
  limit(limitNum: number): QueryChain<T>;
  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T[] | TResult>;
}

export function createModel(options: ModelOptions) {
  const { tableName } = options;

  return {
    find(filter: any = {}, projection?: any): QueryChain {
      let sortObj: Record<string, 1 | -1> | null = null;
      let limitNum: number | null = null;

      const executeQuery = async () => {
        let results: any[] = [];

        if (isConnected && pool) {
          let whereParts: string[] = [];
          let params: any[] = [];

          for (const [key, val] of Object.entries(filter)) {
            if (key === "$or" && Array.isArray(val)) {
              const orClauses: string[] = [];
              for (const sub of val) {
                const subKey = Object.keys(sub)[0];
                const subVal = sub[subKey];
                if (subVal instanceof RegExp || (subVal && (subVal as any).$regex)) {
                  orClauses.push(`LOWER(\`${subKey}\`) LIKE ?`);
                  params.push(`%${(subVal.$regex || subVal.source || "").replace(/^\^|\$$/g, "").toLowerCase()}%`);
                } else {
                  orClauses.push(`\`${subKey}\` = ?`);
                  params.push(subVal);
                }
              }
              if (orClauses.length > 0) whereParts.push(`(${orClauses.join(" OR ")})`);
              continue;
            }

            const colName = key === "_id" ? "id" : key;

            if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof RegExp)) {
              const ops = val as any;
              if (ops.$ne !== undefined) {
                whereParts.push(`(\`${colName}\` != ? OR \`${colName}\` IS NULL)`);
                params.push(ops.$ne);
              }
              if (ops.$in !== undefined && Array.isArray(ops.$in)) {
                whereParts.push(`\`${colName}\` IN (${ops.$in.map(() => "?").join(", ")})`);
                params.push(...ops.$in);
              }
              if (ops.$regex !== undefined) {
                whereParts.push(`LOWER(\`${colName}\`) LIKE ?`);
                params.push(`%${(ops.$regex || "").toLowerCase()}%`);
              }
              continue;
            }

            if (val instanceof RegExp) {
              whereParts.push(`LOWER(\`${colName}\`) LIKE ?`);
              params.push(`%${val.source.replace(/^\^|\$$/g, "").toLowerCase()}%`);
              continue;
            }

            whereParts.push(`\`${colName}\` = ?`);
            params.push(val);
          }

          let sql = `SELECT * FROM \`${tableName}\``;
          if (whereParts.length > 0) {
            sql += ` WHERE ${whereParts.join(" AND ")}`;
          }

          if (sortObj) {
            const [sortCol, dir] = Object.entries(sortObj)[0];
            const direction = dir === -1 ? "DESC" : "ASC";
            sql += ` ORDER BY \`${sortCol === "_id" ? "id" : sortCol}\` ${direction}`;
          }

          if (limitNum !== null) {
            sql += ` LIMIT ${limitNum}`;
          }

          const [rows]: any = await pool.query(sql, params);
          results = rows.map((r: any) => normalizeDoc(r, options));
        } else {
          // In-memory fallback
          let items = inMemoryStore[tableName].filter((r) => matchesFilter(r, filter));
          if (sortObj) {
            const [sortCol, dir] = Object.entries(sortObj)[0];
            items.sort((a, b) => {
              const va = a[sortCol];
              const vb = b[sortCol];
              return dir === -1 ? (vb > va ? 1 : -1) : va > vb ? 1 : -1;
            });
          }
          if (limitNum !== null) {
            items = items.slice(0, limitNum);
          }
          results = items.map((r) => normalizeDoc(r, options));
        }

        // Handle basic projection
        if (projection && typeof projection === "object") {
          return results.map((item) => {
            const clone = { ...item };
            for (const [k, v] of Object.entries(projection)) {
              if (v === 0) delete clone[k];
            }
            return clone;
          });
        }

        return results;
      };

      let execPromise: Promise<any[]> | null = null;
      const getPromise = () => {
        if (!execPromise) {
          execPromise = executeQuery();
        }
        return execPromise;
      };

      const queryChain: any = {
        sort(s: Record<string, 1 | -1>) {
          sortObj = s;
          return queryChain;
        },
        limit(l: number) {
          limitNum = l;
          return queryChain;
        },
        then(resolve?: any, reject?: any) {
          return getPromise().then(resolve, reject);
        },
        catch(reject?: any) {
          return getPromise().catch(reject);
        },
      };

      return queryChain as QueryChain;
    },

    async findOne(filter: any = {}) {
      const results = await this.find(filter).limit(1);
      return results.length > 0 ? results[0] : null;
    },

    async findById(id: string | number) {
      if (!id) return null;
      return await this.findOne({ id: String(id) });
    },

    async create(data: any) {
      const serialized = serializeDoc(data, options);

      if (isConnected && pool) {
        const keys = Object.keys(serialized);
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => serialized[k]);

        const sql = `INSERT INTO \`${tableName}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders})`;
        const [result]: any = await pool.query(sql, values);
        const insertId = result.insertId;

        const [rows]: any = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [insertId]);
        return normalizeDoc(rows[0], options);
      }

      // In-memory fallback
      const newId = inMemoryAutoId[tableName]++;
      const newRow = {
        id: newId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryStore[tableName].push(newRow);
      return normalizeDoc(newRow, options);
    },

    async findByIdAndUpdate(id: string | number, updateData: any, _options?: any) {
      return await updateRecord(options, { id: String(id) }, updateData);
    },

    async findOneAndUpdate(filter: any, updateData: any, _options?: any) {
      return await updateRecord(options, filter, updateData);
    },

    async findByIdAndDelete(id: string | number) {
      if (isConnected && pool) {
        const [rows]: any = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [id]);
        if (rows.length === 0) return null;
        await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
        return normalizeDoc(rows[0], options);
      }

      const store = inMemoryStore[tableName];
      const idx = store.findIndex((r) => String(r.id) === String(id));
      if (idx !== -1) {
        const deleted = store.splice(idx, 1)[0];
        return normalizeDoc(deleted, options);
      }
      return null;
    },

    async findOneAndDelete(filter: any) {
      const found = await this.findOne(filter);
      if (!found) return null;
      return await this.findByIdAndDelete(found.id);
    },

    async deleteMany(filter: any = {}) {
      if (isConnected && pool) {
        let whereParts: string[] = [];
        let params: any[] = [];

        for (const [key, val] of Object.entries(filter)) {
          if (val && typeof val === "object" && (val as any).$in) {
            const arr = (val as any).$in;
            whereParts.push(`\`${key}\` IN (${arr.map(() => "?").join(", ")})`);
            params.push(...arr);
            continue;
          }
          if (val && typeof val === "object" && (val as any).$regex) {
            whereParts.push(`LOWER(\`${key}\`) LIKE ?`);
            params.push(`%${(val as any).$regex.toLowerCase()}%`);
            continue;
          }
          whereParts.push(`\`${key}\` = ?`);
          params.push(val);
        }

        let sql = `DELETE FROM \`${tableName}\``;
        if (whereParts.length > 0) sql += ` WHERE ${whereParts.join(" AND ")}`;

        const [result]: any = await pool.query(sql, params);
        return { deletedCount: result.affectedRows || 0 };
      }

      const store = inMemoryStore[tableName];
      const initialCount = store.length;
      inMemoryStore[tableName] = store.filter((r) => !matchesFilter(r, filter));
      return { deletedCount: initialCount - inMemoryStore[tableName].length };
    },

    async countDocuments(filter: any = {}) {
      if (isConnected && pool) {
        let sql = `SELECT COUNT(*) AS cnt FROM \`${tableName}\``;
        const [rows]: any = await pool.query(sql);
        return Number(rows[0]?.cnt || 0);
      }
      return inMemoryStore[tableName].filter((r) => matchesFilter(r, filter)).length;
    },
  };
}

// Export models
export const User = createModel({
  tableName: "users",
  booleanColumns: ["mustChangePassword"],
});

export const Booking = createModel({
  tableName: "bookings",
});

export const Blog = createModel({
  tableName: "blogs",
  jsonColumns: ["tags", "comments"],
});

export const Curriculum = createModel({
  tableName: "curriculums",
  jsonColumns: ["modules"],
});

export const Changelog = createModel({
  tableName: "changelogs",
  jsonColumns: ["details"],
});

export const Otp = createModel({
  tableName: "otps",
});

export const Gallery = createModel({
  tableName: "gallery",
});
