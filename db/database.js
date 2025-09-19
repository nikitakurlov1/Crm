const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'crypto_data.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Database utility functions
const dbUtils = {
  // Execute a query with parameters
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  },
  
  // Get a single row
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },
  
  // Get all rows
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

// Initialize database tables
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                lastLogin TEXT,
                createdAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
                reject(err);
                return;
            }
        });

        // Create accounts table
        db.run(`
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                balance TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating accounts table:', err);
                reject(err);
                return;
            }
        });

        // Create coins table
        db.run(`
            CREATE TABLE IF NOT EXISTS coins (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                symbol TEXT NOT NULL,
                price REAL NOT NULL,
                priceChange REAL,
                marketCap REAL,
                volume REAL,
                category TEXT,
                status TEXT DEFAULT 'active',
                description TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating coins table:', err);
                reject(err);
                return;
            }
        });

        // Create price_history table for tracking price changes
        db.run(`
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                coinId TEXT NOT NULL,
                price REAL NOT NULL,
                priceChange REAL,
                marketCap REAL,
                volume REAL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (coinId) REFERENCES coins (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating price_history table:', err);
                reject(err);
                return;
            }
        });

        // Create user_portfolio table for storing user's cryptocurrency holdings
        db.run(`
            CREATE TABLE IF NOT EXISTS user_portfolio (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                coinSymbol TEXT NOT NULL,
                coinName TEXT NOT NULL,
                balance REAL NOT NULL DEFAULT 0,
                averageBuyPrice REAL NOT NULL DEFAULT 0,
                totalInvested REAL NOT NULL DEFAULT 0,
                lastUpdated TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id),
                UNIQUE(userId, coinSymbol)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating user_portfolio table:', err);
                reject(err);
                return;
            }
        });

        // Create portfolio_transactions table for tracking all portfolio operations
        db.run(`
            CREATE TABLE IF NOT EXISTS portfolio_transactions (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                coinSymbol TEXT NOT NULL,
                transactionType TEXT NOT NULL,
                amount REAL NOT NULL,
                price REAL NOT NULL,
                totalValue REAL NOT NULL,
                fee REAL NOT NULL DEFAULT 0,
                balance REAL NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'completed',
                FOREIGN KEY (userId) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating portfolio_transactions table:', err);
                reject(err);
                return;
            }
        });

        // Create requisites table
        db.run(`
            CREATE TABLE IF NOT EXISTS requisites (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                number TEXT NOT NULL,
                bank TEXT NOT NULL,
                holder TEXT NOT NULL,
                status TEXT NOT NULL,
                description TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating requisites table:', err);
                reject(err);
                return;
            }
        });

        // Create roles table
        db.run(`
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                permissions TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating roles table:', err);
                reject(err);
                return;
            }
        });

        // Create user_roles table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_roles (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                roleId TEXT NOT NULL,
                assignedBy TEXT NOT NULL,
                assignedAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id),
                FOREIGN KEY (roleId) REFERENCES roles (id),
                FOREIGN KEY (assignedBy) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating user_roles table:', err);
                reject(err);
                return;
            }
        });

        // Create activity_log table
        db.run(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id TEXT PRIMARY KEY,
                userId TEXT,
                action TEXT NOT NULL,
                entityType TEXT,
                entityId TEXT,
                details TEXT,
                ipAddress TEXT,
                userAgent TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating activity_log table:', err);
                reject(err);
                return;
            }
            
            console.log('✅ All database tables initialized successfully');
            resolve();
        });
    });
};

// Optimized user functions
const getUserByEmail = async (email) => {
    try {
        return await dbUtils.get('SELECT * FROM users WHERE email = ?', [email]);
    } catch (error) {
        console.error('Error getting user by email:', error);
        throw error;
    }
};

const getUserByUsername = async (username) => {
    try {
        return await dbUtils.get('SELECT * FROM users WHERE username = ?', [username]);
    } catch (error) {
        console.error('Error getting user by username:', error);
        throw error;
    }
};

const getUserById = async (id) => {
    try {
        return await dbUtils.get('SELECT * FROM users WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
};

const getAllUsers = async () => {
    try {
        return await dbUtils.all('SELECT * FROM users ORDER BY createdAt DESC');
    } catch (error) {
        console.error('Error getting all users:', error);
        throw error;
    }
};

const createUser = async (user) => {
    try {
        await dbUtils.run(`
            INSERT INTO users (id, username, email, password, status, notes, lastLogin, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user.id,
            user.username,
            user.email,
            user.password,
            user.status,
            user.notes,
            user.lastLogin,
            user.createdAt
        ]);
        return user;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

