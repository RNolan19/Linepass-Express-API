// Express docs: http://expressjs.com/en/api.html
const express = require('express')

// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for bars
const Bar = require('../models/bar')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404

// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { bar: { title: '', text: 'foo' } } -> { bar: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /bars -- get all bars
router.get('/bars', (req, res, next) => {
  Bar.find()
    .then(bars => {
      // `bars` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return bars.map(bar => bar.toObject())
    })
    // respond with status 200 and JSON of the bars
    .then(bars => res.status(200).json({ bars: bars }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// user specific index
router.get('/user_bars', requireToken, (req, res, next) => {
  let search = { owner: req.user.id }
  Bar.find(search)
    .then(bars => {
      return bars.map(bar => bar.toObject())
    })
    .then(bars => res.status(200).json({ bars: bars }))
    .catch(next)
})

// SHOW
// GET /bars/5a7db6c74d55bc51bdf39793
router.get('/bars/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Bar.findById(req.params.id)
    .populate('owner')
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "bar" JSON
    .then(bar => {
      return res.status(200).json({ bar: bar.toObject() })
    })
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /bars
router.post('/bars', requireToken, (req, res, next) => {
  // set owner of new bar to be current user
  req.body.bar.owner = req.user.id

  Bar.create(req.body.bar)
    // respond to succesful `create` with status 201 and JSON of new "bar"
    .then(bar => {
      res.status(201).json({ bar: bar.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /bars/5a7db6c74d55bc51bdf39793
router.patch('/bars/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.bar.owner

  Bar.findById(req.params.id)
    .then(handle404)
    .then(bar => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, bar)

      // pass the result of Mongoose's `.update` to the next `.then`
      return bar.updateOne(req.body.bar)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /bars/5a7db6c74d55bc51bdf39793
router.delete('/bars/:id', requireToken, (req, res, next) => {
  Bar.findById(req.params.id)
    .then(handle404)
    .then(bar => {
      // throw an error if current user doesn't own `bar`
      requireOwnership(req, bar)
      // delete the bar ONLY IF the above didn't throw
      bar.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
