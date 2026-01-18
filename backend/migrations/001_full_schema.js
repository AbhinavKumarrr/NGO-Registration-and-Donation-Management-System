
exports.up = knex =>
  knex.schema
    .createTable('users', t => {
      t.uuid('id').primary();
      t.string('email').unique().notNullable();
      t.string('password_hash').notNullable();
      t.string('name');
      t.string('role').defaultTo('user');
      t.timestamps(true,true);
    })
    .createTable('registrations', t => {
      t.uuid('id').primary();
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.json('data');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('donations', t => {
      t.uuid('id').primary();
      t.uuid('registration_id').references('id').inTable('registrations').onDelete('SET NULL');
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.integer('amount_cents').notNullable();
      t.string('status').defaultTo('pending');
      t.string('gateway_reference');
      t.json('metadata');
      t.timestamps(true,true);
    })
    .createTable('payment_attempts', t => {
      t.uuid('id').primary();
      t.uuid('donation_id').references('id').inTable('donations').onDelete('CASCADE');
      t.string('status');
      t.json('raw_response');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });

exports.down = knex =>
  knex.schema.dropTableIfExists('payment_attempts')
    .dropTableIfExists('donations')
    .dropTableIfExists('registrations')
    .dropTableIfExists('users');
