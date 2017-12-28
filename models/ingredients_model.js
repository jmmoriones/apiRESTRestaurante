'use strict';

const client = require('./model')

class IngredientsModel {
  getDishes(cb){
    client.query('SELECT id, nombrep, nombrec FROM platos', cb)
  }
  addIngredient(data, id_plato, cb){
    client.query('INSERT INTO ingredientes(nombrei, almacen, unidades) VALUES (($1), ($2), ($3))', [data.nombrei, data.almacen, data.unidades], (err, resQuery) => {
      client.query('INSERT INTO utiliza(id_plato, nombre_ingrediente) VALUES(($1), ($2))', [id_plato, data.nombrei], cb)
    })
  }
  getOneIngredient(id, cb){
    client.query('SELECT u.id_plato, u.nombre_ingrediente, i.nombrei, i.almacen, i.unidades FROM utiliza AS u INNER JOIN ingredientes AS i ON u.nombre_ingrediente = i.nombrei AND u.id_plato = ($1)', [id], cb)
  }
}

module.exports = IngredientsModel;