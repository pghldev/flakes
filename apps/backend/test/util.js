var fs = require('fs');
var Knex = require('knex');

var lib = require('../lib');
var { up, down } = lib.db.schema;

async function getKnex() {
  var knex = Knex({
    client: 'sqlite3',
    connection: ':memory:',
    pool: {
      min: 1,
      max: 1,
      // disposeTimeout: 360000*1000,
      idleTimeoutMillis: 360000*1000
    },
    useNullAsDefault: true
  });
  await up(knex);
  return knex;
}

module.exports = {
  getKnex,
};
