import { Client } from 'discord.js';
import { commands } from '../collections.js';

export default async function (client: Client): Promise<void> {
  const globalCmds = commands.filter((x) => x.cmd.info.global);
  const guildCmds = commands.filter((x) => !x.cmd.info.global);

  if (process.env.NODE_ENV === 'production') {
    const globalCmdsAdded = await client.application?.commands.set(
      globalCmds.map((x) => x.cmd.structure),
    );
    globalCmdsAdded?.forEach((globalCmd) => {
      const command = commands.get(globalCmd.name);
      if (command) commands.set(globalCmd.name, { cmd: command.cmd, id: globalCmd.id });
    });
  }

  for (const [, guild] of client.guilds.cache) {
    let guildCommandsToAdd = guildCmds.filter((x) => {
      const info = x.cmd.info as GuildCmdInfo;
      if (!info.guilds) return false;
      return info.guilds.includes(guild.id);
    });
    // Add global configs to guild configs in development
    if (process.env.NODE_ENV !== 'production') {
      guildCommandsToAdd = guildCommandsToAdd.concat(globalCmds);
    }

    if (guildCommandsToAdd.size !== 0) {
      const guildCommandsAdded = await guild.commands.set(
        guildCommandsToAdd.map((x) => x.cmd.structure),
      );

      guildCommandsAdded?.forEach((guildCmd) => {
        const command = commands.get(guildCmd.name);
        if (command) commands.set(guildCmd.name, { cmd: command.cmd, id: guildCmd.id });
      });
    }
  }
}
