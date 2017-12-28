const EventModel = require('../models/event_model'),
  em = new EventModel()

class EventController {
  getLastEvents(req, res, next){
    em.getLastEvents((err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta sql: ${err.message}`)
      else{
        res.send( resQuery['rows'] )
      }
    })
  }

  getAllEvents(req, res, next){
    em.getAllEvents((err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta sql: ${err.message}`)
      else{
        res.send( resQuery['rows'] )
      }
    })
  }

  getOneEvent(req, res, next){
    let id = req.params.id;
    em.getOneEvent(id, (err, resQuery) => {
      if(err)
        console.log( `Hay un error en la consulta sql: ${err.message}` )
      else{
        res.send( resQuery['rows'] )
      }
    })
  }

  addEvent(req, res, next){
    const multer = require('../multer').uploadEvento;
    multer(req, res, function(err){
      let data = {
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        foto : req.file.filename
      }


      em.addEvent(data, (err, resQuery) => {
        if(err)
          console.log(`Hay un error en la consulta sql: ${err.message}`)
        else{
          res.send( 'Se ha agregado un evento' )
          console.log( 'Se ha agregado un evento' )
        }
      })
    })
  }

  editEvent(req, res, next){
    const multer = require('../multer').uploadEvento;
    multer(req, res, function(err) {
      let data = {
        titulo : req.body.titulo,
        descripcion : req.body.descripcion,
        id: req.body.id,
        //imagen : req.body.imagen_hdn
        imagen : (req.file == undefined) ? req.body.imagen_hdn : req.file.filename
      }

      em.editEvent(data, (err, resQuery) => {
        if(err)
          console.log(`Hay un error en la consulta sql: ${err.message}`)
        else{
          res.send( 'Se edito el plato' )
        }
      })
    })
  }
  deleteEvent(req, res, next){
    let id = req.params.id;
    em.deleteEvent(id, (err, resQuery) => {
      if(err)
        console.log(`Hay un error en la consulta sql: ${err.message}`)
      else{
        res.send( 'Se elimino el evento' )
      }
    })
  }
}

module.exports = EventController;