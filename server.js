var async = require("async");
var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser')
    // for post uploadImage and save 
var fs = require("fs");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// for id 

var shortid = require('shortid');


var mydb;

/* Endpoint to greet and add a new visitor to database.
 * Send a POST request to localhost:3000/api/visitors with body
 * {
 *  "name": "Bob"
 * }
 */
app.post("/api/visitors", function(request, response) {
    var userName = request.body.name;
    if (!mydb) {
        console.log("No database.");
        response.send("Hello " + userName + "!");
        return;
    }
    // insert the username as a document
    mydb.insert({ "name": userName }, function(err, body, header) {
        if (err) {
            return console.log('[mydb.insert] ', err.message);
        }
        response.send("Hello " + userName + "! I added you to the database.");
    });
});

/**
 * Endpoint to get a JSON array of all the visitors in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/visitors
 * </code>
 *
 * Response:
 * [ "Bob", "Jane" ]
 * @return An array of all the visitor names
 */
app.get("/api/visitors", function(request, response) {
    var names = [];
    if (!mydb) {
        response.json(names);
        return;
    }

    mydb.list({ include_docs: true }, function(err, body) {
        if (!err) {
            body.rows.forEach(function(row) {
                if (row.doc.name)
                    names.push(row.doc.name);
            });
            response.json(names);
        }
    });
});


// load local VCAP configuration  and service credentials
var vcapLocal;
try {
    vcapLocal = require('./vcap-local.json');
    console.log("Loaded local VCAP", vcapLocal);
} catch (e) {
    console.log("Error when Loaded local VCAP");
    console.log("Error " + e);

}

const appEnvOpts = vcapLocal ? { vcap: vcapLocal } : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

if (appEnv.services['cloudantNoSQLDB']) {
    // Load the Cloudant library.
    var Cloudant = require('cloudant');

    // Initialize database with credentials
    var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);

    //database name
    var dbName = 'mydb';

    // Create a new "mydb" database.
    cloudant.db.create(dbName, function(err, data) {
        if (!err) //err if database doesn't already exists
            console.log("Created database: " + dbName);
    });

    // Specify the database we are going to use (mydb)...
    mydb = cloudant.db.use(dbName);
}

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/resources'));

//     Visual Recognition  



const VisualRecognitionV3 = require('./node-sdk/visual-recognition/v3');
//const fs = require('fs');

const visual_recognition = new VisualRecognitionV3({
    api_key: 'ee3756739796104373c135d73aba476a9dc21d2d',
    version_date: VisualRecognitionV3.VERSION_DATE_2016_05_20
});

/*const params = {
    // must be a .zip file containing images
    images_file: fs.createReadStream('./resources/car.jpg')
};

visual_recognition.classify(params, function(err, res) {
    if (err) {
        console.log("visual ket error");
        console.log(err);
        console.log("visual ket error");
    } else {
        console.log(JSON.stringify(res, null, 2));
    }
});*/

//////

// upload image service 

