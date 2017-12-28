'use strict'

const client = require('./model')

class CommentModel {
  getAllComment(cb){
    client.query('SELECT id, nombre, comentario, foto FROM comentarios ORDER BY id DESC', cb)
  }
  getOneComment(id, cb){
    client.query('SELECT nombre, comentario, foto, id FROM comentarios WHERE id=($1)', [id], cb)
  }
  addComment(data, cb){
    client.query('INSERT INTO comentarios(nombre, comentario, foto) VALUES (($1), ($2), ($3))', [data.nombre, data.comentario, data.foto], cb)
  }
  editComment(data, cb){
    client.query('UPDATE comentarios SET nombre=($1), comentario=($2), foto=($3) WHERE id = ($4)', [data.nombre, data.comentario, data.foto, data.id], cb)
  }
  deleteComment(id, cb){
    client.query('DELETE FROM comentarios WHERE id=($1)', [id], cb)
  }
}

module.exports = CommentModel;