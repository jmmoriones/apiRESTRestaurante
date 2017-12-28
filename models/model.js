'use strict';

const {Client} = require('pg'),
  conf = require('./db-conf'),
  client = new Client({
    user : conf.postgrest.user,
    host : conf.postgrest.host,
    database : conf.postgrest.database,
    password : conf.postgrest.password,
    port : conf.postgrest.port
  })

client.connect()

module.exports = client;