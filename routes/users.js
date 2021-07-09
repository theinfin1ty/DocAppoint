const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const passport = require('passport');
const User = require('../models/user');

router.get('/register', (req, res) => {
    res.render('users/register');
})

router.post('/register', catchAsync(async (req, res, next) => {
    try{
        const { name, email, password } = req.body;
        const user = new User({ name: name, email: email, username: email });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if(err) return next(err);
            req.flash('success', 'Welcome!');
            res.redirect('/client');
        })
    } catch(e){
        req.flash('error', e.message);
        res.redirect('/register');
    }
}))

router.get('/login', (req, res) => {
    res.render('users/login');
})

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login'}), (req, res) => {
    if(req.user.userType == 'admin'){
        req.flash('success', `Welcome, ${req.user.name}. This is Admin's Panel!`);
        res.redirect('/admin');
    }
    if(req.user.userType == 'client'){
        req.flash('success', `Welcome, ${req.user.name}`);
        res.redirect('/client');
    }
    if(req.user.userType == 'doctor'){
        req.flash('success', `Welcome, Dr. ${req.user.name}. This is Doctor's Panel!`);
        res.redirect('/doctor');
    }
})

router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Goodbye!');
    res.redirect('/login');
})

module.exports = router;