app.post('/uploadImage', function(req, res) {
    // for getting watson analysis results
    var watsonAnalysisResult;

    console.log('befor generate image Id');

    var imageId = shortid.generate();
    console.log(imageId);

    console.log('after generate image Id');

    // First read existing users.
    console.log('befor write');

    // get the location 

    var location = req.body.location;


    fs.writeFile('./resources/' + imageId + '.jpg', new Buffer(req.body.photo, "base64"), function(err) {
        if (err) {
            console.log('befor write error');

        } else {

            console.log('befor call watson');

            const params = {
                // must be a .zip file containing images
                images_file: fs.createReadStream('./resources/' + imageId + '.jpg')
            };

            var watsonResutl = {};
            async.parallel([
                function(callback) {
                    visual_recognition.classify(params, function(err, result) {
                        if (err) {
                            console.log("visual ket error");
                            console.log(err);
                            console.log("visual ket error");
                        } else {
                            watsonAnalysisResult = JSON.stringify(result, null, 2);
                            console.log(watsonAnalysisResult);

                            // replace block 
                            console.log('before replace');
                            watsonAnalysisResult = watsonAnalysisResult.replace(/"class":/g, '"class_":');
                            console.log('after replace');
                            console.log(watsonAnalysisResult);
                            // end of replace block

                            watsonResutl.classifier = JSON.parse(watsonAnalysisResult);
                        };
                        callback();
                    });
                },
                function(callback) {
                    ////////////////////faces   ///faces
                    visual_recognition.detectFaces(params, function(err, resultFaces) {
                        if (err) {
                            console.log("visual ket error");
                            console.log(err);
                            console.log("visual ket error");
                        } else {
                            watsonAnalysisresultFaces = JSON.stringify(resultFaces, null, 2);

                            console.log(watsonAnalysisresultFaces);

                            watsonResutl.faces = resultFaces;
                            console.log('after call watson faces');
                        }
                        callback();
                    });
                }
            ], function(err) { //This is the final callback
                console.log('Both a and b are saved now');


                /////////////////////////end of faces 
                console.log('Befor insert into DB');
                // check if the database already created

                if (!mydb) {
                    // Load the Cloudant library.
                    var Cloudant = require('cloudant');

                    // Initialize database with credentials
                    var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);

                    //database name
                    var dbName = 'mydb';

                    // Create a new "mydb" database.
                    cloudant.db.create(dbName, function(err, data) {
                        if (!err) //err if database doesn't already exists
                            console.log("Created database: " + dbName);
                    });

                    // Specify the database we are going to use (mydb)...
                    mydb = cloudant.db.use(dbName);
                }

                // insert the username as a document
                mydb.insert({ "id": imageId, "path": './resources/' + imageId + '.jpg', "location": location, "watsonAnalysisResult": watsonResutl }, function(err, body, header) {
                    if (err) {
                        return console.log('[mydb.insert] ', err.message);
                    } else {

                        console.log('Record inserted in DB');

                        console.log('after insert into DB');
                        console.log('watsonAnalysisResult' + watsonAnalysisResult);
                        res.json({ "image_id": imageId, "watson_result": watsonResutl });
                    }
                });
            });









            /*visual_recognition.classify(params, function(err, result) {
                if (err) {
                    console.log("visual ket error");
                    console.log(err);
                    console.log("visual ket error");
                } else {
                    watsonAnalysisResult = JSON.stringify(result, null, 2);

                    console.log(watsonAnalysisResult);

                    // replace block 
                    console.log('before replace');
                    watsonAnalysisResult = watsonAnalysisResult.replace(/"class":/g, '"class_":');
                    console.log('after replace');
                    console.log(watsonAnalysisResult);
                    // end of replace block

                    console.log('after call watson Faces');

                    ////////////////////faces   ///faces
                    visual_recognition.detectFaces(params, function(err, resultFaces) {
                        if (err) {
                            console.log("visual ket error");
                            console.log(err);
                            console.log("visual ket error");
                        } else {
                            watsonAnalysisresultFaces = JSON.stringify(resultFaces, null, 2);

                            console.log(watsonAnalysisresultFaces);

                            console.log('after call watson faces');
                            /////////////////////////end of faces 
                            console.log('Befor insert into DB');
                            // check if the database already created

                            if (!mydb) {
                                // Load the Cloudant library.
                                var Cloudant = require('cloudant');

                                // Initialize database with credentials
                                var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);

                                //database name
                                var dbName = 'mydb';

                                // Create a new "mydb" database.
                                cloudant.db.create(dbName, function(err, data) {
                                    if (!err) //err if database doesn't already exists
                                        console.log("Created database: " + dbName);
                                });

                                // Specify the database we are going to use (mydb)...
                                mydb = cloudant.db.use(dbName);
                            }

                            // insert the username as a document
                            mydb.insert({ "id": imageId, "path": './resources/' + imageId + '.jpg', "location": location, "watsonAnalysisResult": result }, function(err, body, header) {
                                if (err) {
                                    return console.log('[mydb.insert] ', err.message);
                                } else {

                                    console.log('Record inserted in DB');

                                    console.log('after insert into DB');
                                    console.log('watsonAnalysisResult' + watsonAnalysisResult);


                                    res.json({ "image_id": imageId, "watson_result": { "classifier": result, "faces": resultFaces } });

                                }
                            });
                        }

                    });
                };
                //  res.end();
            });*/
        };
    });

    // fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
    //     data = JSON.parse( data );
    //     data["image"] = user["user4"];
    //     console.log( data );
    //     res.end( JSON.stringify(data));
    // });
    //res.end(watsonAnalysisResult);

});

///////////end of post Image



///////////start of post image understanding  enhancement data


