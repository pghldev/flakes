let bcrypt = require('bcryptjs')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('user', t => {
    t.increments();
    t.boolean('approved').defaultTo(false);
    t.string('username');
    t.string('email');
    t.string('password');
    t.unique('username');
  });

  await knex('user').insert({
    approved: true,
    username: 'admin',
    password: (await bcrypt.hash('admin', 12))
  });

  await knex.schema.createTable('state', t => {
    t.increments();
    t.string('key');
    t.string('value', 1000);
    t.unique('key');
  });

  await knex.schema.createTable('setting', t => {
    t.increments();
    t.string('field');
    t.string('value', 1000);
    t.unique('field');
  });

  await knex.schema.createTable('key', t => {
    t.increments();
    t.string('code', 100);
    t.unique('code');
  });

  await knex.schema.createTable('donation', t => {
    t.increments();
    t.string('name');
    t.datetime('when');
    t.string('amount');
    t.boolean('approved');
    t.string('comment', 1000);
  });

  await knex.schema.createTable('sessions', t => {
    t.string('sid', 32).primary();
    t.text('sess').notNull();
    t.datetime('expired').notNull();
    t.index('expired');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTable('user');
  await knex.schema.dropTable('state');
  await knex.schema.dropTable('setting');
  await knex.schema.dropTable('key');
  await knex.schema.dropTable('donation');
};
