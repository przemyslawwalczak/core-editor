const express = require('express')
const path = require('path')

const server = express()

server.get('/library.js', (request, response) => {
    response.sendFile(path.join(__dirname, '..', 'dist/index.js'))
})

server.get('/library.min.js', (request, response) => {
    response.sendFile(path.join(__dirname, '..', 'dist/index.min.js'))
})

server.get('/', (request, response) => {
    response.sendFile(path.join(__dirname, 'index.html'))
})

server.listen(666, () => {
    console.log('static example served')
})