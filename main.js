const electron = require('electron');
const url = require('url');
const path = require('path');
const SpotifyWebHelper = require('spotify-web-helper');
const api = require('genius-api');
const Lyricist = require('lyricist/node6');
const configFile = require(path.resolve('config.js'));

process.env.GENIUS_ACCESS_TOKEN = configFile.GENIUS_API_TOKEN;

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

    mainWindow.on('resize', function(e){
        console.log(mainWindow.getSize()[1]);
        mainWindow.webContents.send('window:resize', mainWindow.getSize()[1]);
    })

    // Quit App when closed
    mainWindow.on('closed', function(){
        app.quit();
    })

    // Remove Menu Bar
   // mainWindow.setMenu(null);
});

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
    console.log("3");


    // If = undefined, spotify is not running
    if(err.message == undefined){
        console.log("1");
        mainWindow.webContents.send('spotify:error', {message: 'Spotify is not running',title: 'Error'});
    }if (err.message.match(/No user logged in/)) {
        console.log("2");
        console.log("no user logged in");
    }else{
        console.log("3");

        if(helper.status == null){
            console.log("4");

            mainWindow.webContents.send('spotify:error', {message: 'You\'re not connected to the internet' ,title: 'Error'});
        }else{
            console.log("5");

            //TODO when does this happen?
            console.log('helper is not null');
            console.log(err);
        }
    }
    console.log("error lol");
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
  
    if(helper.status.playing == false){
        mainWindow.webContents.send('spotify:error', {message: 'No song is playing' ,title: ''});
    }

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
        mainWindow.webContents.send('spotify:running');
        mainWindow.webContents.send('lyrics:show', song)
    }).catch(function(error) {
        console.log(error);
        dialog.showErrorBox("Error in Lyricist scraping", error);
    });
}