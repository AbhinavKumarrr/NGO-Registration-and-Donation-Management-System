require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const knex = require('knex')(require('../knexfile').development);
const { Parser } = require('json2csv');

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- AUTH MIDDLEWARE ---------------- */

function auth(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({error:'no token'});

  try{
    const token = h.replace('Bearer ','');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  }
  catch(e){
    console.log("JWT error:", e.message);
    return res.status(401).json({error:'bad token'});
  }
}

function admin(req,res,next){
  if(!req.user){
    return res.status(401).json({error:'no user in token'});
  }

  if(String(req.user.role).toLowerCase() === 'admin'){
    return next();
  }

  console.log("Blocked non-admin:", req.user);
  return res.status(403).json({error:'admin only'});
}

/* ---------------- HEALTH ---------------- */

app.get('/health',(req,res)=>{
  res.json({ok:true});
});

/* ---------------- AUTH ROUTES ---------------- */

app.post('/auth/register', async(req,res)=>{
  try {
    const {email,password,name} = req.body;
    if(!email || !password){
      return res.status(400).json({error:'email and password required'});
    }

    const hash = await bcrypt.hash(password,10);
    const id = uuid();

    await knex('users').insert({
      id,
      email,
      password_hash: hash,
      name,
      role: 'user'      // 👈 always set role
    });

    res.json({user:{id,email,name,role:'user'}});
  }
  catch(e) {
    if(e.code === 'SQLITE_CONSTRAINT_UNIQUE'){
      return res.status(409).json({error:'email already exists'});
    }
    console.error(e);
    res.status(500).json({error:'registration failed'});
  }
});

app.post('/auth/login', async(req,res)=>{
  try {
    const {email,password} = req.body;
    if(!email || !password){
      return res.status(400).json({error:'email and password required'});
    }

    const u = await knex('users').where({email}).first();
    if(!u) return res.status(401).json({error:'invalid'});

    const ok = await bcrypt.compare(password,u.password_hash);
    if(!ok) return res.status(401).json({error:'invalid'});

    const role = u.role || 'user';

    const token = jwt.sign(
      { id:u.id, role, email:u.email },
      process.env.JWT_SECRET,
      { expiresIn:'8h' }
    );

    res.json({
      token,
      user:{ id:u.id, role, email:u.email, name:u.name }
    });
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'login failed'});
  }
});

/* ---------------- REGISTRATIONS ---------------- */

app.post('/registrations', auth, async(req,res)=>{
  try {
    const id = uuid();
    await knex('registrations').insert({
      id,
      user_id:req.user.id,
      data:req.body.data || {}
    });
    res.json({id});
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'registration creation failed'});
  }
});

app.get('/registrations', auth, async(req,res)=>{
  try {
    const q = knex('registrations').select('*');

    if(req.user.role !== 'admin'){
      q.where({user_id:req.user.id});
    }

    if(req.query.email){
      q.join('users','users.id','registrations.user_id')
       .where('users.email','like',`%${req.query.email}%`);
    }

    const rows = await q.orderBy('created_at','desc');
    res.json(rows);
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'failed to fetch registrations'});
  }
});

/* ---------------- DONATIONS ---------------- */

app.post('/donations', auth, async(req,res)=>{
  try {
    const {amount_cents,registration_id,metadata} = req.body;
    if(!amount_cents || amount_cents <= 0){
      return res.status(400).json({error:'valid amount required'});
    }

    const id = uuid();
    const ref = 'PAY_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);

    await knex('donations').insert({
      id,
      user_id:req.user.id,
      registration_id,
      amount_cents,
      status:'pending',
      gateway_reference:ref,
      metadata: metadata || {}
    });

    await knex('payment_attempts').insert({
      id:uuid(),
      donation_id:id,
      status:'initiated',
      raw_response:{ created_at: new Date().toISOString() }
    });

    res.json({donation_id:id,checkout_url:'/fake/pay?ref='+ref});
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'donation creation failed'});
  }
});

app.get('/donations', auth, async(req,res)=>{
  try {
    const q = knex('donations').select('*');

    if(req.user.role !== 'admin'){
      q.where({user_id:req.user.id});
    }

    if(req.query.status) q.where({status:req.query.status});
    if(req.query.from)   q.where('created_at','>=',req.query.from);
    if(req.query.to)     q.where('created_at','<=',req.query.to);

    const rows = await q.orderBy('created_at','desc');
    res.json(rows);
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'failed to fetch donations'});
  }
});

/* ---------------- FAKE PAYMENT GATEWAY ---------------- */

app.get('/fake/pay',(req,res)=>{
  const ref = req.query.ref;
  res.send(`
    <h2>Fake Payment Gateway</h2>
    <p>Reference: ${ref}</p>
    <button onclick="send('success')">Success</button>
    <button onclick="send('failed')">Fail</button>
    <script>
      function send(status){
        fetch('/fake/confirm',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ref:'${ref}', status})
        }).then(()=>alert(status));
      }
    </script>
  `);
});

app.post('/fake/confirm', async(req,res)=>{
  try {
    const {ref,status} = req.body;
    if(!ref || !status){
      return res.status(400).json({error:'ref and status required'});
    }

    const donation = await knex('donations')
      .where({gateway_reference:ref}).first();

    if(!donation){
      return res.status(404).json({error:'not found'});
    }

    await knex('payment_attempts').insert({
      id:uuid(),
      donation_id: donation.id,
      status,
      raw_response:{ received_at: new Date().toISOString() }
    });

    await knex('donations')
      .where({id: donation.id})
      .update({status});

    res.json({ok:true});
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'payment confirmation failed'});
  }
});

/* ---------------- ADMIN APIs ---------------- */

app.get('/admin/stats', auth, admin, async(req,res)=>{
  try {
    const reg = await knex('registrations').count('* as c');
    const totalCount = await knex('donations').count('* as c');
    const sum = await knex('donations').sum('amount_cents as s');
    const byStatus = await knex('donations')
      .select('status')
      .count('* as c')
      .groupBy('status');

    res.json({
      registrations: reg[0].c,
      total_donations: totalCount[0].c,
      total_amount: sum[0].s || 0,
      byStatus
    });
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'failed to fetch stats'});
  }
});

app.get('/admin/registrations/export', auth, admin, async(req,res)=>{
  try {
    const rows = await knex('registrations')
      .select('id','user_id','data','created_at');

    const parsed = rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      data: JSON.stringify(r.data),
      created_at: r.created_at
    }));

    const csv = new Parser().parse(parsed);
    res.header('Content-Type','text/csv');
    res.attachment('registrations.csv').send(csv);
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'export failed'});
  }
});

app.get('/admin/donations', auth, admin, async(req,res)=>{
  try {
    const q = knex('donations').select('*');

    if(req.query.status) q.where({status:req.query.status});
    if(req.query.from)   q.where('created_at','>=',req.query.from);
    if(req.query.to)     q.where('created_at','<=',req.query.to);

    const rows = await q.orderBy('created_at','desc');
    res.json(rows);
  }
  catch(e) {
    console.error(e);
    res.status(500).json({error:'failed to fetch donations'});
  }
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>{
  console.log('Backend running on port', PORT);
});
