module.exports = (client, message) => {
	const fs = require("fs");
	//Ignore all bots
	if (message.author.bot) return;

	return;
	if (message.channel.id === "909293829084053574") {
		if (message.author.bot) return;

		const {
			MessageEmbed,
			MessageButton,
			MessageActionRow,
		} = require("discord.js");
		require("@tensorflow/tfjs-node");
		const toxicity = require("@tensorflow-models/toxicity");
		const threshold = 0.9;

		let embed = new MessageEmbed()
			.setTitle("Toxicity Results")
			.setDescription("Checking message: " + message.content);

		let flag = false;

		toxicity.load(threshold).then((model) => {
			const sentences = [message.content];
			model.classify(sentences).then((predictions) => {
				for (let prediction of predictions) {
					if (prediction.results[0].match == null) continue;
					else if (prediction.results[0].match) flag = true;
					console.log(prediction.results[0]);
					let likely =
						prediction.results[0].probabilities[0].toFixed(5) * 100 + "%";
					let unlikely =
						prediction.results[0].probabilities[1].toFixed(5) * 100 + "%";
					embed.addField(
						prediction.label,
						prediction.results[0].match +
							" | probability: " +
							likely +
							", " +
							unlikely
					);
				}

				if (flag) embed.setFooter("This message was considered toxic.");

				message.channel.send({ embeds: [embed] });
			});
		});
	}
};
