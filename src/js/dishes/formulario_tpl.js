import layout from "../layout/index";
export default (category) => {
  let el = `<div id="message"></div>
  <form id="formDishes" enctype="multipart/form-data">
    
    <div class="form-group">
      <label for="nombre-plato">Nombre</label>
      <input id="nombre-plato" class="form-control" name="nombrep" type="text" placeholder="Platos americanos" required>
    </div>
    <div class="form-group">
      <label for="nombre-plato">Nombre</label>
      <textarea id="descripcion-plato" class="form-control" name="descripcion", rows="3", placeholder="Esta receta ...." required></textarea>
    </div>
    <div class="form-group">
      <label for="inlineFormCustomSelect" class="mr-sm-2">Dificultad</label>
      <select class="custom-select mb-2 mr-sm-2 mb-sm-0" id="inlineFormCustomSelect" name="dificultad" required>
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
      <input type="file" id="foto-dishes" class="form-control" name="photo" accept="image/*" required>      
      
    </div>
    <div class="form-group">
      <label id="precio-plato">Plato</label>
      <input id="precio-plato" class="form-control" name="precio" type="text", placeholder="10.00" required>
    </div>
    <div class="form-group" name="categoria">
      <select class="form-control" required>
        <option selected>- - -</option>
        ${category.map(c => `
          <option value="${c.nombrec}">${c.nombrec}</option>`
        )}
      </select>
    </div>
    <input type="hidden" name="id" id="id">
    <button class="btn btn-primary" type="submit" id="btnAdd">Enviar</button>
    <input type="submit" value="Guardar" id="inputSave" class="btn btn-primary"/>
    <input type="hidden" id="hid_photo" class="form-control" name="imagen_hdn" accept="image/*">
  </form>`
  return layout(el)
}