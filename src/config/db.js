

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',        
  host: 'localhost',
  database: 'reports_db', 
  password: 'F123123',
  port: 5432,
});

module.exports = pool;
