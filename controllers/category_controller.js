'use strict';

const CategoryModel = require("../models/category_model"),
  cm = new CategoryModel();

class CategoryController {
  lastCategory(req, res, next){
    cm.lastCategory((err, resQuery) => {
      if(err){
        console.log(`Hay un error en la consulta: ${err.message}`)
      }else{
        res.send(resQuery['rows'])
      }
    })
  }
  getCategory(req, res, next){
    cm.getCategory((err, resQuery) => {
      if(err){
      console.log(`Hay un error en la consulta: ${err.message}`)
      }else{
        res.send(resQuery['rows'])
      }
    })
  }
  addCategory(req, res, next){
    let data = {
      nombrec: req.body.nombrec,
      descripcion: req.body.descripcion,
      nom_encargado: req.body.nom_encargado
    }
    console.log(data)
    cm.addCategory(data, (err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta: ${err.message}`)
      else{        
        res.send('Se agrego a categoria')
      }
    })
  }
  selectOneCategory(req, res, next){
    let id = req.params.id;
    cm.selectOneCategory(id, (err, resQuery) => {
      if(!err){
        res.send(resQuery['rows'][0])
      }
    })
  }
  editCategory(req, res, next){
    let data = {
      nombrec : req.body.nombrec,
      descripcion : req.body.descripcion,
      nom_encargado : req.body.nom_encargado,
      id : req.params.id
    }
    console.log(data)

    cm.editCategory(data, (err, resQuery) => {
      if(err){
        console.log(`Hay un error en el sql: ${err.message}`)
      }else{
        res.send('Se ha editado la categoria')
      }
    })
  }
  deleteCategory(req, res, next){
    let id = req.params.id;

    cm.deleteCategory(id, (err, resQuery) => {
      if(err)
        console.log(`Hay un error en el sql: ${err.message}`)
      else{
        res.send('Se ha eliminado la categoria')        
      }
    })
  }
}

module.exports = CategoryController;