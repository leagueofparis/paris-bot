require("dotenv").config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessagePolls,
		GatewayIntentBits.GuildMembers,
	],
	partials: ["CHANNEL", "GUILD_MEMBER", "MESSAGE", "USER", "REACTION"],
});
const fs = require("fs");
const Database = require("./db.js");

const SpotifyWebApi = require("./spotifyApi.js");
const spotifyApi = new SpotifyWebApi();

const botToken = process.env.token;

class ParisBot {
	constructor() {
		this.commands = new Collection();
		this.events = [];

		this.launch();
	}

	async launch() {
		client.commands = new Collection();

		client.db = new Database(spotifyApi);
		client.spotifyApi = spotifyApi;

		this.loadCommands();
		this.loadHandlers();
	}

	loadHandlers() {
		fs.readdir("./handlers/", (err, files) => {
			if (err) return console.error(err);
			files.forEach((file) => {
				const event = require(`./handlers/${file}`);
				let eventName = file.split(".")[0];
				client.on(eventName, event.bind(null, client));
			});
		});
	}

	loadCommands() {
		fs.readdir("./commands/", (err, files) => {
			if (err) return console.error(err);
			files.forEach((file) => {
				if (!file.endsWith(".js")) return;
				const command = require(`./commands/${file}`);
				client.commands.set(command.data.name, command);
			});
		});
	}
}

client.on("ready", () => {
	new ParisBot();

	client.user.setPresence({
		activities: [{ name: "the_funny_sound.mp3", type: "PLAYING" }],
		status: "online",
	});
});

client.on("interactionCreate", async (interaction) => {
	try {
		if (interaction.isAutocomplete()) {
			const command = client.commands.get(interaction.commandName);
			if (command && command.autocomplete) {
				await command.autocomplete(interaction);
				return;
			}
		}

		if (!interaction.isCommand()) return;

		const command = client.commands.get(interaction.commandName);

		if (!command) return;

		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({
			content: "There was an error while executing this command!",
			ephemeral: true,
		});
	}
});

client.on("error", (e) => {});

client.login(botToken);