const updateUser = async (id, updates) => {
    try {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        await dbUtils.run(`
            UPDATE users SET ${setClause} WHERE id = ?
        `, [...values, id]);
        
        return await getUserById(id);
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

const deleteUser = async (id) => {
    try {
        await dbUtils.run('DELETE FROM users WHERE id = ?', [id]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

const updateUserLastLogin = async (id) => {
    try {
        await dbUtils.run('UPDATE users SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), id]);
        return await getUserById(id);
    } catch (error) {
        console.error('Error updating user last login:', error);
        throw error;
    }
};

// Optimized account functions
const createAccount = async (account) => {
    try {
        await dbUtils.run(`
            INSERT INTO accounts (id, userId, balance, createdAt)
            VALUES (?, ?, ?, ?)
        `, [
            account.id,
            account.userId,
            JSON.stringify(account.balance),
            account.createdAt
        ]);
        return account;
    } catch (error) {
        console.error('Error creating account:', error);
        throw error;
    }
};

const getAccountByUserId = async (userId) => {
    try {
        const account = await dbUtils.get('SELECT * FROM accounts WHERE userId = ?', [userId]);
        if (account) {
            account.balance = JSON.parse(account.balance);
        }
        return account;
    } catch (error) {
        console.error('Error getting account by user ID:', error);
        throw error;
    }
};

const updateAccount = async (userId, newBalance) => {
    try {
        await dbUtils.run(`
            UPDATE accounts 
            SET balance = ?, createdAt = ? 
            WHERE userId = ?
        `, [JSON.stringify(newBalance), new Date().toISOString(), userId]);
        
        return await getAccountByUserId(userId);
    } catch (error) {
        console.error('Error updating account:', error);
        throw error;
    }
};

// Optimized coin functions
const saveCoin = async (coin) => {
    try {
        await dbUtils.run(`
            INSERT OR REPLACE INTO coins 
            (id, name, symbol, price, priceChange, marketCap, volume, category, status, description, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            coin.id,
            coin.name,
            coin.symbol,
            coin.price,
            coin.priceChange,
            coin.marketCap,
            coin.volume,
            coin.category,
            coin.status,
            coin.description,
            coin.createdAt,
            coin.updatedAt
        ]);
        return coin;
    } catch (error) {
        console.error('Error saving coin:', error);
        throw error;
    }
};

const getAllCoins = async () => {
    try {
        return await dbUtils.all('SELECT * FROM coins WHERE status = "active" ORDER BY marketCap DESC');
    } catch (error) {
        console.error('Error getting all coins:', error);
        throw error;
    }
};

const getCoinById = async (id) => {
    try {
        return await dbUtils.get('SELECT * FROM coins WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error getting coin by ID:', error);
        throw error;
    }
};

const updateCoin = async (id, updates) => {
    try {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        await dbUtils.run(`
            UPDATE coins SET ${setClause}, updatedAt = ? WHERE id = ?
        `, [...values, new Date().toISOString(), id]);
        
        return await getCoinById(id);
    } catch (error) {
        console.error('Error updating coin:', error);
        throw error;
    }
};

const deleteCoin = async (id) => {
    try {
        await dbUtils.run('UPDATE coins SET status = "inactive" WHERE id = ?', [id]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting coin:', error);
        throw error;
    }
};

const savePriceHistory = async (coinId, priceData) => {
    try {
        await dbUtils.run(`
            INSERT INTO price_history 
            (coinId, price, priceChange, marketCap, volume, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            coinId,
            priceData.price,
            priceData.priceChange,
            priceData.marketCap,
            priceData.volume,
            new Date().toISOString()
        ]);
        return { success: true };
    } catch (error) {
        console.error('Error saving price history:', error);
        throw error;
    }
};

const getPriceHistory = async (coinId, limit = 100) => {
    try {
        return await dbUtils.all(`
            SELECT * FROM price_history 
            WHERE coinId = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `, [coinId, limit]);
    } catch (error) {
        console.error('Error getting price history:', error);
        throw error;
    }
};

// Optimized requisite functions
const createRequisite = async (requisite) => {
    try {
        await dbUtils.run(`
            INSERT INTO requisites 
            (id, type, name, number, bank, holder, status, description, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            requisite.id,
            requisite.type,
            requisite.name,
            requisite.number,
            requisite.bank,
            requisite.holder,
            requisite.status,
            requisite.description,
            requisite.createdAt,
            requisite.updatedAt
        ]);
        return requisite;
    } catch (error) {
        console.error('Error creating requisite:', error);
        throw error;
    }
};

const getAllRequisites = async () => {
    try {
        return await dbUtils.all('SELECT * FROM requisites WHERE status = "active" ORDER BY createdAt DESC');
    } catch (error) {
        console.error('Error getting all requisites:', error);
        throw error;
    }
};

const getRequisiteById = async (id) => {
    try {
        return await dbUtils.get('SELECT * FROM requisites WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error getting requisite by ID:', error);
        throw error;
    }
};

const updateRequisite = async (id, requisite) => {
    try {
        const fields = Object.keys(requisite);
        const values = Object.values(requisite);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        await dbUtils.run(`
            UPDATE requisites SET ${setClause}, updatedAt = ? WHERE id = ?
        `, [...values, new Date().toISOString(), id]);
        
        return await getRequisiteById(id);
    } catch (error) {
        console.error('Error updating requisite:', error);
        throw error;
    }
};

const deleteRequisite = async (id) => {
    try {
        await dbUtils.run('UPDATE requisites SET status = "inactive" WHERE id = ?', [id]);
        return { success: true };
    } catch (error) {
        console.error('Error deleting requisite:', error);
        throw error;
    }
};

// Optimized role functions
const createRole = async (role) => {
    try {
        await dbUtils.run(`
            INSERT INTO roles (id, name, description, permissions, createdAt)
            VALUES (?, ?, ?, ?, ?)
        `, [
            role.id,
            role.name,
            role.description,
            JSON.stringify(role.permissions),
            role.createdAt
        ]);
        return role;
    } catch (error) {
        console.error('Error creating role:', error);
        throw error;
    }
};

const getAllRoles = async () => {
    try {
        const roles = await dbUtils.all('SELECT * FROM roles ORDER BY createdAt DESC');
        return roles.map(role => {
            role.permissions = JSON.parse(role.permissions);
            return role;
        });
    } catch (error) {
        console.error('Error getting all roles:', error);
        throw error;
    }
};

const getRoleByName = async (name) => {
    try {
        const role = await dbUtils.get('SELECT * FROM roles WHERE name = ?', [name]);
        if (role) {
            role.permissions = JSON.parse(role.permissions);
        }
        return role;
    } catch (error) {
        console.error('Error getting role by name:', error);
        throw error;
    }
};

const assignRoleToUser = async (userRole) => {
    try {
        await dbUtils.run(`
            INSERT INTO user_roles (id, userId, roleId, assignedBy, assignedAt)
            VALUES (?, ?, ?, ?, ?)
        `, [
            userRole.id,
            userRole.userId,
            userRole.roleId,
            userRole.assignedBy,
            userRole.assignedAt
        ]);
        return userRole;
    } catch (error) {
        console.error('Error assigning role to user:', error);
        throw error;
    }
};

const getUserWithRoles = async (userId) => {
    try {
        const user = await getUserById(userId);
        if (!user) return null;
        
        const roles = await dbUtils.all(`
            SELECT r.* FROM roles r
            JOIN user_roles ur ON r.id = ur.roleId
            WHERE ur.userId = ?
        `, [userId]);
        
        user.roles = roles.map(role => {
            role.permissions = JSON.parse(role.permissions);
            return role;
        });
        
        // Create a consolidated permissions object
        user.allPermissions = {};
        user.roles.forEach(role => {
            Object.keys(role.permissions).forEach(resource => {
                if (!user.allPermissions[resource]) {
                    user.allPermissions[resource] = {};
                }
                Object.keys(role.permissions[resource]).forEach(action => {
                    if (role.permissions[resource][action]) {
                        user.allPermissions[resource][action] = true;
                    }
                });
            });
        });
        
        return user;
    } catch (error) {
        console.error('Error getting user with roles:', error);
        throw error;
    }
};

const logActivity = async (activity) => {
    try {
        await dbUtils.run(`
            INSERT INTO activity_log 
            (id, userId, action, entityType, entityId, details, ipAddress, userAgent, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            activity.id,
            activity.userId,
            activity.action,
            activity.entityType,
            activity.entityId,
            JSON.stringify(activity.details),
            activity.ipAddress,
            activity.userAgent,
            activity.createdAt
        ]);
        return activity;
    } catch (error) {
        console.error('Error logging activity:', error);
        throw error;
    }
};

// Export all functions
module.exports = {
    initializeDatabase,
    getUserByEmail,
    getUserByUsername,
    getUserById,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    updateUserLastLogin,
    createAccount,
    getAccountByUserId,
    updateAccount,
    saveCoin,
    getAllCoins,
    getCoinById,
    updateCoin,
    deleteCoin,
    savePriceHistory,
    getPriceHistory,
    createRequisite,
    getAllRequisites,
    getRequisiteById,
    updateRequisite,
    deleteRequisite,
    createRole,
    getAllRoles,
    getRoleByName,
    assignRoleToUser,
    getUserWithRoles,
    logActivity
};
