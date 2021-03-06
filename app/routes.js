//app/routes.js

/*
*
* Routes for application
*
*/

//bring in user object
var User = require('./models/user');
var Post = require('./models/post');
var path = require('path');
var TokenSecret = require( __base + 'config/tokensecret');

	module.exports = function(app,jwt){

		/* ****************
			Api endpoints
		*******************/

		/* 
			GET all users
		*/

		app.get('/users', function(req,res){
			User.find({},function(err, userlist){
				if (err){
					res.send(err);
				}else{
					res.json(userlist);
				}
			});
		});

		

		/*
			POST : register new user;
		*/

		app.post('/register', function(req,res,next){
			User.findOne({ username : req.body.username }, function(err,user1){
				if (err){
					res.send(err);
				} else if (user1) {
					res.status(403).json( { message : 'User exists'});
				} else {
					var newUser = new User();
					newUser.username = req.body.username;
					newUser.password = req.body.password;

					newUser.save(function(err){
						if (err) throw err;

						console.log ('User saved');
						
						var token = jwt.sign(newUser,TokenSecret.key,{
							expiresIn : 1440
						});
						res.json({
									success: true,
									token : token
								}
						);
					});
				}
			});
		});

		app.post('/login', function(req,res){
			User.findOne({
				username : req.body.username
			}, function (err, user1){
				if (err)
					throw err;

				if (!user1){
					res.status(401).json({ success : false, message : 'User not found' });
				} else if (user1){

					if ( user1.password != req.body.password ){
						res.status(401).json( { success : false, message : 'Wrong password'});
					} else{

						//create token
						var token = jwt.sign(user1, TokenSecret.key, {
							expiresIn : 1440 // 24 hours
						});

						res.json({
							success : true,
							message : 'Login successful',
							token : token
						});
					}
				}
			});
		});

		/* Function used to verify token */
		var verifyToken = function (req,res,next){
			console.log('YAYYY');
			var token = (req.body.token || req.query.token || req.headers['x-access-token']);

			if (token){
				jwt.verify(token,TokenSecret.key, 
					function(err,decoded){
						if (err){
							res.send(err);
						} else {
							res.decoded = decoded;
							next();
						}
					}	
				);
			
				
			} else{
				res.status(403).send('Invalid Token');
			}
		
		};

		app.get('/posts',verifyToken, function(req,res){
			console.log(res.decoded.username);
			Post.find({ author : res.decoded.username }).sort({_id : -1}).exec( function(err,postList){
				if (err){
					res.send(err);
				} else if (!postList) {
					res.send({ success : false, message : 'Failure retrieving posts'});
				} else if (postList){
					res.json(postList);
				}
			});
		});

		app.get('/posts/:id',verifyToken, function(req,res){
			var id = req.params.id;
			Post.findOne({_id : id}, function(err, post1){
				if (err){
					res.send(err);
				} else if (!post1){
					res.send({ success : false, message : 'Post not found'});
				} else if (post1){
					res.json(post1);
				}
			});
		});
		app.put('/posts/:id',verifyToken, function(req,res){
			var id = req.params.id;
			var title = req.body.title;
			var content = req.body.content;
			var date = Date.now;
			Post.findOneAndUpdate(
				{ _id : id },
				{ 
					title : title,
					content : content,
					"date" : Date.now(),
				}, function(err, upPost){
						if (err){
							res.send(err);
						} else{
							console.log(upPost);
							if (!upPost){
								res.status(400).send( { message : 'Post not found'});
							} else{
								res.send ({
									success : true
								});
							}
						}	
					}
			);

		});

		app.delete('/posts/:id', verifyToken, function(req,res){
			var token = res.decoded;
			if (token){
				var id = req.params.id;
				var username = token.username;
				Post.findOne( { _id : id, author : username }, function(err,post){
					if (err) throw err;
					if (post){
						post.remove(function(err){
							if (err) throw err;
							res.send({'success' : true });
						});
					} else{
						res.status(400).send({ 'message' : 'Post not found'});
					}
					
				});
			}
		});

		app.post('/posts', verifyToken, function (req,res){
			console.log(res.decoded);
			var token = res.decoded;
			if (token){
				var newPost = new Post();
				newPost.author = token.username;
				newPost.title = req.body.title;
				newPost.content = req.body.content;

				newPost.save(function(err,post1){
					if (err){
						res.send(err);
					}else{
						res.json(post1);
					}
				})
			
			}
			
		});
		
		
			
		

		/********************
			Front end routes
		*********************/

		app.get('*', function(req,res){
			res.sendFile(path.resolve(__dirname + '/../' + 'public/index.html'));
		});
	};
