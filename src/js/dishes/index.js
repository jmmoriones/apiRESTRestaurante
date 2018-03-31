import { d, c, consultaGet, consultaPostToImage, consultaOneData, consultaPutToEdit } from "../helpers";
import template from "./template";
import Category from "../category/index";
import frm_tpl from "./formulario_tpl";

const mainContent = d.querySelector('#content-main'),
  category = new Category()

export default class Dishes {
  constructor () {
    this.deleteDishes = this.deleteDishes.bind(this)
    this.addDishes = this.addDishes.bind(this)
    this.editDishes = this.editDishes.bind(this)
  }

  addDishes (e) {
    const contentFirst = d.querySelector('#contentFirst'),
      windowModal = d.querySelector('#windowModal'),
      closeModal = d.querySelector("#closeModal")

    
    if (e.target.id === 'add-dishes') {
      e.preventDefault()
      windowModal.classList.remove('block-or-not')

      category.selectAllCategory()
        .then(categorys => {
          contentFirst.insertAdjacentHTML('beforeend', frm_tpl(categorys))
          const form = document.getElementById("formDishes"),
            message = d.getElementById('message'),
            btnSubmitEdit = d.getElementById('inputSave')
          form.addEventListener('submit', e => {
            e.preventDefault()
            c( e )
            const formData = new FormData()
            formData.append('nombrep', e.target[0].value)
            formData.append('descripcion', document.querySelector('#descripcion-plato').value)
            formData.append('dificultad', e.target[2].value)
            formData.append( 'photo', e.target[3].files[0], 'logo.png' )
            formData.append('precio', e.target[4].value)
            formData.append('categoria', e.target[5].value)
            consultaPostToImage('http://localhost:4000/addDishes',formData, message)
          })
          btnSubmitEdit.style.display = 'none'
        })      
    }
    closeModal.addEventListener('click', () => {
      contentFirst.innerHTML = ""
      windowModal.classList.add('block-or-not')
    })
  }

  selectOneDishe (id) {
    return fetch(`http://localhost:4000/getOneDishe/${id}`)
      .then(response => response.json())
  }

  editDishes (e) {
    const contentFirst = d.querySelector('#contentFirst'),
      windowModal = d.querySelector('#windowModal'),
      closeModal = d.querySelector("#closeModal"),
      id = e.target.dataset.id
    if (e.target.id === 'edit-dishes') {
      e.preventDefault()
      windowModal.classList.remove('block-or-not')
      category.selectAllCategory()
        .then(categorys => {
          contentFirst.insertAdjacentHTML('beforeend', frm_tpl(categorys))
          const btnAdd = d.getElementById('btnAdd'),
            btnSubmitEdit = d.getElementById('inputSave')
          
          btnSubmitEdit.addEventListener('click', e => {
            e.preventDefault()
            const formDishes = d.getElementById('formDishes'),
              inputs = formDishes.querySelectorAll('[required]'),
              hid_photo = d.getElementById('hid_photo')
            c(inputs, hid_photo.value)
            const formData = new FormData()
            formData.append('nombrep', inputs[0].value)
            formData.append('descripcion', inputs[1].value)
            formData.append('dificultad', inputs[2].value)
            formData.append('photo', inputs[3].files[0], 'logo.png' )
            formData.append('precio', inputs[4].value)
            formData.append('categoria', inputs[5].value)
            formData.append('id', id)
            formData.append('imagen_hdn', hid_photo.value)
            c(consultaPutToEdit('http://localhost:4000/editDishe/', id, formData))
            
          })

          btnAdd.style.display = 'none'
        })
      consultaOneData('http://localhost:4000/getOneDishe/',id)
      .then(response => {
          const formDishes = d.getElementById('formDishes'),
            inputs = formDishes.querySelectorAll('[required]'),
            hid_photo = d.getElementById('hid_photo')
          inputs[0].value = response[0].nombrep
          inputs[1].value = response[0].descripcion
          inputs[2].value = response[0].dificultad
          //inputs[3].files = response[0].foto
          inputs[4].value = response[0].precio
          inputs[5].value = response[0].nombrec
          hid_photo.value = response[0].foto

          c(response, inputs, hid_photo.value)
        })
    }
    closeModal.addEventListener('click', () => {
      contentFirst.innerHTML = ""
      windowModal.classList.add('block-or-not')
    })
  }

  deleteDishes (e) {
    if (e.target.id === 'delete-dishes') {
      const id = e.target.attributes[1].nodeValue;
      fetch(`http://localhost:4000/deleteDishes/${id}`,{
        method: 'DELETE',
        headers : new Headers({'Content-Type': 'application/json'})
      })
        .then(response => {
          console.log( response )
          if (response.statusText === 'OK') {
            message.innerHTML = 'Se ha eliminado con exito la categoria'
            message.classList.add('delete')
            message.classList.remove('block-or-not')
            setTimeout(() => {
              message.classList.add('block-or-not')   
            }, 5000)
          }
        })
        .catch(mgs => console.log(mgs))
    }
  }

  render () {

    /*async function asyncLoad(ctx){
      try{
        ctx.data = await fetch('http://localhost:4000/dishesAll').then(res => res.json())
      }catch(e){
        return c(e)
      }
    }*/
    mainContent.insertAdjacentHTML('beforeend', template())
    let bodyTable = d.getElementById('body-table')
    let templateHtml = (c) => {
      return `<article class="card-article">
        <div class="div1 div-dishes">
          <figcaption class="content-image">
            <img src="images/platos/${c.foto}" />
          </figcaption>
          <div class="div1-content">
            <h3 class="article-title">${c.nombrep}</h3>
            <p class="article-description">${c.descripcion}</p>
            <span>${c.precio}</span>
            <span>${c.dificultad}</span>
          </div>
        </div>
        <div class="div2">
        <button class="btn btn-success" data-id="${c.id}" id="edit-dishes">Editar</button>
        <button class="btn btn-danger" data-id="${c.id}" id="delete-dishes">Eliminar</button>
        </div>
      </article>`
    }
    consultaGet('http://localhost:4000/dishesAll', templateHtml, bodyTable)

    mainContent.addEventListener('click', this.deleteDishes)
    mainContent.addEventListener('click', this.addDishes)
    mainContent.addEventListener('click', this.editDishes)
  }
}