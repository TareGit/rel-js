const { spotify, is_expired, refreshToken } = require('play-dl');
const play = require('play-dl')


play.search('beautifull people ed sheran', { limit: 1 }).then((results) =>{
    console.log(results[0].thumbnail.url);
})



