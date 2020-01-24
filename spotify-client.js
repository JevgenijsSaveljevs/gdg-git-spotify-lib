const qs = require('querystring');
const fetch = require("node-fetch");
const { URLSearchParams } = require('url');
const NodeCache = require('node-cache');
const spotifyCache = new NodeCache();
const SPOTIFY_TOKEN = "SPOTIFY_TOKEN";

const clientId = "5a57d054d97c486bac5b62497ffb2302";
const clientSecret = "f39f470fe4db4500a2dbc2234068fcf5";

const fetchToken = async () => {
    const url = 'https://accounts.spotify.com/api/token';
    const auth = 'Basic ' + Buffer
        .from(clientId + ':' + clientSecret)
        .toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const response = await fetch(url, {
        method: "POST",
        headers: {
            'Authorization': auth
        },
        body: params
    })

    const body = await response.json();
    storeToken(body["access_token"], body["expires_in"]);

    return body;
};

const search = async (text) => {
    // docs: https://developer.spotify.com/documentation/web-api/reference/search/search/
    const url = "https://api.spotify.com/v1/search";
    const encodedText = text //encodeURIComponent(text);

    let response = await searchRequest(encodedText, url);

    // handling outdated token
    if (response.status === 401) {
        fetchToken();
        response = await searchRequest(encodedText, url);
    }

    return response;
}

const audioFeatures = async (id) => {
    // docs: https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/
    const url = "https://api.spotify.com/v1/audio-features/";

    var response = await getAudioFeatures(url, id);

    if (response.status === 401) {
        fetchToken();
        response = await getAudioFeatures(url, id);
    }

    return response;
}

const storeToken = (token, ttl) => {
    spotifyCache.set(SPOTIFY_TOKEN, token, ttl);
}

const getToken = async () => {
    let token = spotifyCache.get(SPOTIFY_TOKEN);

    if (!token) {
        const tokenResponse = await fetchToken();
        token = tokenResponse["access_token"];
    }

    return token;
}

async function getAudioFeatures(url, id) {
    const token = await getToken();
    let response = await fetch(url + id, {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });
    return response;
}

async function searchRequest(encodedText, url) {
    const token = await getToken();
    const params = new URLSearchParams();
    params.append('q', encodedText);
    params.append('type', 'album,track,artist');
    const stringified = params.toString();
    let response = await fetch(url + '?' + stringified, {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });
    return response;
}

module.exports = {
    fetchToken: fetchToken,
    search: search,
    audioFeatures: audioFeatures,
}

