
require('dotenv').config();
const knex = require('knex')(require('../knexfile').development);
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
(async()=>{
  const hash = await bcrypt.hash('admin123',10);
  const exists = await knex('users').where({email:'admin@example.com'}).first();
  if(!exists){
    await knex('users').insert({id:uuid(),email:'admin@example.com',password_hash:hash,name:'Admin',role:'admin'});
    console.log('Admin created: admin@example.com / admin123');
  } else {
    console.log('Admin already exists');
  }
  process.exit();
})().catch(e=>{console.error(e); process.exit(1)});
