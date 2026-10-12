'use strict';
const {buildApp}=require('./src/app');
if(require.main===module){
  buildApp().then(({app,shutdown})=>{
    const server=app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>{
      process.stdout.write('OJS SupportDesk ready on port '+server.address().port+'\n');
    });
    async function stop(){server.close(async()=>{await shutdown();process.exit(0);});}
    process.on('SIGTERM',stop);process.on('SIGINT',stop);
  }).catch(err=>{console.error(err);process.exitCode=1;});
}
module.exports={buildApp};
