// Update with your config settings.

var config = require('./config')

/**
 * //@type { Object.<string, import("knex").Knex.Config> }
 * @type { import("knex").Knex.Config }
 */
module.exports = config.knexConfiguration;
