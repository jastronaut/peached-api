const config = require('config');
const jwt = require('jsonwebtoken');

const User = require('../models/User').User;

function auth(req, res, next) {
	const token = req.header('x-auth-token');

	if (!token)
		return res.status(401).json({ msg: 'access denied' });

	try {
		const decoded = jwt.verify(token, process.env.PEACHED_JWT_SECRET);
		if (req.method === 'GET') {
			User.findById(decoded.id)
				.select('-password')
				.lean()
				.then(usr => {
					if (!usr)
						return res.status(400).json({ msg: 'invalid token 1' });

					req.user = usr;
					next(); // call next piece of middleware
				})
				.catch(error => res.status(400).json({ msg: 'invalid token 2' }));
		} else {
			User.findById(decoded.id)
				.select('-password')
				.then(usr => {
					if (!usr)
						return res.status(400).json({ msg: 'invalid token 3' });

					req.user = usr;
					next(); // call next piece of middleware
				})
				.catch(error => res.status(400).json({ msg: 'invalid token 4' }));
		}

	} catch (e) {
		console.log('ok');
		res.status(400).json({ msg: 'invalid token' });
	}
}


module.exports = auth;