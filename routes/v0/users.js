const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const config = require('config');
const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth');

const User = require('../../models/User').User;
const Post = require('../../models/Post').Post;

// @route   POST api/users
// @desc    Create a User
// @access  Public
router.post('/register', (req, res) => {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
        return res.status(400).json({ msg: 'missing fields', succcess: false });
    }

    User.findOne({ username })
        .then(user => {
            if (user) {
                return res.status(400).json({ msg: 'user with username already exists', success: false });
            }

            const newUser = new User({
                name,
                username,
                password
            });


            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) {
                        newUser.remove();
                        return res.status(500).json({
                            msg: 'error creating new user',
                            success: false
                        })
                    }

                    newUser.password = hash;
                    newUser.save()
                        .then(user => {

                            jwt.sign({
                                id: user.id
                            }, config.get('jwtSecret'), (err, token) => {
                                if (err) throw err;
                                res.json({
                                    user: {
                                        id: user.id,
                                        name: user.name,
                                        username: user.username,

                                    }, token
                                });
                            });


                        });
                })
            })

        });

});

// need to fix this :)
// @route   DELETE api/users
// @desc    Delete a User by id
// @access  Private
router.delete('/:id', auth, (req, res) => {
    User.findById(req.params.id)
        .then(user => user.remove().then(() => Post.deleteMany({ authorId: req.params.id }).then(() => res.json({ success: true })).catch(err => console.log("hmm"))))
        .catch(err => res.status(404).json({ success: false }));

});

module.exports = router;