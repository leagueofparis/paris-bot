require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

class Database {
	// Constructor for the Database class
	// Takes a Spotify API instance as an argument
	// Initializes the Supabase client with the URL and key from environment variables
	// The Supabase client is used to interact with the Supabase database

	constructor(spotifyApi) {
		this.supabase = createClient(
			process.env.SUPABASE_URL,
			process.env.SUPABASE_KEY
		);

		this.spotifyApi = spotifyApi;
	}

	async getDefaultPlaylist() {
		const { data, error } = await this.supabase
			.from("playlists")
			.select("*")
			.eq("default", true)
			.single();

		if (error) {
			console.error("Error fetching default playlist:", error);
			return null;
		}

		return data;
	}

	async getPlaylist(playlistID) {
		const { data, error } = await this.supabase
			.from("playlists")
			.select("*")
			.eq("playlist_id", playlistID)
			.single();

		if (error) {
			console.error("Error fetching playlist:", error);
			return null;
		}

		return { data, error };
	}

	async getPlaylistSongs(playlistID) {
		const { data, error } = await this.supabase
			.from("playlist_songs")
			.select("*")
			.eq("playlist_id", playlistID);

		if (error) {
			console.error("Error fetching playlist songs:", error);
			return null;
		}

		return data;
	}

	async addSongToPlaylist(playlistID, songID, addedBy) {
		try {
			// Check if the song is already in the playlist
			const { data: existingSongs, error: fetchError } = await this.supabase
				.from("playlist_songs")
				.select("*")
				.eq("playlist_id", playlistID)
				.eq("song_id", songID);

			if (fetchError) {
				console.error("Error fetching existing songs:", fetchError);
				return { data: null, error: fetchError };
			}

			if (existingSongs.length > 0) {
				return { data: null, error: "Song already exists on playlist" };
			}

			const { data, error } = await this.spotifyApi.addTracksToPlaylist(
				playlistID,
				[songID]
			);
			console.log(data, error);

			if (error) {
				console.error("Error adding song to playlist:", error);
				return { data: null, error };
			}
		} catch (e) {
			return { data: null, error: e.message };
		}
		const { data, error } = await this.supabase.from("playlist_songs").insert([
			{
				playlist_id: playlistID,
				song_id: songID,
				created_at: new Date().toISOString(),
				modified_at: new Date().toISOString(),
				added_by: addedBy,
			},
		]);

		if (error) {
			return { data: null, error };
		}

		return { data, error };
	}

	async removeSongFromPlaylist(playlistID, songID) {
		try {
			await this.spotifyApi.removeTracksFromPlaylist(playlistID, songID);
		} catch (e) {
			console.log("Error removing song from playlist:", e);
			return { data: null, error: e.message };
		}

		const { data, error } = await this.supabase
			.from("playlist_songs")
			.delete()
			.eq("playlist_id", playlistID)
			.eq("song_id", songID);

		if (error) {
			console.error("Error removing song from playlist:", error);
			return null;
		}

		return { data, error };
	}

	async getSongsAddedByUserForDay(userID) {
		const date24HoursAgo = new Date(
			Date.now() - 24 * 60 * 60 * 1000
		).toISOString();
		const { data, error } = await this.supabase
			.from("playlist_songs")
			.select("*")
			.eq("added_by", BigInt(userID))
			.gt("created_at", date24HoursAgo);

		if (error) {
			console.error("Error fetching songs added by user for day:", error);
			return null;
		}

		return { data, error };
	}

	async blockUser(userID, addedBy) {
		const { data, error } = await this.supabase
			.from("playlist_blocked_users")
			.insert([
				{
					user_id: userID,
					added_by: addedBy,
					created_at: new Date().toISOString(),
					modified_at: new Date().toISOString(),
				},
			]);

		if (error) {
			console.error("Error blocking user:", error);
			return null;
		}

		return { data, error };
	}

	async unblockUser(userID) {
		// Check if the user is already blocked
		const { data: existingBlockedUsers, error: fetchError } =
			await this.supabase
				.from("playlist_blocked_users")
				.select("*")
				.eq("user_id", BigInt(userID));

		if (fetchError) {
			console.error("Error fetching existing blocked users:", fetchError);
			return { data: null, error: fetchError };
		}

		if (existingBlockedUsers.length === 0) {
			console.log("User is not blocked");
			return { data: null, error: "User is not blocked" };
		}

		const { data, error } = await this.supabase
			.from("playlist_blocked_users")
			.delete()
			.eq("user_id", BigInt(userID));

		if (error) {
			console.error("Error unblocking user:", error);
			return null;
		}

		return { data, error };
	}

	async getBlockedUser(userID) {
		const { data, error } = await this.supabase
			.from("playlist_blocked_users")
			.select("*")
			.eq("user_id", BigInt(userID));

		if (error) {
			console.error("Error fetching blocked user:", error);
			return null;
		}

		return { data, error };
	}
}

module.exports = Database;
