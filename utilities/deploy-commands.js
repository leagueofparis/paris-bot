const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config();

const token = process.env.TOKEN;
const clientID = process.env.CLIENTID;
const guildID = process.env.GUILDID;

const syncCommands = async () => {
	const commands = [];
	// Grab all the command files from the commands directory you created earlier
	const foldersPath = path.join(__dirname, "../commands");
	console.log(foldersPath);
	const commandFiles = fs.readdirSync(foldersPath);

	for (const file of commandFiles) {
		const filePath = path.join(foldersPath, file);
		const command = require(filePath);
		if ("data" in command && "execute" in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}

	// Construct and prepare an instance of the REST module
	const rest = new REST().setToken(token);

	// and deploy your commands!
	try {
		console.log(
			`Started refreshing ${commands.length} application (/) commands.`
		);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientID, guildID),
			{ body: commands }
		);

		// const globalData = await rest.put(Routes.applicationCommands(clientID), {
		// 	body: commands,
		// });

		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`
		);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
};

module.exports = { syncCommands };
