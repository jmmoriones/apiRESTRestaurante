const fs = require('fs')
fs.unlink(`${__dirname}/public/images/platos/photo-1513358455602.jpg`, (err) => {
  if (err) {
    console.log("failed to delete local image:"+err);
  } else {
    console.log('successfully deleted local image');      
  }
});