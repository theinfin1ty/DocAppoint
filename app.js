require('dotenv').config() 
const express = require('express') 
const path = require('path') 
const mongoose = require('mongoose') 
const ejsMate = require('ejs-mate') 
const session = require('express-session') 
const flash = require('connect-flash') 
const methodOverride = require('method-override') 
const passport = require('passport') 
const LocalStrategy = require('passport-local') 
const GoogleStrategy = require('passport-google-oauth20').Strategy 

const ExpressError = require('./utils/ExpressError') 
const CONFIG = require('./config/config') 

const User = require('./models/user') 

const userRoutes = require('./routes/users') 
const clientRoutes = require('./routes/client') 
const adminRoutes = require('./routes/admin') 
const doctorRoutes = require('./routes/doctor') 

mongoose.connect('mongodb://localhost:27017/docAppoint', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}) 

const db = mongoose.connection 
db.on("error", console.error.bind(console, "connection error:")) 
db.once("open", () => {
    console.log("Database connected") 
}) 

const app = express() 

app.engine('ejs', ejsMate) 
app.set('view engine', 'ejs') 
app.set('views', path.join(__dirname, 'views')) 

app.use(express.urlencoded({ extended: true })) 
app.use(methodOverride('_method')) 
app.use(express.static(path.join(__dirname, 'public'))) 

const sessionConfig = {
    secret: CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig)) 
app.use(flash()) 

app.use(passport.initialize()) 
app.use(passport.session()) 
passport.use(new LocalStrategy({usernameField:'email'}, User.authenticate())) 

passport.use(new GoogleStrategy({
    clientID: CONFIG.GOOGLE_CONSUMER_KEY,
    clientSecret: CONFIG.GOOGLE_CONSUMER_SECRET,
    callbackURL: CONFIG.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
        const existingUser = await User.findOne({ email: profile.emails[0].value })
        if(existingUser) {
            existingUser.googleId = profile.id
            existingUser.save()
            return done(null, existingUser)
        }
        const newUser = new User({
            email: profile.emails[0].value,
            username: profile.emails[0].value,
            googleId: profile.id,
            name: profile.displayName,
        })
        await newUser.save()
        return done(null, newUser)
    }
)) 

// passport.serializeUser(User.serializeUser()) 
// passport.deserializeUser(User.deserializeUser()) 

passport.serializeUser( (user, done) => { 
    done(null, user)
})


passport.deserializeUser((user, done) => {  
    done (null, user)
}) 

app.use((req, res, next) => {
    res.locals.currentUser = req.user 
    res.locals.success = req.flash('success') 
    res.locals.error = req.flash('error') 
    res.locals.info = req.flash('info') 
    next() 
})

app.use('/', userRoutes) 

app.use('/client', clientRoutes) 

app.use('/admin', adminRoutes) 

app.use('/doctor', doctorRoutes) 

app.get('/', (req, res) => {
    res.render('home') 
}) 

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found'), 404) 
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err 
    if(!err.message) err.message = "Oh No, Something Went Wrong!" 
    res.status(statusCode).render('error', { err }) 
})


app.listen(3000, () => {
    console.log('Serving on port 3000') 
})