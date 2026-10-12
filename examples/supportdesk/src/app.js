'use strict';
const express=require('express');
const session=require('express-session');
const path=require('node:path');
const {Modulith}=require('@ojs/modulith');
const {createObservability}=require('@ojs/observability');
const {initializeDatabase}=require('./database');
const {ensureCsrf}=require('./security');
const routers=require('./routers');

async function buildApp(options={}) {
  const secret=options.sessionSecret||process.env.SESSION_SECRET;
  if(typeof secret!=='string'||secret.length<32) throw Error('SESSION_SECRET must be at least 32 characters');
  const observer=createObservability({logFile:options.logFile});
  const modules=new Modulith();
  modules.register({name:'database',factory:()=>({
    ...initializeDatabase(options.databasePath),
    async stop(){this.close();}
  })});
  modules.register({name:'auth',dependencies:['database'],factory:({database},ctx)=>({
    router:routers.emailLogin(database,observer,ctx.events)
  })});
  modules.register({name:'tickets',dependencies:['database','auth'],factory:({database})=>({
    router:routers.ticketRoutes(database)
  })});
  modules.register({name:'profile',dependencies:['database','auth'],factory:({database})=>({
    router:routers.profileRoutes(database)
  })});
  modules.register({name:'knowledge-base',dependencies:['auth'],factory:()=>({
    router:routers.kbRoutes()
  })});
  modules.register({name:'admin',dependencies:['database','auth'],factory:({database})=>({
    router:routers.adminRoutes(database)
  })});
  modules.register({name:'dashboard',dependencies:['database','auth'],factory:({database})=>({
    router:routers.dashboardRoutes(database)
  })});
  await modules.start();
  const app=express();
  app.disable('x-powered-by');
  app.set('trust proxy',process.env.TRUST_PROXY==='1'?1:false);
  app.set('views',path.join(__dirname,'..','views'));
  app.set('view engine','ejs');
  app.use(express.urlencoded({extended:false,limit:'20kb'}));
  // Only the stylesheet is publicly served. KB HTML requires authentication
  // through /kb/view, never direct static access.
  app.get('/style.css', (_req, res) => res.sendFile(path.join(__dirname,'..','public','style.css')));
  app.use(session({secret,saveUninitialized:false,resave:false,
    cookie:{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='1',maxAge:60*60*1000}}));
  app.use(observer.middleware);
  app.use(ensureCsrf);
  app.get('/health',(_req,res)=>res.json({status:'ok'}));
  app.get('/metrics',(_req,res)=>res.set('Content-Type','text/plain; version=0.0.4; charset=utf-8').send(observer.metrics()));
  app.get('/',(_req,res)=>res.redirect('/login'));
  app.use('/',modules.get('auth').router);
  for(const [prefix,name] of [['/tickets','tickets'],['/profile','profile'],['/kb','knowledge-base'],
      ['/admin','admin'],['/dashboard','dashboard']]) app.use(prefix,modules.get(name).router);
  app.use((err,req,res,_next)=>{
    req.securityEvent?.('application_error',{level:'ERROR',status_code:500,message:'Unhandled error'});
    if(!res.headersSent)res.status(500).send('Internal server error');
  });
  return {app,modules,observer,shutdown:()=>modules.stop()};
}
module.exports={buildApp};
