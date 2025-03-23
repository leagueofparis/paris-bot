const { SlashCommandBuilder } = require("@discordjs/builders");
const { Interaction, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { v4: uuidv4 } = require("uuid"); // Generate UUIDs
const axios = require("axios");
const jwt = require("jsonwebtoken");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("unblock-user")
		.setDescription("Unblock a user from adding songs to playlists")
		.addUserOption((option) =>
			option.setName("user").setDescription("User to unblock").setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user = interaction.options.getUser("user");

		if (!user) {
			interaction.reply("Please provide a user to block");
			return;
		}

		if (user.id === interaction.user.id) {
			interaction.reply("You cannot block yourself");
			return;
		}

		await interaction.client.db.unblockUser(user.id);

		const embed = new EmbedBuilder()
			.setTitle("User Unblocked")
			.setDescription(
				`User <@${user.id}> has been unblocked from adding songs.`
			)
			.setThumbnail(user.displayAvatarURL())
			.setColor("#bf41ae");

		await interaction.reply({ embeds: [embed] });
	},
};
