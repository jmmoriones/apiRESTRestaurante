import Category from './category/index'
import Dishes from "./dishes/index"
import Events from "./events/index"
import Comments from "./comments/index";
import page from 'page'

const mainContent = document.querySelector('#content-main')

const category = new Category(),
  dishes = new Dishes()
page('/categories', (ctx, next) => {
  mainContent.innerHTML = ''
  category.render()
})
page('/dishes', (ctx, next) => {
  mainContent.innerHTML = ''
  dishes.render()
})
page();
