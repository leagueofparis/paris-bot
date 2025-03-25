const { SlashCommandBuilder } = require("@discordjs/builders");
const { Interaction, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { v4: uuidv4 } = require("uuid"); // Generate UUIDs
const axios = require("axios");
const jwt = require("jsonwebtoken");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("add-song")
		.setDescription("Add a song to a spotify playlist")
		.addStringOption((option) =>
			option.setName("url").setDescription("Spotify URL").setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("playlist")
				.setDescription("Spotify Playlist ID")
				.setAutocomplete(true)
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const { data: songs } =
			await interaction.client.db.getSongsAddedByUserForDay(
				interaction.user.id
			);

		if (songs && songs.length >= 5) {
			interaction.reply({
				content: "You can only add 5 songs per day",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const { data: blocked } = await interaction.client.db.getBlockedUser(
			interaction.user.id
		);

		if (blocked && blocked.length > 0) {
			interaction.reply({
				content: "You are blocked from adding songs",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let url = interaction.options.getString("url");

		if (!url) {
			interaction.reply({
				content: "Please provide a valid Spotify URL",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!url.includes("spotify.com/track/")) {
			interaction.reply({
				content: "Please provide a valid Spotify track URL",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let playlistID = interaction.options.getString("playlist");
		let playlistName = "";

		await interaction.client.db.getPlaylist(playlistID).then((res) => {
			if (res) {
				console;
				playlistName = res.data.playlist_name;
			} else {
				interaction.reply({
					content: "Please provide a valid Spotify playlist ID",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		});

		const trackID = url.substring(
			url.indexOf("track/") + 6,
			url.indexOf("?") === -1 ? url.length : url.indexOf("?")
		);

		if (!trackID) {
			interaction.reply({
				content: "Please provide a valid Spotify track ID",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const { data, error } = await interaction.client.db.addSongToPlaylist(
			playlistID,
			trackID,
			interaction.user.id
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

		try {
			let embed = new EmbedBuilder()
				.setTitle(`${song.name} by ${song.artists[0].name}`)
				.setAuthor({
					name: "Song Added",
					iconURL: "https://leagueofparis.com/images/spotify_icon.png",
				})
				.setURL(song.external_urls.spotify)
				.setDescription(
					`Added to [${playlistName}](https://open.spotify.com/playlist/${playlistID})!`
				)
				.setColor("#bf41ae")
				.setThumbnail(song.album.images[0].url);
			interaction.reply({ embeds: [embed] });
		} catch {
			interaction.reply({
				content: "Song added!",
			});
			return;
		}
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "playlist") {
			// const isAdmin = interaction.member.permissions.has("ADMINISTRATOR");

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
