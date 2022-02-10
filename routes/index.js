var express = require('express');
var router = express.Router();
var Pool = require('pg-pool');
const localStorage = require('localStorage');
const multer = require('multer');
const sortObjectsArray = require('sort-objects-array');
const nodemailer = require("nodemailer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})
const upload = multer({ storage: storage })

var io = null;
var socket_clients_list = [];

config = {
  user: 'uvngbtec',
  password: 'p4gDYKaNHKBwV0Opfd-E2u0UVcKR9Gmh',
  host: 'surus.db.elephantsql.com',
  port: 5432,
  database: 'uvngbtec',
  ssl: true
}

var pool = new Pool(config);
const bcrypt = require('bcrypt');


var user = {};
var shop = {};
var user_email;
var mess;
var socket_id_1;
var socket_id_2;
var socket_id_3;
var socket_id_4;
var users_email_list = [];
var create_socket_event;

/* GET home page. */

router.get('/login', function(req, res, next) {

  res.render('login', { title: 'Login'});
});

router.post('/login', function(req, res, next) {

  pool.connect((err, client, done) => {
    if (err) return done(err);

    client.query('select * from users where email = $1', [req.body.email], (err, data) => {
      done();
      if (err) return err;

      localStorage.setItem("user", req.body.email);
      user_email = localStorage.getItem("user");

      console.log(data);

      res.cookie("user", JSON.stringify({
        email: user_email,
        date: (new Date()).toString(),
        role: (data.rows[0].role).toString(),
        password: data.rows[0].password
      }));

      bcrypt.compare(req.body.pass, data.rows[0].password, function(err, result) {
        if(err){
          return console.log("Doslo je do greske!");
        }
        if(result){
          users_email_list.push(req.body.email);
          console.log("users saved: ", users_email_list);
            if (err) return done(err);
              if (data.rows.length === 0){

                console.log("Korisnik ne postoji!")
                res.sendStatus(500);
              }else{

                if (data.rows[0].status === 'Blokiran(15dana)'){
                  if (new Date() - data.rows[0].date_of_block > 14){
                    client.query("update users set status = 'aktivan', date_of_block = null  where email = $1", [user_email], function (err, data){
                      if (err) return console.log(err);

                    });
                  }
                }

                if(data.rows[0].role === 1){
                  res.redirect("/system/admin");
                }else{
                  if (data.rows[0].role === 3 && data.rows[0].status === 'aktivan' || data.rows[0].status === 'arhiviran'){
                    res.redirect("/home/" + user_email);
                  }else{
                    if (data.rows[0].status === 'aktivan' || data.rows[0].status === 'arhiviran'){
                      res.redirect("/shop/admin/" + user_email);
                    }else {
                      res.sendStatus(400);
                      console.log("Vas racun je blokiran!");
                    }
                  }
                }
              }
        } else {
          console.log("Ne poklapa se!");
          res.sendStatus(400);
        }

      });

    })
  })
});

router.put('/login', function(req, res, next) {

});


router.get('/', function(req, res, next) {

  pool.connect((err, client, done) => {
    if (err) return done(err)

    client.query('select * from shop_types', [], function (err, data){
      if(err) return err;

      res.render('registration', { title: 'Registracija', shop_types: data});
    })
  })


});

router.post('/', function(req, res, next) {

  const salt = bcrypt.genSaltSync();
  const hash = bcrypt.hashSync(req.body.pass, salt);

  user = {
    u_name: req.body.first_name,
    u_second_name: req.body.second_name,
    u_address: req.body.address,
    u_email: req.body.email,
    u_pass: hash,
    u_role: 3
  };

    pool.connect((err, client, done) => {
      if (err) return done(err)

      client.query("insert into users (first_name, second_name, address, email, password, role, status) " +
          "values($1, $2, $3, $4, $5, $6, 'aktivan')",
          [user.u_name, user.u_second_name, user.u_address, user.u_email, user.u_pass, user.u_role], (err, res_1) => {
            done();
            if (err) {
              res.send("Popunite sva polja!");
              return err;
            }

            res.redirect("/login");
      })
    })
});

router.put('/', function(req, res, next) {
  let interests = JSON.parse(req.body.interests_obj);
  let insert_query_string = "insert into users_interests (product_type_id, user_email) values";

  for (let i = 0; i < interests.length; i++){
    insert_query_string += "(" + parseInt(interests[i]) + ", '" + req.body.user_email + "')";

    if (i < interests.length - 1){
      insert_query_string += ", ";
    }
  }

  pool.connect((err, client, done) => {
    if (err) return done(err)

    client.query(insert_query_string, [], (err, res_1) => {
      if (err) return console.log(err);

    })
  })
});


router.get('/shop/registration', function(req, res, next) {
  res.render('shop_registration', { title: 'Express' });
});

router.post('/shop/registration', upload.single('image'),function(req, res, next) {

  var shop_image = "";
  if (req.file){
    shop_image = req.file.filename;
  }

  shop = {
    name: req.body.shop_name,
    type: parseInt(req.body.shop_type),
    location: req.body.shop_location,
    image: shop_image,
    admin: req.body.admin_email,
    password: req.body.admin_pass
  };

  pool.connect((err, client, done) => {
    if (err) return done(err)
    client.query('select * from users where email = $1', [shop.admin], function (err, data){
      if(err) return err;
      if (data.rows.length === 1){
        bcrypt.compare(shop.password, data.rows[0].password, function(err, result) {
          if(err){

            return err;
          }
          if (result === true){

            client.query("insert into shops (name, type, address, admin_email, shop_photo)  values($1, $2, $3, $4, $5)",
                [shop.name, shop.type, shop.location, shop.admin, shop.image], (err) => {
                  done();
                  if (err) {
                    res.send("Ovaj naziv vec postoji!");
                    return err;
                  }else {
                    client.query( "update users set role = 2 where email = $1", [shop.admin], function (err, data_1){
                      if(err) return err;
                    })
                    console.log("Trgovina registrovana");
                    res.redirect("/login");
                  }

            })
          }else{
            res.send("Email ili lozinka nisu validni")
          }

        });
      }else{
        res.send("Admin ne postoji!")
      }

    })
  })
});


router.get('/home/:email', function(req, res, next) {
  if (req.cookies.user &&
      parseInt(JSON.parse(req.cookies.user).role) === 3 && JSON.parse(req.cookies.user).email === req.params.email){

    pool.connect((err, client, done) => {
      if (err) return done(err)

      client.query('select * from users_interests where user_email = $1', [req.params.email], function (err, data_1){
        if(err) return err;

        client.query('select * from shop_products', [], function (err, data_2){
          if(err) return err;

          if (!io){
            io = require("socket.io")(req.connection.server);
            create_socket_event = false;

            io.sockets.on("connection", function (client_s){

              socket_clients_list.push([user_email, client_s.id]);

              //client.join("room1");

              client_s.on("system_admin_message_client", function (data, email, admin){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_3 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_3).emit("system_admin_message_server", data, admin);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [admin, email, data], function (err, data){
                  if (err) console.log(err);
                })

              });

              client_s.on("shop_admin_message_client", function (data, email){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_1 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_1).emit("shop_admin_message_server", data, data_2.rows[0].admin_email);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [data_2.rows[0].admin_email, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("customer_message_client", function (data, email){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("customer_message_server", data, email);
                  client.query("insert into chat_history (sender, receiver, mess) " +
                      "values ($1, $2, $3)", [email, data_2.rows[0].admin_email, data], function (err, data){
                    if (err) console.log(err);
                  })
                }
              });

              client_s.on("home_message_client", function (data, email, user){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_4 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_4).emit("home_message_server", data, user);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [user, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("notification_from_admin_client", function (data){
                io.emit("notification_from_admin_server", data);
              })

              client_s.on("order_client", function (data){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("order_server", data);
                }
              });
            });

          }

          client.query('select * from users where role = 1', [], function (err, data_3){
            if(err) return err;

            client.query('select product, count(product) as num from orders group by product order by num desc limit 5',
                [], function (err, data_4){
              if(err) return console.log(err);

                  client.query('select * from chat_history where (sender = $1 and receiver = $2) or ' +
                      '(sender = $2 and receiver = $1)',
                      [req.params.email, data_3.rows[0].email], function (err, data_5){
                        if(err) return console.log(err);

                        res.render('home',
                            { title: 'Home',
                              chat_history: data_5,
                              most_selling: data_4,
                              system_admin_email: data_3,
                              products: data_2,
                              interests: data_1,
                              email: req.params.email,
                              system_admin_mess: mess
                            });
                      })
            })

          })
        })
      })
    })
  }else{
    res.redirect("/login");
  }

});


router.get('/system/admin', function(req, res, next) {

  if (req.cookies.user && req.cookies.user && parseInt(JSON.parse(req.cookies.user).role) === 1){

    pool.connect((err, client, done) => {
      if (err) return done(err)

      client.query('select * from users where role = 2 or role = 3', function (err, data_1){
        if(err) return err;


        client.query('select * from shops', function (err, data_2){
          if(err) return err;

          if (io || !io){

            if (!io){
              io = require("socket.io")(req.connection.server);
              create_socket_event = true;
            }


            io.sockets.on("connection", function (client_s){

              socket_clients_list.push([user_email, client_s.id]);

              //client.join("room1");

              if (create_socket_event === true){
                client_s.on("system_admin_message_client", function (data, email, admin){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (socket_clients_list[i][0] === email){
                      socket_id_3 = socket_clients_list[i][1];
                    }
                  }
                  client_s.to(socket_id_3).emit("system_admin_message_server", data, admin);
                  client.query("insert into chat_history (sender, receiver, mess) " +
                      "values ($1, $2, $3)", [admin, email, data], function (err, data){
                    if (err) console.log(err);
                  })
                });
              }

              client_s.on("shop_admin_message_client", function (data, email){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_1 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_1).emit("shop_admin_message_server", data, data_2.rows[0].admin_email);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [data_2.rows[0].admin_email, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("customer_message_client", function (data, email){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("customer_message_server", data, email);
                  client.query("insert into chat_history (sender, receiver, mess) " +
                      "values ($1, $2, $3)", [email, data_2.rows[0].admin_email, data], function (err, data){
                    if (err) console.log(err);
                  })
                }
              });

              client_s.on("home_message_client", function (data, email, user){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_1 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_1).emit("home_message_server", data, user);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [user, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("notification_from_admin_client", function (data){
                io.emit("notification_from_admin_server", data);
              });

              client_s.on("order_client", function (data){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("order_server", data);
                }
              });
            });

          }
          client.query("select * from chat_history", [], function (err, data_3){
            if (err) return console.log(err);

            client.query("select * from orders", [], function (err, data_4){
              if (err) return console.log(err);

              res.render('system_admin', {title: 'Admin',
                user_list:data_1,
                shops_info: data_2,
                chat_history: data_3,
                orders_stats: data_4,
                admin: user_email
              });

            });



          })
        })

      })
    })
  }else {
    res.redirect("/login");
  }
});

router.put('/system/admin', function(req, res, next) {

  pool.connect((err, client, done) => {
    if (err) return console.log(err);

    if (req.body.status_ajax === 'Blokiran(15dana)'){
      client.query( "update users set status = $1, date_of_block = $3 where email = $2",
          [req.body.status_ajax, req.body.email_ajax, new Date()], function (err, data_1){
        if(err) return console.log(err);
      })
    }else {
      client.query( "update users set status = $1 where email = $2",
          [req.body.status_ajax, req.body.email_ajax], function (err, data_1){
            if(err) return console.log(err);
          })
    }



  })
});

router.post('/system/admin', function(req, res, next) {

  pool.connect((err, client, done) => {
    if (err) return done(err)

    client.query( "insert into users_archive (first_name, second_name, address, email, password, role)" +
        "values($1, $2, $3, $4, $5, $6)",
        [req.body.first_name_ajax, req.body.second_name_ajax, req.body.address_ajax, req.body.email_ajax, req.body.pass_ajax, req.body.role_ajax],
        function (err, data_1){
          if(err) return err;

          client.query( "delete from users where email = $1", [req.body.email_ajax], function (err, data){
            if(err) return err;
          })

          console.log("Arhiviran");
    })



  })
});

router.delete('/system/admin', function(req, res, next) {

  pool.connect((err, client, done) => {
    if (err) return done(err)

    client.query( "delete from users where email = $1", [req.body.email_ajax], function (err, data){
      if(err) return err;
    })

  })
});


router.get('/shop/admin/:email', function(req, res, next) {
  if (req.cookies.user &&
      parseInt(JSON.parse(req.cookies.user).role) === 2 && JSON.parse(req.cookies.user).email === req.params.email){

    pool.connect((err, client, done) => {
      if (err) return done(err)

      client.query('select name from shops where admin_email = $1', [user_email], function (err, data_1){
        if(err) return err;

        client.query('select * from shop_products where admin_email = $1', [user_email], function (err, data_2){
          if(err) return err;

          if (!io){
            io = require("socket.io")(req.connection.server);
            create_socket_event = false;

            io.sockets.on("connection", function (client_s){

              socket_clients_list.push([user_email, client_s.id]);

              client_s.on("system_admin_message_client", function (data, email, admin){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_3 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_3).emit("system_admin_message_server", data, admin);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [admin, email, data], function (err, data){
                  if (err) console.log(err);
                })

              });

              client_s.on("shop_admin_message_client", function (data, email){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_1 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_1).emit("shop_admin_message_server", data, data_2.rows[0].admin_email);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [data_2.rows[0].admin_email, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("customer_message_client", function (data, email){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("customer_message_server", data, email);
                  client.query("insert into chat_history (sender, receiver, mess) " +
                      "values ($1, $2, $3)", [email, data_2.rows[0].admin_email, data], function (err, data){
                    if (err) console.log(err);
                  })
                }
              });

              client_s.on("home_message_client", function (data, email, user){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_4 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_4).emit("home_message_server", data, user);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [user, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("notification_from_admin_client", function (data){

                io.emit("notification_from_admin_server", data);
              })

              client_s.on("order_client", function (data){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("order_server", data);
                }
              });
            });

          }

          client.query("select * from orders where shop_admin = $1", [user_email], function (err, data_3){
            if (err) return console.log(err);

            client.query('select * from users where role = 3 or role = 1', function (err, data_4){
              if(err) return err;

              client.query("select profit('" + req.params.email + "')", function (err, data_5){
                if(err) return err;



                client.query("select * from chat_history", [], function (err, data_6){
                  if (err) return console.log(err);

                  res.render('shop_admin',
                      { title: 'Shop admin',
                        shops: data_1,
                        products: data_2,
                        orders: data_3,
                        chat_users: data_4,
                        income: data_5,
                        chat_history: data_6,
                        system_admin_mess: mess
                  });

                })
              })

            })

          })

        })

      })

    })
  }else {
    res.redirect("/login");
  }

});

router.post('/shop/admin/:email', upload.single("image"), function(req, res, next) {

  var image = "";
  if (req.file){
    image = req.file.filename;
  }

  pool.connect((err, client, done) => {
    if (err) return done(err)

    if (req.body.product_name){

      client.query( "insert into shop_products (shop_name, product, quantity, price, type, photo, admin_email)" +
          "values($1, $2, $3, $4, $5, $6, $7)",
          [
            req.body.shop_name,
            req.body.product_name,
            parseInt(req.body.product_quantity),
            parseInt(req.body.product_price),
            parseInt(req.body.product_type),
            image,
            req.params.email
          ],
          function (err, data){
            if(err) return console.log(err);

          })
    }

    if (req.body.update_shop_name){
      client.query("update shops set name = $1, type = $2, address = $3, shop_photo = $4 where name = $5",
          [
            req.body.update_shop_name,
            req.body.update_shop_type,
            req.body.update_shop_address,
            image,
            req.body.update_shop
          ], function (err, data){
            if (err) return console.log(err);
          })
    }
  })

});

router.put('/shop/admin/:email', function(req, res, next) {

    pool.connect((err, client, done) => {
      if (err) return done(err)
      if (req.body.product_name){
        client.query( "update shop_products set product = $2, quantity = $3, price = $4, type = $5, photo = $6 " +
            "where product = $1 and shop_name = $7",
            [req.body.update_product,
              req.body.product_name,
              parseInt(req.body.product_quantity),
              parseInt(req.body.product_price),
              parseInt(req.body.product_type),
              req.body.product_photo,
              req.body.update_shop], function (err, data){
              if(err) return err;

        });
      }

      if (req.body.status_list){
        var update_sql_string = "";

        for (let i = 0; i < JSON.parse(req.body.status_list).length; i++){
          update_sql_string += "update orders set status = " + "'" + JSON.parse(req.body.status_list)[i][1] + "'" +
              " where id = " + JSON.parse(req.body.status_list)[i][0] + ";";
        }

        client.query( update_sql_string, [], function (err, data){
              if(err) return console.log(err);
        });

      }

    })
});

router.delete('/shop/admin/:email', function(req, res, next) {

  pool.connect((err, client, done) => {
    if (err) return done(err)

    client.query( "delete from shop_products where product = $1", [req.body.ajax_product], function (err, data){
      if(err) return err;
    })

  })
});


router.get('/shop/list/:type', function(req, res, next) {
  var sort_asc = [];
  var sort_desc = [];
  if (req.cookies.user && parseInt(JSON.parse(req.cookies.user).role) === 3){

    pool.connect((err, client, done) => {
      if (err) return done(err)

        client.query('select * from shops', [], function (err, data){
          if(err) return console.log(err);

          client.query("select * from shop_types", [], function (err, data_2){
            if (err) return console.log(err);

            sort_asc = sortObjectsArray(data.rows, "name");
            sort_desc = sortObjectsArray(data.rows, "name", "desc");

            res.render('list_of_shops', { title: 'Shop list',
              shops_list: data,
              shop_types: data_2,
              sort_asc: sort_asc,
              sort_desc: sort_desc
            });
          })

        })


    });
  }else {
    res.redirect("/login");
  }



});


router.get('/shop/details/:name', function(req, res, next) {

  if (req.cookies.user && parseInt(JSON.parse(req.cookies.user).role) === 3){
    var sort_asc = [];
    var sort_desc = [];
    pool.connect((err, client, done) => {
      if (err) return done(err)

      client.query('select * from shops where name = $1', [req.params.name], function (err, data_1){
        if(err) return err;

        client.query('select * from shop_products where shop_name = $1', [req.params.name], function (err, data_2){
          if(err) return err;

          sort_asc = sortObjectsArray(data_2.rows, "product");
          sort_desc = sortObjectsArray(data_2.rows, "product", "desc");

          if (!io){
            io = require("socket.io")(req.connection.server);

            io.sockets.on("connection", function (client_s){

              socket_clients_list.push([user_email, client_s.id]);

              client_s.on("system_admin_message_client", function (data, email, admin){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_3 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_3).emit("system_admin_message_server", data, admin);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [admin, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("shop_admin_message_client", function (data, email){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_1 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_1).emit("shop_admin_message_server", data, data_2.rows[0].admin_email);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [data_2.rows[0].admin_email, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("customer_message_client", function (data, email){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("customer_message_server", data, email);
                  client.query("insert into chat_history (sender, receiver, mess) " +
                      "values ($1, $2, $3)", [email, data_2.rows[0].admin_email, data], function (err, data){
                    if (err) console.log(err);
                  })
                }
              });

              client_s.on("home_message_client", function (data, email, user){
                for (let i = 0; i < socket_clients_list.length; i++){
                  if (socket_clients_list[i][0] === email){
                    socket_id_4 = socket_clients_list[i][1];
                  }
                }
                client_s.to(socket_id_4).emit("home_message_server", data, user);
                client.query("insert into chat_history (sender, receiver, mess) " +
                    "values ($1, $2, $3)", [user, email, data], function (err, data){
                  if (err) console.log(err);
                })
              });

              client_s.on("order_client", function (data){
                if (data_2){
                  for (let i = 0; i < socket_clients_list.length; i++){
                    if (data_2.rows[0].admin_email === socket_clients_list[i][0]){
                      socket_id_2 = socket_clients_list[i][1];
                      break;
                    }
                  }
                  client_s.to(socket_id_2).emit("order_server", data);
                }
              });
            });

          }

          client.query("select status from users where email = $1", [user_email], function (err, data_3){
              if(err) return console.log(err);

              client.query("select * from chat_history where (sender = $1 and receiver = $2) or " +
                  "(sender = $2 and receiver = $1)", [user_email, data_2.rows[0].admin_email], function (err, data_4){
                if (err) return console.log(err);

                res.render('shop_details',
                    {
                      title: 'Shop details',
                      shop_info: data_1,
                      shops_details: data_2,
                      user_status: data_3,
                      chat_history: data_4,
                      customer: user_email,
                      sort_asc: sort_asc,
                      sort_desc: sort_desc
                    });

              })
          });

        })

      })

    })
  }else {
    res.redirect("/login");
  }

});

router.post('/shop/details/:name', function(req, res, next) {
  var products_list = JSON.parse(req.body.products_list);
  var insert_query_string = "insert into orders (product, shop, customer, status, shop_admin) values";

  async function sendMail() {
    let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    let info = await transporter.sendMail({
      from: req.body.admin_email,
      to: user_email,
      subject: "Potvrda",
      text: "Narudzba je bila uspjesna!",
    });

    res.send(nodemailer.getTestMessageUrl(info));
  }

  sendMail();

  for (let i = 0; i < products_list.length; i++){
    insert_query_string += "('" +
        products_list[i][1] + "', '" + req.params.name + "', '" + user_email + "', " + "''" + ", '" + req.body.admin_email
        + "')";

    if (i < products_list.length - 1){
      insert_query_string += ", ";
    }
  }

  pool.connect((err, client, done) => {
    if (err) return console.log(err);
    client.query(insert_query_string, [], function (err, data){
          if(err) return console.log(err);
    })

  })

});

router.put('/shop/details/:name', function(req, res, next) {

  pool.connect((err, client, done) => {
    if (err) return console.log(err);
    client.query("update shops set rating = $1 where name = $2", [parseInt(req.body.rating), req.params.name], function (err, data){
      if(err) return console.log(err);
    })

  })

});


router.get('/user/profile/:email', function(req, res, next) {

  if (req.cookies.user &&
      parseInt(JSON.parse(req.cookies.user).role) === 3 && JSON.parse(req.cookies.user).email === req.params.email){

    pool.connect((err, client, done) => {
      if (err) return done(err)

      client.query('select * from users where email = $1', [req.params.email], function (err, data_1){
        if(err) return err;

        client.query('select * from users_interests where user_email = $1', [req.params.email], function (err, data_2){
          if(err) return err;

          client.query('select * from shop_types', [], function (err, data_3){
            if(err) return err;

            client.query('select * from orders where customer = $1', [req.params.email], function (err, data_4){
              if(err) return err;

              res.render('user_profile',
                  { title: 'User info',
                    user_info: data_1, user_interests: data_2, shop_types: data_3, orders: data_4});
            })

          })
        })

      })

    })
  }else {
    res.redirect("/login");
  }


});

router.post('/user/profile/:email', upload.single("image"),function(req, res, next) {
  pool.connect((err, client, done) => {
    if (err) return done(err)

    client.query("update users set user_photo = $1 where email = $2", [req.file.filename, req.params.email], (err, res) => {
      if (err) return console.log(err);

    })
  })

});

router.put('/user/profile/:email', function(req, res, next) {
  let interests = JSON.parse(req.body.interests_obj);
  let insert_query_string = "insert into users_interests (product_type_id, user_email) values";
  let update_query_string = "update users set first_name = " + "'"
      + req.body.first_name + "', second_name = '"
      + req.body.second_name + "', address = '"
      + req.body.address + "', email = '"
      + req.body.email + "'" + " where email = '" + req.body.email + "';";

  let email;
  for (let i = 0; i < interests.length; i++){
    if (req.body.email === null || req.body.email === "") {
      email = req.params.email;
    }else {
      email = req.body.email;
    }
    insert_query_string += "(" + parseInt(interests[i]) + ", '" + email + "')";

    if (i < interests.length - 1){
      insert_query_string += ", ";
    }
  }
  pool.connect((err, client, done) => {
    if (err) return done(err)

    client.query(update_query_string, [], (err, res) => {
      if (err) return console.log(err);

      client.query(insert_query_string, [], (err, res_1) => {
        if (err) return console.log(err);

      })
    })
  })


});

router.delete('/user/profile/:email', function(req, res, next) {

  let del_query_string = "";
  let list;

  pool.connect((err, client, done) => {
    if (err) return console.log(err);

    if (req.body.canceled_list){
      list = JSON.parse(req.body.canceled_list);

      for (let i = 0; i < list.length; i++){
        del_query_string +=
            "delete from orders where product = '" + list[i] +
            "' and customer = '" + req.params.email + "' and status = '" + 'Odobreno' + "';";
      }

      client.query(del_query_string, [], function (err, res){
        if (err) return console.log(err);

      });
    }

    if (req.body.interests_list){

        del_query_string = "";
        list = JSON.parse(req.body.interests_list);

        for (let i = 0; i < list.length; i++){
          del_query_string +=
              "delete from users_interests where product_type_id = " + list[i] +
              " and user_email = '" + req.params.email + "';";
        }

        client.query(del_query_string, [], function (err, res){
          if (err) return console.log(err);

        });
    }

  })

});


router.get('/logout', function(req, res, next) {
  res.clearCookie("user");
  res.redirect(req.get('referer'));
});


module.exports = router;
