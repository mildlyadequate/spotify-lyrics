const electron = require('electron');
const url = require('url');
const path = require('path');
const SpotifyWebHelper = require('spotify-web-helper');
const api = require('genius-api');
const Lyricist = require('lyricist/node6');

process.env.GENIUS_ACCESS_TOKEN = '49mS8qrybwUvBUVRCMC3xAQMFxcrZfjV-10oOp6zDgtPtzQyjxdsnSq15GqkuQgk';

const{app,BrowserWindow,Menu, ipcMain, dialog} = electron;
const helper = SpotifyWebHelper();
const genius = new api(process.env.GENIUS_ACCESS_TOKEN);
const lyricist = new Lyricist(process.env.GENIUS_ACCESS_TOKEN);

let mainWindow;
//let chooseSongWindow;

/*
===================================== WINDOWS =================================
*/

// Listen for app to be ready
app.on('ready', function(){

    // Create new window
    mainWindow = new BrowserWindow({
        width: 1024, 
        height: 640,
        title:'Spotify Lyrics'
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol:'file:',
        slashes: true
    }));

    // Quit App when closed
    mainWindow.on('closed', function(){
        app.quit();
    })

    // Remove Menu Bar
   // mainWindow.setMenu(null);
});

// Handle create chooseSong Window
function chooseSongWindow(){
    // Create new window
    chooseSongWindow = new BrowserWindow({
        width:300,
        height:200,
        title:'Choose the correct song'
    });

    // Load html into window
    chooseSongWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'chooseSong.html'),
        protocol:'file:',
        slashes: true
    }));

    // Garbage Collection handle
    chooseSongWindow.on('close',function(){
        chooseSongWindow = null;
    });
}

/*
===================================== IPC =================================
*/

// Catch item:add
ipcMain.on('song:refresh', function(e){
    updateShownSong();
});

// Catch choosesong:open
ipcMain.on('choosesong:open', function(e){
    chooseSongWindow();
});

/*
================================ SPOTIFY HELPER ===========================
*/

helper.player.on('error', err => {
    console.log(err);
    dialog.showErrorBox("Error with Spotify Web Helper", error);
    /*if (err.message.match(/No user logged in/)) {
      // also fires when Spotify client quits
      console.log('ERROR: not logged in');
    } else {
      // other errors: /Cannot start Spotify/ and /Spotify is not installed/
      console.log('ERROR: cannot start / installed');
    }*/
});

helper.player.on('ready', () => {
  
    //helper.player.on('track-will-change', track => { updateShownSong(track) });

    helper.player.on('track-will-change', function(track){ 
        updateShownSong(track) 
    });

     //Playback events
     
    helper.player.on('play', function(){ 
        updateShownSong(undefined) 
    });
    /*
    helper.player.on('pause', () => { console.log('pause') }).catch(function(error) {
        console.error(error);
    });
    helper.player.on('seek', newPosition => { console.log('seek') }).catch(function(error) {
        console.error(error);
    });
    helper.player.on('end', () => { console.log('end') }).catch(function(error) {
        console.error(error);
    });
    helper.player.on('track-will-change', track => { console.log('track-will-change') }).catch(function(error) {
        console.error(error);
    });
    helper.player.on('status-will-change', status => {console.log('status-will-change')}).catch(function(error) {
        console.error(error);
    });*/
  
    updateShownSong(undefined);
});


function updateShownSong(track_obj) {

    if(helper.status===null){
        dialog.showErrorBox("Connection Error", "Can't connect to spotify");
        return;
    }

    var track;
    if(track_obj==undefined){
        track = helper.status.track;
    }else{
        track = track_obj;
    }

    // Search for track name + artist name
    genius.search(track.track_resource.name + ' - ' + track.artist_resource.name ).then(function(response) {

        // Use the first results id to scrape the lyrics with lyricist
        var promise1 = lyricist.song(response.hits[0].result.id,{fetchLyrics: true}).then(song => mainWindow.webContents.send('lyrics:show', song));
          
        promise1.catch(function(error) {
            console.log(error);
            dialog.showErrorBox("Error in Lyricist scraping", error);
        });
    }).catch(function(error) {
        console.error(error);
        dialog.showErrorBox("Error in genius search", error);
    });
} 