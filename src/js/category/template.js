import layout from "../layout/";
export default () => {
  let element = `
  <section class="header">
    <button class="header-add btn btn-primary btn-lg" id="add-category" type="button">Agregar</button>
  </section>
  <section id="body-table">
  </section>
  <section id="windowModal" class="window-modal block-or-not">    
    <article id="contentModal" class="content-modal">
      <a href="#" id="closeModal" class="close-modal"> X </a>
      <div id="contentFirst"></div>
      <div class="message" id="message"></div>
    </article>
  </section>`
  return layout(element)
}