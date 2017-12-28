const multer = require('./app').multer;
const path = require('path')

var storagePlato = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, './public/images/platos')
  },
  filename: function(req, file, callback) {
    console.log(file)
    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})
var uploadPlato = multer({
  storage: storagePlato,
  fileFilter: function(req, file, callback) {
    var ext = path.extname(file.originalname)
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
      return callback(res.end('Only images are allowed'), null)
    }
    callback(null, true)
  }
}).single('photo')


var storageEvento = multer.diskStorage({
  destination: (req, file, callback) =>{
    callback(null, './public/images/eventos')
  },
  filename: (req, file, callback) => {
    console.log(file)
    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})
var uploadEvento = multer({
  storage: storageEvento,
  fileFilter: function(req, file, callback) {
    var ext = path.extname(file.originalname)
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
      return callback(res.end('Only images are allowed'), null)
    }
    callback(null, true)
  }
}).single('imagen')


var storageComment = multer.diskStorage({
  destination: (req, file, callback) =>{
    callback(null, './public/images/comment')
  },
  filename: (req, file, callback) => {
    console.log(file)
    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})
var uploadComment = multer({
  storage: storageComment,
  fileFilter: function(req, file, callback) {
    var ext = path.extname(file.originalname)
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
      return callback(res.end('Only images are allowed'), null)
    }
    callback(null, true)
  }
}).single('foto')

// console.log(multer)

module.exports = {
  uploadPlato : uploadPlato,
  uploadEvento : uploadEvento,
  uploadComment : uploadComment
}