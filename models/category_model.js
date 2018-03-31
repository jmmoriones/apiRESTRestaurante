'use strict';

const client = require('./model');

class CategoryModel {
  lastCategory(cb){
    client.query('SELECT * FROM categorias ORDER BY nombrec DESC LIMIT 3 OFFSET 0', cb)
  }
  getCategory(cb){
    client.query('SELECT * FROM categorias ORDER BY id DESC', cb)
  }
  addCategory(data, cb){
    client.query('INSERT INTO categorias(nombrec, descripcion, nom_encargado) VALUES (($1), ($2), ($3))', [data.nombrec, data.descripcion, data.nom_encargado], cb)
  }
  selectOneCategory(id, cb){
    client.query("SELECT * FROM categorias WHERE id = "+id, cb)
  }
  editCategory(data, cb){
    client.query('UPDATE categorias SET descripcion=($1), nom_encargado=($2) WHERE id = ($3)', [data.descripcion, data.nom_encargado, data.id], cb)
  }
  deleteCategory(id, cb){
    client.query('DELETE FROM categorias WHERE id=($1)', [id], cb) 
  }
}

module.exports = CategoryModel