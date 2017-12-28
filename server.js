const app = require('./app').app,
  server = app.listen( app.get('port'), () => console.log(`Iniciando Api RES MVC en el puerto ${app.get('port')}`) )