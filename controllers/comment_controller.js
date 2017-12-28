const CommentModel = require('../models/comment_model'),
  cm = new CommentModel();

class CommentController {
  getAllComment(req, res, next){
    cm.getAllComment((err, resQuery) => {
      if(err)
        console.log( `Hay un error en la consulta sql: ${err.message}` )
      else{
        res.send( resQuery['rows'] )
      }
    })
  }

  getOneComment(req, res, next){
    let id = req.params.id;
    cm.getOneComment(id, (err, resQuery) => {
      if(err)
        console.log( `Hay un error en la consulta sql: ${err.message}` )
      else{
        res.send( resQuery['rows'] )
      }
    })
  }

  addComment(req, res, next){
    const multer = require('../multer').uploadComment
    multer(req, res, (err) => {
      let data = {
        nombre : req.body.nombre,
        comentario : req.body.descripcion,
        foto : req.file.filename
      }

      cm.addComment(data, (err, resQuery) => {
        if(err)
          console.log( `Hay un error en la consulta sql: ${err.message}` )
        else{
          res.send('Se agredo el comentario')
        }
      })
    })
  }

  editComment(req, res, next){
    const multer = require('../multer').uploadComment
    multer(req, res, (err) => {
      let data = {
        nombre: req.body.nombre,
        comentario: req.body.descripcion,
        foto: (req.file == undefined) ? req.body.imagen_hdn : req.file.filename,
        id: req.body.id
      }
      cm.editComment(data, (err, resQuery) => {
        if(err)
          console.log( `Hay un error en la consulta sql: ${err.message}` )
        else{
          res.send('Se edito el comentario')
        }
      })
    })
  }

  deleteComment(req, res, next){
    let id = req.params.id;
    cm.deleteComment(id, (err, resQuery) => {
      if(err)
        console.log( `Hay un error en la consulta sql: ${err.message}` )
      else{
        res.send('Se elimino el comentario')
      }
    })
  }
}

module.exports = CommentController;