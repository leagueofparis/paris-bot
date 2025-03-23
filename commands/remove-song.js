const { SlashCommandBuilder } = require("@discordjs/builders");
const { Interaction, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { v4: uuidv4 } = require("uuid"); // Generate UUIDs
const axios = require("axios");
const jwt = require("jsonwebtoken");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("remove-song")
		.setDescription("Remove a song from a spotify playlist")
		.addStringOption((option) =>
			option.setName("url").setDescription("Spotify URL").setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("playlist")
				.setDescription("Spotify Playlist ID")
				.setAutocomplete(true)
				.setRequired(false)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		let url = interaction.options.getString("url");

		if (!url) {
			interaction.reply("Please provide a Spotify URL");
			return;
		}

		if (!url.includes("spotify.com/track/")) {
			interaction.reply("Please provide a valid Spotify track URL");
			return;
		}

		let playlistID = interaction.options.getString("playlist");
		let playlistName = "";
		if (!playlistID)
			await interaction.client.db.getDefaultPlaylist().then((data) => {
				if (data) {
					playlistID = data.playlist_id;
					playlistName = data.playlist_name;
				}
			});

		const trackID = url.substring(
			url.indexOf("track/") + 6,
			url.indexOf("?") === -1 ? url.length : url.indexOf("?")
		);

		if (!trackID) {
			interaction.reply("Please provide a valid Spotify track URL");
			return;
		}

		console.log("trackID", trackID);
		const { data, error } = await interaction.client.db.removeSongFromPlaylist(
			playlistID,
			trackID
		);

		if (error) {
			console.log(error);
			interaction.reply({
				content: "Error adding song to playlist",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const song = await interaction.client.spotifyApi.getTrack(trackID);
		let embed = new EmbedBuilder()
			.setTitle(`${song.name} by ${song.artists[0].name}`)
			.setAuthor({
				name: "Song Removed",
				iconURL: "https://leagueofparis.com/images/spotify_icon.png",
			})
			.setURL(song.external_urls.spotify)
			.setDescription(
				`Removed from [${playlistName}](https://open.spotify.com/playlist/${playlistID})!`
			)
			.setColor("#bf41ae")
			.setThumbnail(song.album.images[0].url);
		interaction.reply({ embeds: [embed] });
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "playlist") {
			const { data, error } = await interaction.client.db.supabase
				.from("playlists")
				.select("playlist_id, playlist_name");

			if (error) {
				console.log(error);
				await interaction.respond([]);
				return;
			}

			const choices = data
				.map((row) => ({
					name: row.playlist_name || row.playlist_id,
					value: row.playlist_id,
				}))
				.slice(0, 25);

			await interaction.respond(choices);
		}
	},
};
