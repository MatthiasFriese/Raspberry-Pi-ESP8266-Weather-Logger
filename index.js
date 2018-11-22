var express     = require('express');
var mysql       = require('mysql');
var app         = express();
var bodyParser  = require('body-parser');

var SavePassword = 'tutorials-raspberrypi.de';

var connection = mysql.createConnection({
    //host     : '192.168.178.45',
    host     : '127.0.0.1',
    user     : 'nodejs',
    password : 'password',
    database : 'weather_station',
    debug    :  false,
    connectionLimit : 100
});

app.set('port', (process.env.PORT || 8000))
app.set('view engine', 'pug')
app.use(express.static(__dirname + '/views'));
app.use('/scripts', express.static(__dirname + '/node_modules/vis/dist/'));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


// Visualize
app.get('/', function(req, res) {

    var firstData;
    var secondData;
    // get data from database
    connection.query('SELECT date x, humidity y, sender_id, \'humidity\' `group` FROM temperature ' +
                     'UNION SELECT date x, temperature y, sender_id, \'temperature\' `group` FROM temperature', function (error, results, fields) {
        if (error) throw error;
        firstData = JSON.stringify(results);
    });

    connection.query('SELECT date x, preasure y, sender_id, \'preasure\' `group` FROM temperature', function (error, results, fields) {
        if (error) throw error;
        secondData = JSON.stringify(results);

        res.render('index', { data: firstData, data2: secondData });
    });
});

// Send data
app.post('/esp8266_trigger', function(req, res){

    var sender_id, temperature, humidity, preasure;

    if (!req.body.hasOwnProperty("password") || req.body.password != SavePassword) {
        res.json({"code" : 403, "error": "Password incorrect / missing"});
        return;
    }

    if (!req.body.hasOwnProperty("sender_id") || req.body.sender_id == "") {
        res.json({"code" : 403, "error": "Sender ID missing"});
        return;
    } else {
        sender_id = req.body.sender_id;
    }

    if (!req.body.hasOwnProperty("temperature") || parseFloat(req.body.temperature) == NaN) {
        res.json({"code" : 403, "error": "Temperature Value missing"});
        return;
    } else {
        temperature = parseFloat(req.body.temperature);
    }

    if (!req.body.hasOwnProperty("humidity") || parseFloat(req.body.humidity) == NaN) {
        res.json({"code" : 403, "error": "Humidity Value missing"});
        return;
    } else {
        humidtiy = parseFloat(req.body.humidity);
    }

    if (!req.body.hasOwnProperty("preasure") || parseFloat(req.body.preasure) == NaN) {
        res.json({"code" : 403, "error": "preasure Value missing"});
        return;
    } else {
        preasure = parseFloat(req.body.preasure);
    }

    // save
    var query = connection.query('INSERT INTO temperature VALUES ' +
                                ' (DEFAULT, '+mysql.escape(sender_id)+', NOW(), '+temperature+', '+humidtiy+', '+preasure+');', function (error, results, fields) {
        if (error) {
            res.json({"code" : 403, "status" : "Error in connection database"});
            return;
        }
        res.json({"code": 200});
    });


});

app.get('/last_value', function(req, res) {
    var sender_id, temperature, humidity, preasure;

    if (req.query.sender_id == null) {
      res.json({"code" : 400, "error": "sender_id Value missing"});
      return;
    } else {
      sender_id = req.query.sender_id;
    }

    var query = connection.query('SELECT * from temperature WHERE sender_id=\"'+sender_id+'\" ORDER BY date desc LIMIT 1;', function (error, results, fields) {
      if (error) {
          res.json({"code" : 403, "status" : "Error in connection database"});
          console.log("error: "+ error);
          return;
      }
      res.json({"code": 200,
                "date": results[0].date,
                "temperature": results[0].temperature,
                "humidity": results[0].humidity,
                "preasure": results[0].preasure,
                "sender_id": results[0].sender_id
              });
    });
});

app.listen(app.get('port'));
