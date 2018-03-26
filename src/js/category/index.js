import { d } from '../helpers'
import template from "./template";
import { page } from "page";

const mainContent = document.querySelector('#content-main')
export default class Category {
  constructor () {
    this.editCategory = this.editCategory.bind(this)
    this.save = this.save.bind(this)
    this.addCategory = this.addCategory.bind(this)
  }
  selectAllCategory () {
    return fetch('http://localhost:4000/categoryAll')
      .then(response => response.json())
      .then(response)
  }

  selectOnCategory (id) {
    return fetch(`http://localhost:4000/selectOneCategory/${id}`)
      .then(response => response.json())
  }

  save (e) {
    e.preventDefault()
    const message = d.querySelector('#message')
    console.log({
      descripcion : e.target[1].value,
      nom_encargado : e.target[2].value,
      id : e.target[3].value
    })
    console.log(e.target[2].value)
    fetch(`http://localhost:4000/editCategory/${e.target[3].value}`,{
      method: 'PUT',
      headers : new Headers({'Content-Type': 'application/json'}),
      body : JSON.stringify({
        descripcion : document.querySelector('#descripcion').value,
        nom_encargado : e.target[2].value,
        id : e.target[3].value
      })
    })
      .then(response => {
        if (response.statusText === 'OK') {
          message.innerHTML = 'Se ha agregado la categoria'
          message.classList.remove('block-or-not')
          setTimeout(() => {
            message.classList.add('block-or-not')   
          }, 5000)
        }
      })
      .catch(msg => console.log(msg))
  }

  addCategory (e) {
    const windowModal = d.querySelector('#windowModal'),
      contentModal = d.querySelector('#contentFirst')
    let formulario = `<h2 class="text-center">Agregando categoria</h2>
      <form id="formCategory" enctype="multipart/form-data">
        <div class="form-group">
          <label for="nombre">Nombre</label>
          <input type="text" class="form-control" id="nombre"  name="nombrec">
        </div>
        <div class="form-group">
          <label for="descripcion">Descripcion</label>
          <textarea class="form-control" name="descripcion" id="descripcion" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="nombre">Nombre</label>
          <input type="text" class="form-control" id="nombre" name="nom_encargado">
        </div>
        <input type="submit" value="Enviar" />
      </form>
    `
    if (e.target.id === 'add-category') {
      windowModal.classList.remove('block-or-not')
      contentModal.insertAdjacentHTML('beforeend', formulario)
      const form = d.forms[0]
      form.addEventListener('submit', e => {
        e.preventDefault()
        fetch('http://localhost:4000/addCategory',{
          method: 'POST',
          headers : new Headers({'Content-Type': 'application/json'}),
          body : JSON.stringify({
            nombrec : e.target[0].value,
            descripcion : document.querySelector('#descripcion').value,
            nom_encargado : e.target[2].value
          })
        })
          .then(response => {
            if (response.statusText === 'OK') {
              message.innerHTML = 'Se ha agregado la categoria'
              message.classList.remove('block-or-not')
              setTimeout(() => {
                message.classList.add('block-or-not')   
              }, 5000)
            }
          })
          .catch(msg => console.log(msg))
      })
    }
  }

  editCategory (e) {
    const closeModal = d.querySelector('#closeModal'),
      contentModal = d.querySelector('#contentFirst'),
      windowModal = d.querySelector('#windowModal')
    
    let formulario = (c) => `<h2 class="text-center">Editando categoria</h2>
      <form id="formCategory" enctype="multipart/form-data">
        <div class="form-group">
          <label for="nombre">Nombre</label>
          <input type="text" class="form-control" id="nombre" placeholder="name@example.com" value="${c.nombrec}" disabled>
        </div>
        <div class="form-group">
          <label for="descripcion">Descripcion</label>
          <textarea class="form-control" name="descripcion" id="descripcion" rows="3">${c.descripcion}</textarea>
        </div>
        <div class="form-group">
          <label for="encargado">Nombre encargado</label>
          <input type="text" name="nom_encargado" class="form-control" id="encargado" placeholder="name@example.com" value="${c.nom_encargado}">
        </div>
        <input type="hidden" value="${c.id}" id="id">
        <input type="submit" value="Enviar" />
      </form>`

    //Detecto si es es el boton, para poder abrir el modal
    if(e.target.id === 'edit-category'){
      windowModal.classList.remove('block-or-not')
      const id = e.target.dataset.id;
      //contentModal.insertAdjacentHTML('beforeend', formulario(c))
      this.selectOnCategory(id)
      .then(response => {
        console.log(response)
        contentModal.insertAdjacentHTML('beforeend', formulario(response))
        formCategory.addEventListener('submit', this.save)
      })
    }
    //Cierro el modal
    closeModal.addEventListener('click', (e) => {
      e.preventDefault()
      windowModal.classList.add('block-or-not')
      contentModal.innerHTML = ""
    })
  }
  render () {
    fetch('http://localhost:4000/categoryAll')
      .then(response => response.json())
      .then(category => {
        mainContent.insertAdjacentHTML('beforeend', template(category))
      })

    mainContent.addEventListener('click', this.editCategory)
    mainContent.addEventListener('click', this.addCategory)
  }
}