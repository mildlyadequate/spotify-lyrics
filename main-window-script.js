// Electron
const electron = require('electron');
const {ipcRenderer,shell} = electron;

// MainWindow Lyrics Container
// Outer div which contains lyrics and title
const lyricsContentContainer = document.getElementById('lyricContentDiv');
// Inner div which contains just the lyrics
const lyricsContainer = document.getElementById('lyricsDiv');
const songTitleContainer = document.getElementById('songTitle');
const settingsContainer = document.getElementById('settingsDiv');
const aboutContainer = document.getElementById('aboutDiv');

// Loading and Error Container
const loadingErrorDiv = document.getElementById('loadingErrorDiv');
const loadingIcon = document.getElementById('loadingIcon');
const errorTitle = document.getElementById('errorTitle');
const errorText = document.getElementById('errorText');

// Sidenav
const sideNav = document.getElementById('slide-out');
const sidenavSong = document.getElementById('sidenav-song');
const sidenavArtist = document.getElementById('sidenav-artist');

// Navbar Buttons
const navRemoveBtn = document.getElementById('remove-btn');
const navRefreshBtn = document.getElementById('refresh-btn');
const navReplaceBtn = document.getElementById('replace-btn');

// Scrollbar dependencies
const mainScrollContent = document.getElementById('main-scroll-content');
const mainNav = document.getElementById('mainNav');

// Init scrollbar
var newHeight = 640 - 22;
mainScrollContent.style.height = ""+newHeight+"px";

// Modals
const chooseSongModal = document.getElementById('choose-song-modal');

// Choose Song Array
var songLyricsArray;

// Initialize Materialize Elements
document.addEventListener('DOMContentLoaded', function() {

    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, {});

    // Sidenav
    var elemsNav = document.querySelectorAll('.sidenav');
    var instancesNav = M.Sidenav.init(elemsNav, {});
});

// ================ EVENTS ================

// Set Lyrics into elements
ipcRenderer.on('lyrics:show',function(e,item){

    // Hide loading animation 
    loadingIcon.style.visibility = "hidden";

    // Hide Loading / Error Div
    loadingErrorDiv.style.display = "none";

    // Set content
    songTitleContainer.innerText = item.full_title;
    lyricsContainer.innerHTML = item.lyrics;

    // Get toast DOM Element, get instance, then call dismiss function
    var toastElement = document.querySelector('.toast');
    if(toastElement!=null){
        var toastInstance = M.Toast.getInstance(toastElement);
        toastInstance.dismiss();
    }
});

// Add every search result from genius.com to the list
ipcRenderer.on('possible_songs:list',function(e,song_array){
    songLyricsArray = song_array;

    // Clear List
    var tmpSongList = document.getElementById("choose-correct-song-list");
    while (tmpSongList.firstChild) {
        tmpSongList.removeChild(tmpSongList.firstChild);
    }

    var index;
    for (index = 0; index < song_array.length; ++index) {
        addChooseSongListElement(song_array[index].result,index);
    }
});

// Show error below loading animation
ipcRenderer.on('spotify:error',function(e,errorItem){
    loadingErrorDiv.style.display = "block";
    loadingIcon.style.visibility = "hidden";
    errorTitle.innerText = errorItem.title;
    errorText.innerText = errorItem.message;
});

// Reset error elements
ipcRenderer.on('spotify:running',function(e){
    errorTitle.innerText = '';
    errorText.innerText = '';
});

// Window resize
ipcRenderer.on('window:resize',function(e,height){
    var newHeight = height - 19;
    mainScrollContent.style.height = ""+newHeight+"px";
});

// Show song lyrics loading Toast
ipcRenderer.on('song:lyrics-loading',function(e,song){

    // Get toast DOM Element, get instance, then call dismiss function
    var toastElement = document.querySelector('.toast');
    if(toastElement!=null){
        var toastInstance = M.Toast.getInstance(toastElement);
        toastInstance.dismiss();
    }

    // Show new Toast
    var toastHTML = '<span style="margin-right:14px;">Loading <a class="spotify-green-text">'+song.track_resource.name+' by '+song.artist_resource.name+'</a></span><div class="preloader-wrapper small active"><div class="spinner-layer spinner-green-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>';
    M.toast({html: toastHTML, displayLength: 30000});
});

// Status update
ipcRenderer.on('status:change',function(e,status){
    errorText.innerText = status;
});

ipcRenderer.on('sidenav-info:song-information',function(e,track){
    sidenavSong.textContent = track.track_resource.name;
    sidenavArtist.textContent = track.artist_resource.name;
});

