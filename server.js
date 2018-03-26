import http from 'http'
const app = require('./app').app
import reload from 'ack-reload'
//import { app } from './app'

const server = http.createServer(app)

//console.log( app )

if ( app.get('env')  === 'development' ) {
  app.use( reload.middleware(`${__dirname}/public`, server) )
}
server.listen( app.get('port'), () => console.log(`Iniciando Api RES MVC en el puerto ${app.get('port')}`) )