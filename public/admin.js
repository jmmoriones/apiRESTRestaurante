/******************* PETICIONES CATEGORIAS ********************/
((d, c, ajax, j) => {
  //DECLARACION DE VARIABLES
  const contentCategory = d.querySelector('#content-category'),
    contentDishes = d.querySelector('#content-diches'),
    contentEventos = d.querySelector('#content-events'),
    OK = 200,
    NOT_FOUND = 400,
    READY_STATE_COMPLETE = 4

  c('Ajax category')
  c(ajax)

  //ASIGNACION DE FUNCIONES
  ajax.open('GET', 'http://localhost:3000/lastCategories', true);
  contentCategory.innerHTML = `
    <div class="text-center preload"><img src='preload.gif' /></div>
  `;
  ajax.addEventListener('load', e => {
    let infoCategory,
      categoryTemplate = ''


    if(ajax.status >= 200 && ajax.status < 400){
      infoCategory = j.parse(ajax.responseText);
      c(ajax.response)
      infoCategory.forEach( category => {
        categoryTemplate += `
          <div class="card" style="width: 15rem;">
            <article class="card-body">
              <h5 class="card-title">${category.nombrec}</h5>
              <p class="card-text">${category.descripcion.slice(0,100) + '...'}</p>
              <small>${category.nom_encargado}</small>
            </article>
          </div>
        `;
      })
    }
    contentCategory.innerHTML = categoryTemplate;
  });
  ajax.send();
  
  //ASIGNACION DE EVENTOS
})(document, console.log, new XMLHttpRequest(), JSON);

((d, c, ajax1, j) => {
  const contentDishes = d.querySelector('#content-diches'),
    OK = 200,
    NOT_FOUND = 400,
    READY_STATE_COMPLETE = 4


  ajax1.open('GET', 'http://localhost:3000/lastDishes', true);
  contentDishes.innerHTML = `
    <div class="text-center preload"><img src='preload.gif' /></div>
  `;
  ajax1.addEventListener('load', e => {
    let infoDishes,
      dishesTemplate = ''
      c('Ajax Platos')
      c(ajax1)
    if( ajax1.status >= 200 && ajax1.status < 400 ){
      infoDishes = j.parse(ajax1.response);
      // c(ajax1.response)
      infoDishes.forEach( plato => {
        dishesTemplate += `
          <div class="card" style="width: 15rem;">
            <img class="card-img-top" src=images/platos/${plato.foto} alt="Card image cap">
            <article class="card-body">
              <h5 class="card-title">${plato.nombrep}</h5>
              <p class="card-text">${plato.descripcion.slice(0,100) + '...'}</p>
            </article>
          </div>
        `;
      })
    }
    contentDishes.innerHTML = dishesTemplate;
  });
  ajax1.send();
})(document, console.log, new XMLHttpRequest(), JSON);

((d, c, ajax, j) => {
  const contentEventos = d.querySelector('#content-events'),
    OK = 200,
    NOT_FOUND = 400,
    READY_STATE_COMPLETE = 4

  ajax.open('GET', 'http://localhost:3000/lastEvents', true);
  contentEventos.innerHTML = `
    <div class="text-center preload"><img src='preload.gif' /></div>
  `;
  ajax.addEventListener('load', e => {
    let infoDishes,
      dishesTemplate = ''
      c('Ajax Platos')
      c(ajax)
    if( ajax.status >= 200 && ajax.status < 400 ){
      infoDishes = j.parse(ajax.response);
      // c(ajax.response)
      infoDishes.forEach( plato => {
        dishesTemplate += `
          <div class="card" style="width: 15rem;">
            <img class="card-img-top" src=images/eventos/${plato.imagen} alt="Card image cap">
            <article class="card-body">
              <h5 class="card-title">${plato.nombre}</h5>
              <p class="card-text">${plato.descripcion.slice(0,100) + '...'}</p>
            </article>
          </div>
        `;
      })
    }
    contentEventos.innerHTML = dishesTemplate;
  });
  ajax.send();

})(document, console.log, new XMLHttpRequest(), JSON);

((c, d, ajax) => {
  const READY_STATE_COMPLETE = 4,
    OK = 200,
    NOT_FOUND = 404,
    content = d.querySelector('#content'),
    menu = d.querySelector('.menu-content');

  function contentInfo () {
    // c(ajax)
    if( ajax.readyState === READY_STATE_COMPLETE && ajax.status === OK ){
      content.innerHTML = ajax.response;
    }else if (ajax.status === NOT_FOUND){
      content.innerHTML = `La página que solicita cargar no existe Eror N°: <mark>${ajax.status}</mark> estado: ${ajax.statusText}`
    }
  }

  function ajaxRequest (e) {
    e.preventDefault();
    if( e.target.localName == 'a' ){
      ajax.open('GET', e.target.href, true);
      ajax.addEventListener('readystatechange', contentInfo);
      // ajax.setRequestHeader('content-type', 'text/html')
      ajax.send()
      c(e)
    }
  }

  menu.addEventListener('click', ajaxRequest);

})(console.log, document, new XMLHttpRequest());