app.post('/moreDetails',function(req,res){

               if (!mydb) {
                    // Load the Cloudant library.
                    var Cloudant = require('cloudant');

                    // Initialize database with credentials
                    var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);

                    //database name
                    var dbName = 'mydb';

                    // Create a new "mydb" database.
                    cloudant.db.create(dbName, function(err, data) {
                        if (!err) //err if database doesn't already exists
                            console.log("Created database: " + dbName);
                    });

                    // Specify the database we are going to use (mydb)...
                    mydb = cloudant.db.use(dbName);
                }

 
              console.log('Befor insert into DB');
                // check if the database already created



             // insert the username as a document
                mydb.insert({"idData":req.body.id,"gender":req.body.gender,"health":req.body.health,"age":req.body.age,"comment":req.body.comment}, function(err, body, header) {
                    if (err) {
                        return console.log('[dbAddData.insert] ', err.message);

                        res.json({"success":false});
                    } else {

                        console.log('Record inserted in mydb DB');

console.log(" inserted raw into DB : "+ JSON.stringify({"id":req.body.id,"gender":req.body.gender,"health":req.body.health,"age":req.body.age,"comment":req.body.comment}));
                        console.log('after insert into mydb DB');
                        res.json({"success":true});
                                      }
                });




});







///////////end of post image understanding  enhancement data


////////// start of get All images 


app.get('/images', function(req, res) {

    var ImageRows = [];
    if (!mydb) {
        response.json(ImageRows);
        console.log("No mydb  in  : /images get service");
        return;
    }

    mydb.list({ include_docs: true }, function(err, body) {
        if (!err) {
            body.rows.forEach(function(row) {
                if (row.doc.id)
                    ImageRows.push(row.doc);
            });

            // replace block 
            ImageRowsString = JSON.stringify(ImageRows);
            console.log('befor ImageRowsString before replace');

            ImageRowsString = ImageRowsString.replace(/"class":/g, '"class_":');
            console.log('after ImageRowsString after replace');
            console.log(ImageRowsString);

            // end of replace block
            ImageRows = JSON.parse(ImageRowsString);

            res.json(ImageRows);
        }
    });


});


///////// end of get All Images





////////// start of get All images Query 


app.post('/imagesQuery', function (req, res) {

  var ImageRows2 = [];
  if(!mydb) {
     console.log("No mydb in imagesQuery service");
    //res.json(ImageRows);
    //return;
  }
 
// //////////  request part 

//    console.log("try client http  start  ***********");


// var request = require('request');

// // Set the headers
// var headers = {
//     'Content-Type':     'application/json'
// }

// // Configure the request
// var options = {
//     url: 'https://6f9f3384-19a4-4fa3-bd05-7d2eda3bc17d-bluemix:51f65dda2276b1e37ebeadc8294dbcac132b85d6d9d5966db4701ddb8d644112@6f9f3384-19a4-4fa3-bd05-7d2eda3bc17d-bluemix.cloudant.com/_find',
//     method: 'POST',
//     headers: headers,
//     raw: {"selector": {
//     "path":"./resources/SyFeTsXg-.jpg"
//   }
// }
// }


// ///  end of http part 

// // Start the request
// request(options, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//         // Print out the response body

//         console.log('body  - -- - - - ');
//         console.log(body);
//         console.log('body  - - - - - - ');
//      body.rows.forEach(function(row) {
//         if(row.doc.path == "./resources/SyFeTsXg-.jpg")
//            ImageRows.push(row.doc);
//          console.log("row.doc in image query");
     


//       });

        
//     }
// })


//  console.log("end try client http  start  ***********");



///////////  End Request  

  mydb.list({ include_docs: true }, function(err, body) {
    if (!err) {
      body.rows.forEach(function(row) {
        if(row.doc.watsonAnalysisResult){
  ImageRowsStringLine = JSON.stringify(row.doc.watsonAnalysisResult);

if(row.doc.watsonAnalysisResult.faces){
  if(row.doc.watsonAnalysisResult.faces.images[0].faces){
 if(row.doc.watsonAnalysisResult.faces.images[0].faces[0]){
    if(row.doc.watsonAnalysisResult.faces.images[0].faces[0].gender){

    if(row.doc.watsonAnalysisResult.faces.images[0].faces[0].gender.gender==req.body.gender){

   if(req.body.max){
   if(row.doc.watsonAnalysisResult.faces.images[0].faces[0].age){

  if(row.doc.watsonAnalysisResult.faces.images[0].faces[0].age.max<req.body.max){

        ImageRows2.push(row.doc);
         console.log("row.doc in image query");
     }
     }

}else{

       ImageRows2.push(row.doc);
         console.log("row.doc in image query");

    
}



     }
     }
     }
     }
     }
}

      });

// replace block 
ImageRowsString = JSON.stringify(ImageRows2);
console.log('befor ImageRowsString before replace');

ImageRowsString = ImageRowsString.replace(/"class":/g,'"class_":');
console.log('after ImageRowsString after replace');
console.log(ImageRowsString);

// end of replace block
ImageRows2 = JSON.parse(ImageRowsString);

      res.json(ImageRows2);
    }else{

        console.log("error in /imagesQuery");
        console.log(err);

    }
  });


});




///////// end of get All query 





var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
