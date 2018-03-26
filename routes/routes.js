'use strict';

const CategoryController = require('../controllers/category_controller'),
  DishesController = require('../controllers/dishes_controller'),
  IngredientsController = require('../controllers/ingredients_controller'),
  EventController = require('../controllers/event_controller'),
  CommentController = require('../controllers/comment_controller'),
  express = require('express'),
  router = express.Router(),
  cc = new CategoryController(),
  dc = new DishesController(),
  ic = new IngredientsController(),
  ec = new EventController(),
  cmc = new CommentController();

router 
  .get('/categories', (req, res) => {
    res.render('../src/views/index')
  })
  .get('/dishes', (req, res) => {
    res.render('../src/views/index')
  })
  .get('comments', (req, res) => {
    res.render('../src/views/index')
  })
  .get('/events', (req, res) => {
    res.render('../src/views/index')
  })
  .get('/ingredients', (req, res) => {
    res.render('../src/views/index')
  })
  .get('/editando/:id', (req, res) => {
    res.render('../src/views/index')
  })
  //Categoria
  .get('/', cc.home)
  .get('/lastCategories', cc.lastCategory)
  .get('/categoryAll', cc.getCategory)
  .post('/addCategory', cc.addCategory)
  .get('/selectOneCategory/:id', cc.selectOneCategory)
  .put('/editCategory/:id', cc.editCategory)
  .delete('/deleteCategory/:id', cc.deleteCategory)
  //platos
  .get('/lastDishes', dc.lastDishes)
  .get('/dishesAll', dc.getDishes)
  .post('/addDishes', dc.addDishes)
  .get('/getOneDishe/:id', dc.getOneDishe)
  .put('/editDishe/:id', dc.editDishes)
  .delete('/deleteDishes/:id', dc.deleteDishes)
  //ingredientes
  .get('/getDishes', ic.getDishes)
  .post('/addIngredients/:id', ic.addIngredient)
  .get('/getOneIngredient/:id', ic.getOneIngredient)
  //eventos
  .get('/getLastEvents', ec.getLastEvents)
  .get('/getAllEvents', ec.getAllEvents)
  .get('/getOneEvent/:id', ec.getOneEvent)
  .post('/addEvent', ec.addEvent)
  .put('/editEvent/:id', ec.editEvent)
  .delete('/deleteEvent/:id', ec.deleteEvent)
  //comentarios
  .get('/getAllComment', cmc.getAllComment)
  .get('/getOneComment/:id', cmc.getOneComment)
  .post('/addComment', cmc.addComment)
  .put('/editComment/:id', cmc.editComment)
  .delete('/deleteComment/:id', cmc.deleteComment)

module.exports = router;