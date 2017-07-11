'use strict';

const VisualRecognitionV3 = require('./node-sdk/visual-recognition/v3');
const fs = require('fs');

const visual_recognition = new VisualRecognitionV3({
  api_key: 'https://gateway-a.watsonplatform.net/visual-recognition/api',
  version_date: VisualRecognitionV3.VERSION_DATE_2016_05_20
});

const params = {
  // must be a .zip file containing images
  images_file: fs.createReadStream('./resources/car.jpg')
};

visual_recognition.classify(params, function(err, res) {
  if (err) {
    console.log(err);
  } else {
    console.log(JSON.stringify(res, null, 2));
  }
});
