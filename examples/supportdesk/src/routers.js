'use strict';
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { verifyPassword, safeDocument, suspectSqlInput, TYPES } = require('@ojs/security-events');
const { scopeRepository } = require('@ojs/orm');
const { requireUser, requireAdmin, sessionUser } = require('./security');
function emailLogin(data, observer, events) {
  const router = express.Router();
  router.get('/login', (req,res) => req.session.userId ? res.redirect('/dashboard') : res.render('login', {error:false,user:null}));
  router.post('/login', (req,res,next) => {
    const email = typeof req.body.email === 'string' ? req.body.email.slice(0,254) : '';
    const password = req.body.password;
    const user = email ? data.users.get({email}) : null;
    if (!user || !verifyPassword(password, user.password)) {
      req.securityEvent(TYPES.AUTH_FAILURE, {level:'WARN',status_code:401,user:email,message:'Invalid credentials'});
      events.publish('auth.failure', { ip:req.ip }).catch(next);
      return res.status(401).render('login', {error:true,user:null});
    }
    req.session.regenerate(error=>{
      if (error) return next(error);
      Object.assign(req.session,{userId:user.id,username:user.username,role:user.role,
        display_name:user.display_name,theme:user.theme});
      req.securityEvent(TYPES.AUTH_SUCCESS, {status_code:200,user:user.username,message:'Login accepted'});
      events.publish('auth.success', { userId:user.id }).catch(next);
      return res.redirect('/dashboard');
    });
  });
  router.post('/logout', requireUser, (req,res,next) => req.session.destroy(error => error ? next(error) : res.redirect('/login')));
  // Legacy GET /logout never changes state; explicit POST + CSRF is required.
  router.get('/logout', requireUser, (_req,res) => res.redirect('/dashboard'));
  return router;
}
function ticketRoutes(data) {
  const router = express.Router();
  router.use(requireUser);
  function visible(req) {
    const items = data.tickets.list({}, {limit:1000, orderBy:'created_at', desc:true});
    return req.session.role === 'admin' ? items : items.filter(t=>t.created_by===req.session.userId || t.assigned_to===req.session.userId);
  }
  function guardedTicket(req,res) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {res.status(404).send('Ticket not found');return null;}
    const ticket = data.tickets.get({id});
    if (!ticket) {res.status(404).send('Ticket not found');return null;}
    if (req.session.role!=='admin' && ticket.created_by!==req.session.userId && ticket.assigned_to!==req.session.userId) {
      req.securityEvent(TYPES.ACCESS_DENIED,{status_code:403,resource_id:id,message:'Ticket access denied'});
      res.status(403).send('Access denied');return null;
    }
    return ticket;
  }
  function decorate(ticket) {
    const creator = data.users.get({id:ticket.created_by});
    const assignee = ticket.assigned_to ? data.users.get({id:ticket.assigned_to}) : null;
    return {...ticket, creator_name:creator?.username,creator_display_name:creator?.display_name,assignee_name:assignee?.username};
  }
  function renderList(req,res,items,search='',filters={}) {
    res.render('tickets',{user:sessionUser(req),tickets:items.map(decorate),search,filters,
      viewMine: req.query.view==='mine'});
  }
  router.get('/',(req,res)=>{
    const status = String(req.query.status||''), priority=String(req.query.priority||'');
    const order = String(req.query.sort||'created_at');
    const desc = req.query.dir !== 'asc';
    if (status && !['open','in_progress','resolved','closed'].includes(status)) return res.status(400).send('Invalid status');
    if (priority && !['urgent','high','medium','low'].includes(priority)) return res.status(400).send('Invalid priority');
    if (!['id','title','status','priority','created_at','updated_at'].includes(order)) {
      req.securityEvent('suspicious_parameter',{message:'Invalid sort parameter'});
      return res.status(400).send('Invalid sort');
    }
    let items=visible(req);
    if (req.query.view==='mine') items=items.filter(t=>t.created_by===req.session.userId);
    if (status)items=items.filter(t=>t.status===status);
    if (priority)items=items.filter(t=>t.priority===priority);
    items.sort((a,b)=>{const x=String(a[order]??''),y=String(b[order]??'');return (desc?-1:1)*x.localeCompare(y);});
    renderList(req,res,items,'',{status,priority,sort:order,dir:desc?'DESC':'ASC'});
  });
  router.post('/search',(req,res)=>{
    const search = typeof req.body.search==='string'? req.body.search.slice(0,200):'';
    if(suspectSqlInput(search)) req.securityEvent(TYPES.SUSPICIOUS_SQL_INPUT,{message:'Suspicious search pattern blocked by parameterized data access'});
    renderList(req,res,visible(req).filter(t=>(String(t.title)+' '+String(t.description)).toLowerCase().includes(search.toLowerCase())),search,{});
  });
  router.get('/:id/export',(req,res)=>{
    const ticket=guardedTicket(req,res); if(!ticket)return;
    const comments=data.comments.list({ticket_id:ticket.id},{orderBy:'created_at',limit:1000});
    const lines=['TICKET #'+ticket.id,'Title: '+ticket.title,'Status: '+ticket.status,'Priority: '+ticket.priority,
      'Description: '+(ticket.description||'N/A'),'','COMMENTS ('+comments.length+')'];
    for (const c of comments) lines.push('['+c.created_at+'] '+c.content);
    res.attachment('ticket-'+ticket.id+'.txt').type('text/plain').send(lines.join('\n'));
  });
  router.get('/:id',(req,res)=>{
    const ticket=guardedTicket(req,res);if(!ticket)return;
    const comments=data.comments.list({ticket_id:ticket.id},{orderBy:'created_at',limit:1000})
      .map(c=>({...c, author_name:data.users.get({id:c.author_id})?.username||'?'}));
    res.render('ticket',{user:sessionUser(req),ticket:decorate(ticket),comments});
  });
  router.post('/:id/comment',(req,res)=>{
    const ticket=guardedTicket(req,res);if(!ticket)return;
    const content=req.body.content;
    if(typeof content!=='string'||!content.trim()||content.length>5000)return res.status(400).send('Invalid comment');
    data.comments.create({ticket_id:ticket.id,author_id:req.session.userId,content:content.trim(),created_at:new Date().toISOString()});
    res.redirect('/tickets/'+ticket.id);
  });
  return router;
}
function profileRoutes(data) {
  const router=express.Router();router.use(requireUser);
  router.get('/',(req,res)=>res.render('profile',{user:scopeRepository(data.users,{id:req.session.userId}).get({})}));
  router.post('/',(req,res)=>{
    const {display_name,theme}=req.body;
    if(typeof display_name!=='string'||display_name.length>100||!['light','dark'].includes(theme))
      return res.status(400).send('Invalid profile');
    scopeRepository(data.users,{id:req.session.userId}).update({},{display_name,theme});
    req.session.display_name=display_name;req.session.theme=theme;res.redirect('/profile');
  });
  return router;
}
function kbRoutes() {
  const router=express.Router(),folder=path.join(__dirname,'..','public','kb');router.use(requireUser);
  router.get('/',(req,res)=>{
    const files=fs.readdirSync(folder).filter(f=>/^[\w-]+\.html$/.test(f));
    res.render('kb',{user:sessionUser(req),files});
  });
  router.get('/view',(req,res)=>{
    const file=safeDocument(folder,req.query.doc);
    if(!file){req.securityEvent(TYPES.BLOCKED_PATH_TRAVERSAL,{status_code:404,message:'Invalid knowledge-base path'});return res.status(404).send('Document not found');}
    res.render('kb-view',{user:sessionUser(req),doc:req.query.doc,content:fs.readFileSync(file,'utf8')});
  });
  return router;
}
function adminRoutes(data){
  const router=express.Router();router.use(requireUser,requireAdmin);
  router.get('/',(req,res)=>{
    const users=data.users.list({}, {limit:1000}).map(({id,username,email,role})=>({id,username,email,role}));
    res.render('admin',{user:sessionUser(req),users});
  });
  router.post('/fetch',(req,res)=>{
    req.securityEvent(TYPES.BLOCKED_SSRF,{status_code:403,message:'Remote fetch feature disabled'});
    res.status(403).send('Remote URL fetching disabled');
  });
  return router;
}
function dashboardRoutes(data){
  const router=express.Router();
  router.get('/',requireUser,(req,res)=>{
    let tickets=data.tickets.list({}, {limit:1000,orderBy:'created_at',desc:true});
    if(req.session.role!=='admin') tickets=tickets.filter(t=>t.created_by===req.session.userId || t.assigned_to===req.session.userId);
    const stats={total:tickets.length,open:tickets.filter(t=>t.status==='open').length,
      inProgress:tickets.filter(t=>t.status==='in_progress').length,
      urgent:tickets.filter(t=>t.priority==='urgent').length};
    const recent=tickets.slice(0,5).map(t=>({...t,creator_name:data.users.get({id:t.created_by})?.username}));
    res.render('dashboard',{user:sessionUser(req),stats,recent});
  });return router;
}
module.exports={emailLogin,ticketRoutes,profileRoutes,kbRoutes,adminRoutes,dashboardRoutes};
