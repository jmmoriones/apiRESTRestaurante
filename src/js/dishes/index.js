import { d, c } from "../helpers";
import template from "./template";
import Category from "../category/index";

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
    let formulario = (category) => `<h2 class="text-center">Agregando plato</h2>
      <form id="formDishes" enctype="multipart/form-data">
        <div class="form-group">
          <label for="nombre-plato">Nombre</label>
          <input id="nombre-plato" class="form-control" name="nombrep" type="text" placeholder="Platos americanos">
        </div>
        <div class="form-group">
          <label for="nombre-plato">Nombre</label>
          <textarea id="descripcion-plato" class="form-control" name="descripcion", rows="3", placeholder="Esta receta ...."></textarea>
        </div>
        <div class="form-group">
          <label for="inlineFormCustomSelect" class="mr-sm-2">Dificultad</label>
          <select class="custom-select mb-2 mr-sm-2 mb-sm-0" id="inlineFormCustomSelect" name="dificultad">
            <option selected> - - -</option>
            <option value="1" name="dificultad-1">1</option>
            <option value="2" name="dificultad-2">2</option>
            <option value="3" name="dificultad-3">3</option>
            <option value="4" name="dificultad-4">4</option>
            <option value="5" name="dificultad-5">5</option>
          </select>
        </div>
        <div class="form-group">
          <label for="foto-dishes">Foto</label>
          <input type="file" id="foto-dishes" class="form-control" name="photo" accept="image/*">
        </div>
        <div class="form-group">
          <label id="precio-plato">Plato</label>
          <input id="precio-plato" class="form-control" name="precio" type="text", placeholder="10.00">
        </div>
        <div class="form-group" name="categoria">
          <select class="form-control">
            <option selected>- - -</option>
            ${category.map(c => `
              <option value="${c.nombrec}">${c.nombrec}</option>`
            )}
          </select>
        </div>
        <button class="btn btn-primary" type="submit">Guardar</button>
        <!--<input type="submit" value="send" />-->
      </form>`
    if (e.target.id === 'add-dishes') {
      windowModal.classList.remove('block-or-not')
      fetch('http://localhost:4000/categoryAll')
        .then(response => response.json())
        .then(category => {
          console.log(category)
          contentFirst.insertAdjacentHTML('beforeend', formulario(category))
          const form = document.getElementById("formDishes")
          form.addEventListener('submit', e => {

            const formData = new FormData()
            formData.append('nombrep', e.target[0].value)
            formData.append('descripcion', document.querySelector('#descripcion-plato').value)
            formData.append('dificultad', e.target[2].value)
            formData.append( 'photo', e.target[3].files[0], 'logo.png' )
            formData.append('precio', e.target[4].value)
            formData.append('categoria', e.target[5].value)

            fetch('http://localhost:4000/addDishes', {
              method: 'POST',
              body : formData
            })
              .then(response => {
                c(response)
              })
          })
        });
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
      windowModal.classList.remove('block-or-not')

      let formulario = (dishe) => `<h2 class="text-center">Agregando plato</h2>
      <form id="formDishes" enctype="multipart/form-data">
        <div class="form-group">
          <label for="nombre-plato">Nombre</label>
          <input id="nombre-plato" class="form-control" name="nombrep" type="text" placeholder="Platos americanos" value="${dishe.nombrep}">
        </div>
        <div class="form-group">
          <label for="nombre-plato">Nombre</label>
          <textarea id="descripcion-plato" class="form-control" name="descripcion", rows="3", placeholder="Esta receta ....">${dishe.descripcion}</textarea>
        </div>
        <div class="form-group">
          <label for="inlineFormCustomSelect" class="mr-sm-2">Dificultad</label>
          <select class="custom-select mb-2 mr-sm-2 mb-sm-0" id="inlineFormCustomSelect" name="dificultad">
            <option value="${dishe.dificultad}" selected>${dishe.dificultad}</option>
            <option value="1" name="dificultad-1">1</option>
            <option value="2" name="dificultad-2">2</option>
            <option value="3" name="dificultad-3">3</option>
            <option value="4" name="dificultad-4">4</option>
            <option value="5" name="dificultad-5">5</option>
          </select>
        </div>
        <div class="form-group">
          <label for="foto-dishes">Foto</label>
          <input type="file" id="foto-dishes" class="form-control" name="photo" accept="image/*">
          <!--<img src="images/platos/${dishe.foto}" />-->
        </div>
        <div class="form-group">
          <label id="precio-plato">Plato</label>
          <input id="precio-plato" class="form-control" name="precio" type="text", placeholder="10.00" value="${dishe.precio}">
        </div>
        <div class="form-group" name="categoria">
          <select class="form-control">
            <option selected>${dishe.nombrec}</option>
          </select>
        </div>
        <button class="btn btn-primary" type="submit">Guardar</button>
        <!--<input type="submit" value="send" />-->
      </form>`
      this.selectOneDishe(id)
        .then(response => {
          contentFirst.insertAdjacentHTML('beforeend', formulario(response[0]))
        })
      /*category.selectAllCategory()
        .then(response => {
          c(response)
        })*/
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
    fetch('http://localhost:4000/dishesAll')
      .then( response => response.json() )
      .then(dishes => {
        console.log( dishes )
        mainContent.insertAdjacentHTML('beforeend', template(dishes))
      })
      .catch(msg => console.log(msg))
    
    mainContent.addEventListener('click', this.deleteDishes)
    mainContent.addEventListener('click', this.addDishes)
    mainContent.addEventListener('click', this.editDishes)
  }
}