import sassMiddleware from 'node-sass-middleware'
import express from 'express'
import pug from 'pug'
import bodyParser from 'body-parser'
import favicon from 'serve-favicon'
import morgan from 'morgan'
import routes from './routes/routes'
import multer from 'multer'
import path from 'path'
//import restFul from 'express-method-override'

const restFul = require('express-method-override')('_method'),
  publicDir = `${__dirname}/public`,
  viewDir = `${__dirname}/views`,
  port = (process.env.PORT || 4000),
  faviconDir = `${__dirname}/public/favicon.png`,
  env = 'development',
  app = express()

app
  .set( 'views', viewDir )
  .set( 'view engine', 'pug' )
  .set('port', port )
  .set( 'env', env )

  .use(sassMiddleware({
      src: `${__dirname}/src/scss`,
      dest: publicDir,
      debug: false,
      outputStyle: 'compressed',
  }))
  .use( express.static(publicDir) )
  .use( bodyParser.json() )
  .use( bodyParser.urlencoded({extended: true}) )
  .use( favicon(faviconDir) )
  .use( morgan('dev') )
  .use( restFul )
  .use( routes )

module.exports = {app:app, multer:multer};