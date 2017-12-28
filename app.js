'use strict';

const express = require('express'),
  pug = require('pug'),
  bodyParser = require('body-parser'),
  favicon = require('serve-favicon')(`${__dirname}/public/favicon.png`),
  morgan = require('morgan'),
  restFul = require('express-method-override')('_method'),
  routes = require('./routes/routes'),
  publicDir = express.static(`${__dirname}/public`),
  viewDir = `${__dirname}/views`,
  port = (process.env.PORT || 3000),
  multer = require('multer'),
  path = require('path')

let app = express();

app
  .set( 'views', viewDir )
  .set( 'view engine', 'pug' )
  .set('port', port )


  .use( bodyParser.json() )
  .use( bodyParser.urlencoded({extended: true}) )
  .use( publicDir )
  .use( favicon )
  .use( morgan('dev') )
  .use( restFul )
  .use( routes );

// module.exports  = app;
module.exports = {app:app, multer:multer};