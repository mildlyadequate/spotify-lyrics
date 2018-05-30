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

var currentTrack;

/*
===================================== WINDOWS =================================
*/

// Listen for app to be ready
app.on('ready', function(){

    // Create new window
    mainWindow = new BrowserWindow({
        width: 1024, 
        height: 640,
        backgroundColor:'#181818',
        show: false,
        title:'Spotify Lyrics'
    });

    mainWindow.once('ready-to-show', ()=>{
        mainWindow.show();
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
    let chooseSongWindow = new BrowserWindow({
        parent: mainWindow,
        modal: true,
        width:300,
        height:500,
        frame: false,
        title:'Choose the correct song',
        show: false
    });

    // Load html into window
    chooseSongWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'chooseSong.html'),
        protocol:'file:',
        slashes: true
    }));

    chooseSongWindow.once('ready-to-show', ()=>{
        chooseSongWindow.show();
    });

    // Garbage Collection handle
    chooseSongWindow.on('close',function(){
        chooseSongWindow = null;
    });

    // Remove Menu Bar
    chooseSongWindow.setMenu(null);
}

/*
===================================== IPC =================================
*/

// Catch item:add
ipcMain.on('song:refresh', function(e){
    updatePlayingSong();
});

// Catch choosesong:open
ipcMain.on('choosesong:open', function(e){
    chooseSongWindow();
});

ipcMain.on('song:changed_by_user',function(e){
    updateShownLyrics(e);
});

/*
================================ SPOTIFY HELPER ===========================
*/

helper.player.on('error', err => {
    // TODO Check if internet is working

    // If = undefined, spotify is not running
    if(err.message == undefined){
        mainWindow.webContents.send('spotify:error', {message: 'Spotify is not running',title: 'Error'});
    }else{
        if(helper.status == null){
            mainWindow.webContents.send('spotify:error', {message: 'You\'re not connected to the internet' ,title: 'Error'});
        }else{
            //TODO when does this happen?
            console.log('helper is not null');
            console.log(err);
        }
    }
});
    //dialog.showErrorBox("Error with Spotify Web Helper", err);
    //console.log(helper.);
/*
    console.log('BEGIN -------------------')

    if(helper.status == null){
        console.log('Helper cant be initialized');
        console.log(helper.status);
        mainWindow.webContents.send('spotify:error', {message: 'You\'re not connected to the internet',title: ''})

    }else{        
        if(helper.status.online){
            console.log('STATUS: Online');
        }else{
            console.log('STATUS: Offline');
        }

        if(helper.status.running){
            console.log('STATUS: Running');
        }else{
            console.log('STATUS: Not Running');
        }
    }

    console.log('END --------------------')

    if(err.message.match('No port found in range')){
        console.log('MATCHED');
    }*/

    /*if (err.message.match(/No user logged in/)) {
      // also fires when Spotify client quits
      console.log('ERROR: not logged in');
    } else {
      // other errors: /Cannot start Spotify/ and /Spotify is not installed/
      console.log('ERROR: cannot start / installed');
    }*/


helper.player.on('ready', () => {

    // If player works, internet and spotify work, so we can remove any error messages that might be showing
    mainWindow.webContents.send('spotify:running');
  
    helper.player.on('track-will-change', function(track){ 
        if(track != currentTrack){
            updatePlayingSong(track) 
            console.log("track change");
        }
    });

    //Playback events
    helper.player.on('play', function(){ 
        console.log("play");
        updatePlayingSong(undefined) 
    });
    
    helper.player.on('pause', () => { console.log('pause') });

    helper.player.on('seek', newPosition => { console.log('seek') });

    helper.player.on('end', () => { console.log('end') });

    helper.player.on('status-will-change', status => {});
});

// Receive currently playing track from spotify helper and look it up on genius, send results via ipc
function updatePlayingSong(track_obj) {

    // If spotify is not running/doesn't have internet connection =null
    if(helper.status===null){
        dialog.showErrorBox("Connection Error", "Can't connect to spotify");
        return;
    }

    // Receive track object from spotify web helper (either through parameters on method or straight from helper.status)
    var track;
    if(track_obj==undefined){
        track = helper.status.track;
    }else{
        track = track_obj;
    }
    currentTrack = track;

    console.log("Searching for: "+track.track_resource.name+ " / "+track.artist_resource.name);

    // Search for track name + artist name
    genius.search(track.track_resource.name + ' ' + track.artist_resource.name ).then(function(response) {

        //TODO Send response to html to display possible songs
        mainWindow.webContents.send('possible_songs:list', response.hits);

        //TODO test if working with internet connection
        updateShownLyrics(response.hits[0]);

    }).catch(function(error) {
        console.error(error);
        dialog.showErrorBox("Error in genius search", error);
    });
}

function updateShownLyrics(element){

    // Use the first results id to scrape the lyrics with lyricist
    lyricist.song(element.result.id,{fetchLyrics: true}).then(function(song) {
        mainWindow.webContents.send('lyrics:show', song)
    }).catch(function(error) {
        console.log(error);
        dialog.showErrorBox("Error in Lyricist scraping", error);
    });
}