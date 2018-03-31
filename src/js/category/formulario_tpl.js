export default `
<h2 class="text-center">Agregando categoria</h2>
<form id="formCategory" enctype="multipart/form-data">
  <div class="form-group">
    <label for="nombre">Nombre</label>
    <input type="text" class="form-control" id="nombre"  name="nombrec" required>
  </div>
  <div class="form-group">
    <label for="descripcion">Descripcion</label>
    <textarea class="form-control" name="descripcion" id="descripcion" rows="3" required></textarea>
  </div>
  <div class="form-group">
    <label for="nombre">Nombre</label>
    <input type="text" class="form-control" id="nombre" name="nom_encargado" required>
  </div>
  <input type="submit" value="Enviar" class="btn btn-success" id="sendBtn"/>
  <input type="submit" value="Guardar" class="btn btn-success" id="saveBtn"/>
</form>`