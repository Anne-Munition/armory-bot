type Commands = import('discord.js').Collection<
  string,
  {
    cmd: Cmd;
    id?: import('discord.js').Snowflake;
  }
>;

type GlobalCmdInfo = {
  global: true;
};

type GuildCmdInfo = {
  global: false;
  guilds: import('discord.js').Snowflake[];
};

type CmdInfo = GlobalCmdInfo | GuildCmdInfo;

type ChatCmdRun = (interaction: import('discord.js').ChatInputCommandInteraction) => Promise<void>;

type CmdStructure = import('discord.js').ApplicationCommandData;
type CmdPerms = import('discord.js').ApplicationCommandPermissionData[];

interface Cmd {
  info: CmdInfo;
  structure: CmdStructure;
  run: ChatCmdRun;
}
