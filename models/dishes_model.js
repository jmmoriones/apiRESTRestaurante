'use strict';

const client = require('./model');

class DishesModel {
  lastDishes(cb){
    client.query('SELECT * FROM platos ORDER BY nombrep DESC LIMIT 3 OFFSET 0',cb)
  }
  getDishes(cb){
    client.query('SELECT * FROM platos ORDER BY id DESC', cb)
  }
  addDishes(data, cb){
    client.query('INSERT INTO platos (nombrep, descripcion, dificultad, foto, precio, nombrec, id) VALUES (($1), ($2), ($3), ($4), ($5), ($6), DEFAULT)', [data.nombrep, data.descripcion, data.dificultad, data.foto, data.precio, data.nombrec], cb)
  }
  deleteDishes(id, cb){
    client.query('DELETE FROM platos WHERE id=($1)', [id], cb)
  }
  getOneDishe(id){
    /*client.query('SELECT nombrep, descripcion, dificultad, foto, precio, nombrec FROM platos WHERE id = ($1)', [id], cb)
    client.query('SELECT nombrec, id FROM categorias', cb2)*/
    client.query('SELECT nombrep, descripcion, dificultad, foto, precio, nombrec FROM platos WHERE id = ($1)', [id], (err, resQuery) => {
      client.query('SELECT nombrec, id FROM categorias', (err, resCategoria) => {
        if(err)
          console.log(`Hay un error en la consulta: ${err.message}`)
        else{
          console.log(resQuery['rows'],
            resCategoria['rows'])
        }
      })
    })
  }
  editDishe(data, cb){
    client.query('UPDATE platos SET nombrep=($1), descripcion=($2), dificultad=($3), foto=($4), precio=($5), nombrec=($6) WHERE id = ($7)', [data.nombrep, data.descripcion, data.dificultad, data.photo, data.precio, data.categoria, data.id])
  }
}

module.exports = DishesModel;