// ================ FUNCTIONS ================

// Called when the clear button is clicked, clears the entire content
function clearLyrics(){

    // Remove content
    songTitleContainer.innerText = '';
    lyricsContainer.innerHTML = '';

    loadingErrorDiv.style.display = "block";
    errorTitle.innerText = '';
    errorText.innerText = 'Waiting for user or next song';

    ipcRenderer.send('lyrics:cleared');
}

// Creates a list element and appends it to the song list from the given spotify track
function addChooseSongListElement(element,index){
    if(element == undefined) return;
    
    var node = document.createElement("A");

    // Image
    var avatar = document.createElement("IMG");
    avatar.classList.add("circle");
    avatar.src = ""+element.header_image_url;
    avatar.style.verticalAlign = "middle";
    avatar.style.marginRight = "8px";

    // Song name
    var title = document.createElement("SPAN");
    title.innerText = element.title;
    title.classList.add("title");
    title.classList.add("white-text");

    // Artist name
    var artist = document.createElement("P");
    artist.innerText = element.primary_artist.name;
    artist.classList.add("white-text");
    
    // Click Event
    node.href = "#!";
    node.onclick = function (){ handleSongChange(index) };

    node.classList.add("collection-item");
    node.classList.add("avatar");
    node.appendChild(avatar);
    node.appendChild(title);
    node.appendChild(artist);
    document.getElementById("choose-correct-song-list").appendChild(node);
}

// Called when an element from the alternative song lyrics list is clicked
function handleSongChange(index){
    // Show loading animation
    loadingErrorDiv.style.display = "block";
    loadingIcon.style.visibility = "visible";

    // Remove content
    songTitleContainer.innerText = '';
    lyricsContainer.innerHTML = '';

    // Close modal window
    var instance = M.Modal.getInstance(chooseSongModal);
    instance.close();

    ipcRenderer.send('song:changed_by_user',songLyricsArray[index]);
}

// Called when the refresh button is clicked
function refreshSong(){

    // Show loading animation
    loadingErrorDiv.style.display = "block";
    loadingIcon.style.visibility = "visible";

    // Remove content
    songTitleContainer.innerText = '';
    lyricsContainer.innerHTML = '';

    // Remove Error Msgs
    errorTitle.innerText = '';
    errorText.innerText = '';

    // Send event to load a new song from spotify helper
    ipcRenderer.send('song:refresh');
}

// Called when the "wrong song" button is clicked, show popup to choose the right one
function chooseSongWindow(){
    ipcRenderer.send('choosesong:open');
}

// Show the settings div, called when sidenav button settings is clicked
function showSettings(){

    // Hide lyric content
    loadingErrorDiv.style.display = "none";
    lyricsContentContainer.style.display = "none";

    // Hide lyric Navbar buttons
    navRemoveBtn.style.display = "none";
    navReplaceBtn.style.display = "none";
    navRefreshBtn.style.display = "none";

    // Hide about
    aboutContainer.style.display = "none";

    // Show settings div
    settingsContainer.style.display = "block";

    // Close side nav
    var instance = M.Sidenav.getInstance(sideNav); 
    instance.close();
}

// Show the lyrics div, called when sidenav button lyrics is clicked
function showLyrics(){

    // Show lyric content
    loadingErrorDiv.style.display = "block";
    lyricsContentContainer.style.display = "block";

    // Show Navbar lyric buttons
    navRemoveBtn.style.display = "block";
    navReplaceBtn.style.display = "block";
    navRefreshBtn.style.display = "block";

    // Hide settings div
    settingsContainer.style.display = "none";

    // Hide about div
    aboutContainer.style.display = "none";

    // Close side nav
    var instance = M.Sidenav.getInstance(sideNav); 
    instance.close();
}

// Show the lyrics div, called when sidenav button lyrics is clicked
function showAbout(){

    // Hide lyric content
    loadingErrorDiv.style.display = "none";
    lyricsContentContainer.style.display = "none";

    // Hide lyric Navbar buttons
    navRemoveBtn.style.display = "none";
    navReplaceBtn.style.display = "none";
    navRefreshBtn.style.display = "none";

    // Hide settings div
    settingsContainer.style.display = "none";

    // Show about div
    aboutContainer.style.display = "block";

    // Close side nav
    var instance = M.Sidenav.getInstance(sideNav); 
    instance.close();
}

function openLinkInBrowser(link){
    shell.openExternal(link);
}