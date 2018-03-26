import layout from "../layout/";
export default (category) => {
  let element = `
  <section class="header">
    <button class="header-add" id="add-category">Agregar</button>
  </section>
  <table class="table table-striped table-hover">
    <thead>
      <tr>
        <th scope="col">Nombre</th>
        <th scope="col">Descripcion</th>
        <th scope="col">Encargado</th>
        <th scope="col"> </th>
      </tr>
    </thead>
    <tbody>
      ${category.map(c => `<tr>
      <td>${c.nombrec}</td>
      <td>${c.descripcion}</td>
      <td>${c.nom_encargado}</td>
      <td>
        <button data-id="${c.id}" id="edit-category">Editar</button>
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
  return layout(element)
}