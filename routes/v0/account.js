const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

const User = require('../../models/User').User;
const { isNameValid, stripNewlines, isPasswordValid, isUsernameValid } = require('../../utils');

const accountUrlRegex = /^https?:\/\//;

function isBioValid(bio) {
	return bio.length < 150;
}

// @route   POST v0/account/update_profile
// @desc    Change basic profile info (bio, name, url)
// @access  Private
router.post('/update_profile', auth, async (req, res) => {
	const newProfileInfo = {};

	if (req.body.name) {
		const name = stripNewlines(req.body.name.trim());
		if (!isNameValid(name)) return res.status(400).json({ success: false, msg: 'name must be between 1 and 50 characters long' });
		newProfileInfo.name = name;
	}

	if (req.body.bio) {
		const bio = stripNewlines(req.body.bio.trim());
		if (!isBioValid(bio)) return res.status(400).json({ success: false, msg: 'bio must be under 150 characters' });
		newProfileInfo.bio = bio;
	}

	if (req.body.url) {
		const url = stripNewlines(req.body.url.trim());
		const formattedUrl = !accountUrlRegex.test(url) ? 'http://' + url : url;
		newProfileInfo.url = formattedUrl;
	}

	try {
		const user = req.user;
		if (newProfileInfo.name) user.name = newProfileInfo.name;
		if (newProfileInfo.bio) user.bio = newProfileInfo.bio;
		if (newProfileInfo.url) user.url = newProfileInfo.url;
		await user.save();
		res.status(200).json({ success: true, newProfileInfo });
	} catch (e) {
		res.status(500).json({ success: false, msg: 'could not update profile information' });
	}

});


// @route   GET v0/accounts/username_available
// @desc    Check if username is available
// @access  Public
router.get('/username_available/:username', async (req, res) => {

	try {

		const usernameCheck = await User.findOne({ username: req.params.username }).select('username').lean();
		if (!usernameCheck)
			return res.json({ success: true });
		return res.status(400).json({ success: false, msg: 'username unavailable' });

	} catch (e) {
		res.status(500).json({ msg: 'could not get username availability' });
	}

});


// @route   GET v0/accounts/email_available
// @desc    Check if email is available
// @access  Public
router.get('/email_available/:email', async (req, res) => {

	try {

		const emailCheck = await User.findOne({ email: req.params.email }).select('email').lean();
		if (!emailCheck)
			return res.json({ success: true });
		return res.status(400).json({ success: false, msg: 'email unavailable' });

	} catch (e) {
		res.status(500).json({ msg: 'could not get email availability' });
	}

});


// @route   POST v0/account/username
// @desc    Change account username
// @access  Private
router.post('/username', auth, async (req, res) => {

	const username = req.body.username;
	const user = req.user;

	if (!username || !isUsernameValid(username))
		return res.status(400).json({ success: false, msg: 'username is invalid'});

	try {

		const usernameCheck = await User.findOne({ username: username }).lean();
		if (usernameCheck)
			return res.status(400).json({ success: false, msg: 'username unavailable' });

		user.username = username;
		await user.save();
		return res.json({ success: true });

	} catch (e) {
		console.log(e);
		res.status(500).json({ msg: 'could not get username availability' });
	}

});


// @route   POST v0/account/blocked_words
// @desc    Add to blocked words list
// @access  Private
router.post('/blocked_words', auth, async (req, res) => {

	try {
		const user = req.user;
		const blockedWords = user.blockedWords;
		if (blockedWords.indexOf(req.body.new_word) > -1)
			return res.status(400).json({ msg: 'word already in blocked words list' });
		blockedWords.push(req.body.new_word);
		await user.save();

		return res.json({ success: true });

	} catch (e) {
		res.status(500).json({ msg: 'could not add to blocked words list' });
	}

});


// @route   DELETE v0/account/blocked_words
// @desc    Delete from blocked words list
// @access  Private
router.delete('/blocked_words', auth, async (req, res) => {

	try {
		const user = req.user;
		const blockedWords = await user.blockedWords;
		if (blockedWords.indexOf(req.body.word) < 0)
			return res.status(400).json({ msg: 'word not in blocked words list' });
		user.blockedWords = blockedWords.filter(w => w !== req.body.word);
		await user.save();

		return res.json({ success: true });

	} catch (e) {
		res.status(500).json({ msg: 'could not add to blocked words list' });
	}

});


// @route   GET v0/account/blocked_words
// @desc    See blocked words list
// @access  Private
router.get('/blocked_words', auth, async (req, res) => {

	try {
		const user = req.user;

		return res.json({ success: true, blocked_words: user.blockedWords });

	} catch (e) {
		res.status(500).json({ msg: 'could not get blocked words list' });
	}

});

router.post('/password', auth, async (req, res) => {
	const { password } = req.body;
	const user = req.user;
	if (!password) return res.status(400).json({ success: false, msg: 'missing new password' });
	if (!isPasswordValid(password)) return res.status(400).json({ success: false, msg: 'password is too short' });

	bcrypt.genSalt(10, (err, salt) => {
		if (err) {
			res.status(500).json({ success: false, msg: 'cant change password at this time' });
		}

		bcrypt.hash(password, salt, (err, hash) => {
			const updatePassword = async () => {
				try {
					if (err) {
						throw err;
					}

					user.password = hash;
					await user.save();

					jwt.sign({
						id: user.id,
						passwordHash: hash,
					}, process.env.PEACHED_JWT_SECRET, (err, token) => {
						if (err) throw err;

						res.status(200).json({ success: true, token });
					});
				} catch (e) {
					return res.status(500).json({ success: false, msg: 'cant change password at this time' });
				}
			};
			updatePassword();
		});
	});
});


module.exports = router;
