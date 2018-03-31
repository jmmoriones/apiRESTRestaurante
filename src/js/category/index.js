import { d, c, consultaGet, consultaPost, consultaOneData, consultaEdit } from '../helpers'
import template from "./template"
import formTpl from "./formulario_tpl";
import { page } from "page";

const mainContent = document.querySelector('#content-main')
export default class Category {
  constructor () {
    this.editCategory = this.editCategory.bind(this)
    //this.save = this.save.bind(this)
    this.addCategory = this.addCategory.bind(this)
  }
  selectAllCategory () {
    return fetch('http://localhost:4000/categoryAll')
      .then(response => response.json())
  }

  addCategory (e) {
    const windowModal = d.querySelector('#windowModal'),
      contentModal = d.querySelector('#contentFirst'),
      message = d.querySelector('#message')

    if (e.target.id === 'add-category') {
      windowModal.classList.remove('block-or-not')
      contentModal.insertAdjacentHTML('beforeend', formTpl)
      const form = d.forms[0]
      form.addEventListener('submit', e => {
        e.preventDefault()
        const data = {
          nombrec : e.target[0].value,
          descripcion : document.querySelector('#descripcion').value,
          nom_encargado : e.target[2].value
        }
        consultaPost('http://localhost:4000/addCategory', data, message)
      })
      d.getElementById('saveBtn').style.display = 'none';
    }
  }

  editCategory (e) {
    const closeModal = d.querySelector('#closeModal'),
      contentModal = d.querySelector('#contentFirst'),
      windowModal = d.querySelector('#windowModal')

    if(e.target.id === 'edit-category'){
      windowModal.classList.remove('block-or-not')
      contentModal.insertAdjacentHTML('beforeend', formTpl)
      d.getElementById('sendBtn').style.display = 'none'

      const id = e.target.dataset.id,
        formCategory = d.getElementById('formCategory'),
        saveBtn = d.getElementById('saveBtn')

      let formElements = d.querySelectorAll('[required]'),
        formData = ''
      
      const formularioEdit = (data) => {
        formElements[0].value = data.nombrec
        formElements[1].value = data.descripcion
        formElements[2].value = data.nom_encargado
      }
      consultaOneData('http://localhost:4000/selectOneCategory/', id)
        .then(response => {
          formularioEdit(response)
        });
          
      saveBtn.addEventListener('click', e => {
        e.preventDefault()
        const data = {
          nombrec : formElements[0].value,
          descripcion : formElements[1].value,
          nom_encargado : formElements[2].value
        }
        c(consultaEdit('http://localhost:4000/editCategory/',id, data))
      })
    }
    closeModal.addEventListener('click', (e) => {
      e.preventDefault()
      windowModal.classList.add('block-or-not')
      contentModal.innerHTML = ""
    })
  }
  render () {
    mainContent.insertAdjacentHTML('beforeend', template())
    let bodyTable = d.getElementById('body-table')
    
    let templateHtml = (c) => {
      return `<article class="card-article">
      <div class="div1">
        <h3 class="article-title">${c.nombrec}</h3>
        <p class="article-description">${c.descripcion}</p>
        <small class="article-propietary">${c.nom_encargado}</small>
      </div>
      <div class="div2">
        <button data-id="${c.id}" id="edit-category" type="button" class="btn btn-success btn-lg">Editar</button>
      </div>
    </article>`
    }
    consultaGet('http://localhost:4000/categoryAll',templateHtml,bodyTable)

    mainContent.addEventListener('click', this.editCategory)
    mainContent.addEventListener('click', this.addCategory)
  }
}