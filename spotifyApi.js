const fs = require("fs");
const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");
const spotifyWebApi = require("./spotifyAuth");
const { data } = require("./commands/add-song");
const TOKEN_FILE = "spotify_tokens.json";

class SpotifyApi {
	constructor() {
		const app = express();
		const PORT = 27065;

		// Helper function to save tokens to a file
		function saveTokens(accessToken, refreshToken) {
			fs.writeFileSync(
				TOKEN_FILE,
				JSON.stringify({ accessToken, refreshToken }),
				"utf8"
			);
		}

		// Load tokens from file (if they exist)
		function loadTokens() {
			try {
				if (fs.existsSync(TOKEN_FILE)) {
					const data = fs.readFileSync(TOKEN_FILE, "utf8");
					if (data.trim().length === 0) throw new Error("Token file is empty"); // Check for empty file
					const tokens = JSON.parse(data);
					if (!tokens.accessToken || !tokens.refreshToken)
						throw new Error("Token data missing");
					return tokens;
				}
			} catch (err) {
				console.error("Error loading tokens:", err);
				return null; // Return null if tokens can't be loaded
			}
			return null;
		}

		// Step 1: Redirect user to Spotify for authentication
		app.get("/login", (req, res) => {
			const scopes = ["playlist-modify-public", "playlist-modify-private"];
			const authUrl = spotifyWebApi.createAuthorizeURL(scopes);
			res.redirect(authUrl);
		});

		// Step 2: Handle OAuth callback
		app.get("/callback", async (req, res) => {
			const code = req.query.code || null;

			if (!code) {
				return res.status(400).send("Authorization code not received.");
			}

			try {
				const data = await spotifyWebApi.authorizationCodeGrant(code);
				spotifyWebApi.setAccessToken(data.body.access_token);
				spotifyWebApi.setRefreshToken(data.body.refresh_token);

				// Save tokens for future use
				saveTokens(data.body.access_token, data.body.refresh_token);

				console.log("Spotify authentication successful!");
				res.send("Authorization successful! You can close this page.");
			} catch (error) {
				console.error("Error getting tokens:", error);
				res.status(500).send("Authentication failed.");
			}
		});

		// Start Express server
		app.listen(PORT, () => {
			console.log(`Auth server running on 173.240.148.166:${PORT}/login`);
			loadTokens(); // Load tokens when the server starts
		});
	}

	async getTrack(songID) {
		try {
			const { body } = await spotifyWebApi.getTrack(songID);
			return body;
		} catch (error) {
			console.error("Error fetching song:", error);
			return null;
		}
	}

	async getPlaylist(playlistID) {
		try {
			const { body } = await spotifyWebApi.getPlaylist(playlistID);
			return body;
		} catch (error) {
			console.error("Error fetching playlist:", error);
			return null;
		}
	}

	async getPlaylists() {
		try {
			const { body } = await spotifyWebApi.getUserPlaylists();
			return body;
		} catch (error) {
			console.error("Error fetching playlists:", error);
			return null;
		}
	}

	/**
	 *
	 * @param {string} playlistID
	 * @param {string[]} songID
	 */
	async addTracksToPlaylist(playlistID, songID) {
		try {
			console.log("Adding song to playlist:", playlistID, songID);

			songID = this.validateSongFormat(songID);
			await spotifyWebApi.addTracksToPlaylist(playlistID, songID);

			console.log("Song added to playlist successfully");
		} catch (error) {
			return { data: null, error: error };
		}

		return { data: true, error: null };
	}

	async removeTracksFromPlaylist(playlistID, songID) {
		try {
			console.log("Removing song from playlist:", playlistID, songID);
			await spotifyWebApi.removeTracksFromPlaylist(
				playlistID,
				this.validateSongFormat(songID, true)
			);
			console.log("Song removed from playlist successfully");
		} catch (error) {
			console.error("Error removing song from playlist:", error);
		}
		return { data: true, error: null };
	}

	validateSongFormat(songID, removeSong = false) {
		let formattedSongID = "";
		if (Array.isArray(songID)) {
			formattedSongID = songID.map((song) => this.validateSongFormat(song));
		}

		if (songID.includes("spotify:track:")) {
			formattedSongID = songID;
		} else if (songID.includes("spotify.com/track/")) {
			formattedSongID =
				"spotify:track:" +
				songID.substring(
					songID.indexOf("track/") + 6,
					songID.indexOf("?") === -1 ? songID.length : songID.indexOf("?")
				);
		} else {
			formattedSongID = "spotify:track:" + songID;
		}

		if (removeSong) {
			formattedSongID = { uri: formattedSongID };
		}

		if (!Array.isArray(formattedSongID)) {
			formattedSongID = [formattedSongID];
		}

		return formattedSongID;
	}
}
module.exports = SpotifyApi;
