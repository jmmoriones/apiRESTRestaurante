const c = console.log,
  d = document

const consultaGet = (query, template, element) => {
  fetch(query)
    .then(response => response.json())
    .then(response => {
      Array.from(response).map(rs => {
        element.insertAdjacentHTML('beforeend', template(rs))
      })
    })
},
  consultaPost = (url, data, tpl) => {
    let result = ``;
    fetch(url, {
      method: 'POST',
      headers : new Headers({'Content-Type': 'application/json'}),
      body: JSON.stringify(data)
    })
      .then(response => {
        return response.text()
      })
      .then(text => {
        tpl.insertAdjacentHTML('beforeend', text)
      })
      .catch(err => {
        result=err.message
      })
  },
  consultaDelete = id => {
    let result = ``;
    fetch('delete.php', {
      method: 'POST',
      headers : new Headers({"Content-Type": "application/x-www-form-urlencoded"}),
      body: id,
      mode:"cors"
    })
      .then(response => {
        return response.text()
      })
      .then(text => {
        result = text
        return text
      })
      .catch(err => {
        result=err
      })
  },
  consultaOneData = (query, id) => {
    var result = {}
    return fetch(query+id, {
      method : 'GET',
      headers : new Headers({'Content-Type': 'application/json'})
    })
      .then(response => {
        return response.json()
      })
  },
  consultaEdit = (query, id, data) => {
    let result = {}
    fetch(query+id, {
      method : 'PUT',
      headers : new Headers({'Content-Type': 'application/json'}),
      body : JSON.stringify(data)
    })
      .then(response => {
        return response.text()
      })
      .then(json => {
        result.text = json
      })
      .catch(err => {
        result.text = err
      })
      return result
  },
  consultaPostToImage = (url, data, tpl) => {
    let result = ``;
    fetch(url, {
      method: 'POST',
      body: data
    })
      .then(response => {
        return response.text()
      })
      .then(text => {
        tpl.insertAdjacentHTML('beforeend', text)
      })
      .catch(err => {
        result=err.message
      })
  },
  consultaPutToEdit = (query, id, data) => {
    let result = {}
    fetch(query+id, {
      method : 'PUT',
      body : data
    })
      .then(response => {
        return response.text()
      })
      .then(json => {
        result.text = json
      })
      .catch(err => {
        result.text = err
      })
      return result
  }

export {
  c,
  d,
  consultaGet,
  consultaPost,
  consultaDelete,
  consultaOneData,
  consultaEdit,
  consultaPostToImage,
  consultaPutToEdit
}