let path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });


var knexConfiguration = {
  client: 'sqlite3',
  connection: process.env.SQLITE_CONNECTION || path.join(__dirname, 'database.db'),
  useNullAsDefault: true
  // client: 'mysql',
  // connection: {
  //   user: process.env['user'],
  //   password: process.env['password'],
  //   database: process.env['database']
  // }
};

if (process.env.MYSQL_CONNECTION)
  knexConfiguration = {
    client: 'mysql',
    connection: process.env.MYSQL_CONNECTION
  };


module.exports = {
  baseUrl: '/snowflakes',
  title: process.env.TITLE || 'Flakes',
  cookieSecret: process.env.COOKIE_SECRET || 'keyboards cat',
  knexConfiguration
};
