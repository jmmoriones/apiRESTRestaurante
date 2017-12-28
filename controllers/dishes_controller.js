'use strict';

const DishesModels = require('../models/dishes_model'),
  dm = new DishesModels();

class DishesController {
  lastDishes(req, res, next){
    dm.lastDishes((err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta sql: ${err.message}`)
      else{
        res.send(resQuery['rows'])
      }
    })
  }
  getDishes(req, res, next){
    dm.getDishes((err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta sql: ${err.message}`)
      else{
        res.send(resQuery['rows'])
      }
    })
  }
  addDishes(req, res, next){
    const multer = require('../multer').uploadPlato;
    multer(req, res, function(err){
      let data = {
        nombrep : req.body.nombrep,
        descripcion : req.body.descripcion,
        dificultad : req.body.dificultad,
        photo : req.file.filename,
        precio : req.body.precio,
        categoria : req.body.categoria
      }
      console.log(data)
      dm.addDishes(data, (err, resQuery) => {
        if(err)
          console.log(`Hay un error en la consulta sql: ${err.message}`)
        else{
          res.send('Se agrego el plato')
        }
      })
    })
  }
  deleteDishes(req, res, next){
    let id = req.params.id;
    dm.deleteDishes(id, (err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta: ${err.message}`)
      else
        res.send('Se ha eliminado el plato')
    })
  }
  getOneDishe(req, res, next){
    let id = req.params.id;
    dm.getOneDishe(id)
  }
  editDishe(req, res, next){
    const multer = require('../multer').uploadPlato;
    multer(req, res, function(err){
      let data = {
        nombrep : req.body.nombrep,
        descripcion : req.body.descripcion,
        dificultad : req.body.dificultad,
        photo: (req.file == undefined) ? req.body.imagen_hdn : req.file.filename,
        precio : req.body.precio,
        categoria : req.body.categoria,
        id : req.body.id
      }
      console.log(data)
      dm.editDishe(data, (err, resQuery) => {
        if(err)
          console.log(`Hay un error en la consulta: ${err.message}`)
        else{
          res.send('Se edito el plato')
          console.log('Se edito el plato')
        }
      })
    })
  }
}

module.exports = DishesController;