const { SlashCommandBuilder } = require("@discordjs/builders");
const { Interaction, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { v4: uuidv4 } = require("uuid"); // Generate UUIDs
const axios = require("axios");
const jwt = require("jsonwebtoken");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("block-user")
		.setDescription("Block a user from adding songs to playlists")
		.addUserOption((option) =>
			option.setName("user").setDescription("User to block").setRequired(true)
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

		const { data, error } = await interaction.client.db.blockUser(
			user.id,
			interaction.user.id
		);

		if (error) {
			console.error("Error blocking user:", error);
			interaction.reply({
				content: "Error blocking user",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		console.log("Blocked user:", user);
		const embed = new EmbedBuilder()
			.setTitle("User Blocked")
			.setDescription(`User <@${user.id}> has been blocked from adding songs.`)
			.setThumbnail(user.displayAvatarURL())
			.setColor("#bf41ae");

		await interaction.reply({ embeds: [embed] });
	},
};
