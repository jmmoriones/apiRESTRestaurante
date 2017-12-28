const IngredientsModel = require('../models/ingredients_model'),
  im = new IngredientsModel()

class IngredientsController {
  getDishes(req, res, next){
    im.getDishes((err, resQuery) => {
      if(err)
        console.log(`Hay un erro en la consulta sql, el error es: ${err.message}`)
      else{
        res.send(resQuery['rows'])    
      }
    })
  }
  addIngredient(req, res, next){
    let data = {
      nombrei : req.body.nombre_ingrediente,
      almacen : req.body.almacen_ingrediente,
      unidades : req.body.unidades_ingrediente
    }
    console.log(data)
    let id = req.params.id;
    im.addIngredient(data, id, (err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta sql: ${err.message}`)
      else{
        res.send("Se ha agregado el ingrediente")
        console.log("Se ha agregado el ingrediente")
      }
    })
  }
  getOneIngredient(req, res, next){
    let id = req.params.id;
    console.log(id)
    im.getOneIngredient(id, (err, resQuery) => {
      if(err)
        console.log(`Hay un erro en la consulta sql`)
      else{
        res.send( resQuery['rows'] )
      }
    })
  }
}

module.exports = IngredientsController;