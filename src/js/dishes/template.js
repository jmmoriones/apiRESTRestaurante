import layout from "../layout/index";
export default (dishes) => {
  let el = `
    <section class="header">
      <button class="header-add btn btn-primary" id="add-dishes">Agregar</button>
    </section>
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">Descripcion</th>
          <th scope="col">Precio</th>
          <th scope="col">Dificultad</th>
          <th scope="col">Foto</th>
          <th scope="col"> </th>
          <th scope="col"> </th>
        </tr>
      </thead>
      <tbody>
        ${dishes.map(d => `<tr>
        <td>${d.nombrep}</td>
        <td>${d.descripcion}</td>
        <td>${d.precio}</td>
        <td>${d.dificultad}</td>
        <td><img src="images/platos/${d.foto}" /></td>
        <td>
          <button class="btn btn-success" data-id="${d.id}" id="edit-dishes">Editar</button>
        </td>
        <td>
          <button class="btn btn-danger" data-id="${d.id}" id="delete-dishes">Eliminar</button>
        </td>
        </tr>`).join('')}
      </tbody>
    </table>
    <section id="windowModal" class="window-modal block-or-not">
      <div class="message block-or-not" id="message"></div>
      <article id="contentModal" class="content-modal">
        <a href="#" id="closeModal" class="close-modal"> X </a>
        <div id="contentFirst"></div>
      </article>
    </section>`
    return layout(el)
}