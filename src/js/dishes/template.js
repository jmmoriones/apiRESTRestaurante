import layout from "../layout/index";
export default (dishes) => {
  let el = `
    <section class="header">
      <button class="header-add btn btn-primary" id="add-dishes">Agregar</button>
    </section>
    <section id="body-table">
    </section>
    <section id="windowModal" class="window-modal block-or-not">
      <div class="message block-or-not" id="message"></div>
      <article id="contentModal" class="content-modal">
        <a href="#" id="closeModal" class="close-modal"> X </a>
        <div id="contentFirst"></div>
      </article>
    </section>`
    return layout(el)
}