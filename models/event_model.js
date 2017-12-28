'use strict'
const client = require('./model')

class EventModel {
  getLastEvents(cb){
    client.query('SELECT * FROM eventos ORDER BY id LIMIT 3 OFFSET 0', cb)
  }
  getAllEvents(cb){
    client.query('SELECT nombre, descripcion, imagen, id FROM eventos ORDER BY id DESC', cb)
  }
  getOneEvent(id, cb){
    client.query('SELECT nombre, descripcion, imagen, id FROM eventos WHERE id=($1)', [id], cb)
  }
  addEvent(data, cb){
    client.query('INSERT INTO eventos(nombre, descripcion, imagen) VALUES(($1), ($2), ($3))', [data.titulo, data.descripcion, data.foto], cb)
  }
  editEvent(data, cb){
    client.query('UPDATE eventos SET nombre=($1), descripcion=($2), imagen=($3) WHERE id = ($4)', [data.titulo, data.descripcion, data.imagen, data.id], cb)
  }
  deleteEvent(id, cb){
    client.query('DELETE FROM eventos WHERE id=($1)', [id], cb)
  }
}

module.exports = EventModel;